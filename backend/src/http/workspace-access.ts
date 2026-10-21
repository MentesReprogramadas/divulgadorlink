import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify'
import {z} from 'zod'
import {prisma} from '@/lib/prisma'
import {readAccessUser} from '@/http/middlewares/verify-jwt'
import {resolveTenant,normalizeTenantHost} from '@/http/tenant'
import {workspaceRoute,workspaceGrants,canWorkspace,publicWorkspaceAction} from '@/domain/access/workspace-permissions'
import * as team from '@/repositories/workspace-team'
import {ProfileError} from '@/domain/profiles/profile'
import type {PrismaClient} from '@prisma/client'
let testDb:PrismaClient|null=null
export function setWorkspaceDbForTest(db:PrismaClient|null){if(process.env.NODE_ENV==='test')testDb=db}
export function workspaceDatabase(){return testDb??prisma}
declare module 'fastify'{interface FastifyRequest{workspaceUser?:FastifyRequest['user'];workspaceActor?:{id:string;ownerId:string;tenantId:string;canWrite:boolean}}}
const deny=(r:FastifyReply,message='Você não tem acesso a esta seção.')=>r.code(403).send({code:'forbidden',message})
const management=/^\/team\/(?:context|select|workspaces|accept)$/
export async function workspaceGuard(q:FastifyRequest,r:FastifyReply){
 const explicit=q.headers['x-workspace-owner']
 if(explicit!==undefined&&(typeof explicit!=='string'||explicit.length>128||!explicit.length))return deny(r)
 const target=explicit==='self'?null:explicit??q.cookies.workspaceOwner
 if(!target)return
 const path=q.url.split('?')[0].replace(/^\/api\/v1/,'')
 if(!q.url.startsWith('/api/v1/')||path.startsWith('/auth/')||management.test(path))return
 if(publicWorkspaceAction(q.method,path))return
 const section=workspaceRoute(path,q.method)
 // Public browsing is independent of team identity; never rewrite its actor.
 if(!section){if(path==='/age'&&q.method==='POST')return;if(/^\/(?:profile-hosts\/|profiles(?:\/|$)|collections\/|r\/|catalog(?:\/|$)|search(?:\/|$)|discovery(?:\/|$)|profile-plans$|profile-templates$|networks(?:\/|$)|niches(?:\/|$)|home$|sitemap$|actuator\/)/.test(path)&&q.method==='GET')return;return deny(r,'Esta ação é exclusiva da sua conta. Volte ao seu espaço.')}
 if(q.supportSession||q.headers['x-profile-id'])return deny(r,'Saia do outro contexto antes de abrir o espaço compartilhado.')
 r.header('cache-control','private, no-store')
 const actual=await readAccessUser(q)
 if(!actual||actual.typ!=='access')return r.code(401).send({message:'Entre para continuar.'})
 const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''))
 if(actual.tenantId!==tenant.id)return deny(r)
 const db=workspaceDatabase()
 const [member,owner,actor]=await Promise.all([team.workspaceMembership(db,tenant.id,target,actual.sub),db.user.findFirst({where:{id:target,tenantId:tenant.id,status:'ACTIVE'},include:{identifiers:{where:{replacedAt:null}}}}),db.user.findFirst({where:{id:actual.sub,tenantId:tenant.id,status:'ACTIVE'},include:{identifiers:{where:{replacedAt:null}}}})])
 const write=!['GET','HEAD','OPTIONS'].includes(q.method)
 if(!member||!owner||!actor||!canWorkspace(workspaceGrants.parse(member.grants),section,write))return deny(r)
 if(write&&!actor.identifiers.some(id=>id.kind==='EMAIL'&&id.confirmedAt))return deny(r,'Confirme seu e-mail para alterar este espaço.')
 if(section.startsWith('admin')&&owner.role!=='ADMIN')return deny(r)
 q.workspaceActor={id:actor.id,ownerId:owner.id,tenantId:tenant.id,canWrite:canWorkspace(member.grants,section,true)}
 q.workspaceUser={...actual,sub:owner.id,role:section.startsWith('admin')?'ADMIN':'USER'};q.user=q.workspaceUser
}
async function run(q:FastifyRequest,r:FastifyReply,work:(a:{tenantId:string;sub:string})=>Promise<unknown>){
 r.header('cache-control','private, no-store')
 try{const user=await readAccessUser(q);if(!user||user.typ!=='access')return r.code(401).send({message:'Entre para continuar.'});const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''));if(user.tenantId!==tenant.id)return deny(r);return await work({tenantId:tenant.id,sub:user.sub})}
 catch(error){if(error instanceof ProfileError)return r.code(error.status).send({message:error.message});throw error}
}
export async function workspaceRoutes(app:FastifyInstance){
 app.get('/team/workspaces',(q,r)=>run(q,r,async a=>({workspaces:await team.teamWorkspaces(workspaceDatabase(),a)})))
 app.get('/team/context',(q,r)=>run(q,r,async a=>{const selected=q.cookies.workspaceOwner;if(!selected)return {ownerId:null,grants:null};const member=await team.workspaceMembership(workspaceDatabase(),a.tenantId,selected,a.sub);if(!member)return deny(r,'Seu acesso foi removido. Volte ao seu espaço.');const owner=await workspaceDatabase().user.findFirst({where:{id:selected,tenantId:a.tenantId,status:'ACTIVE'},select:{name:true,role:true}});if(!owner)return deny(r);return {ownerId:selected,name:owner.name,grants:owner.role==='ADMIN'?workspaceGrants.parse(member.grants):Object.fromEntries(Object.entries(workspaceGrants.parse(member.grants)).filter(([key])=>!key.startsWith('admin')))}}))
 app.post('/team/select',(q,r)=>run(q,r,async a=>{const {ownerId}=z.object({ownerId:z.string().min(1).max(128).nullable()}).strict().parse(q.body);if(ownerId){const workspaces=await team.teamWorkspaces(workspaceDatabase(),a);if(!workspaces.some(row=>row.ownerId===ownerId))return deny(r)}r.setCookie('workspaceOwner',ownerId??'',{httpOnly:true,path:'/',sameSite:'strict',secure:process.env.NODE_ENV==='production',...(ownerId?{maxAge:86400}:{maxAge:0})});return {selected:ownerId}}))
 app.get('/team',(q,r)=>run(q,r,a=>team.readWorkspaceTeam(workspaceDatabase(),a)))
 app.post('/team/invitations',(q,r)=>run(q,r,a=>team.inviteWorkspace(workspaceDatabase(),a,z.object({email:z.string().trim().email().max(254),grants:workspaceGrants,requestKey:z.string().uuid()}).strict().parse(q.body))))
 app.post('/team/accept',(q,r)=>run(q,r,a=>team.acceptWorkspace(workspaceDatabase(),a,z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict().parse(q.body).token)))
 app.patch('/team/members/:id',(q,r)=>run(q,r,a=>{const {id}=z.object({id:z.string().uuid()}).strict().parse(q.params),input=z.object({grants:workspaceGrants,expectedVersion:z.number().int().positive()}).strict().parse(q.body);return team.changeWorkspaceMember(workspaceDatabase(),a,id,input.expectedVersion,input.grants)}))
 app.delete('/team/members/:id',(q,r)=>run(q,r,a=>team.changeWorkspaceMember(workspaceDatabase(),a,z.object({id:z.string().uuid()}).strict().parse(q.params).id,z.object({expectedVersion:z.number().int().positive()}).strict().parse(q.body).expectedVersion,null)))
 app.delete('/team/invitations/:id',(q,r)=>run(q,r,a=>team.revokeWorkspaceInvite(workspaceDatabase(),a,z.object({id:z.string().uuid()}).strict().parse(q.params).id)))
}
