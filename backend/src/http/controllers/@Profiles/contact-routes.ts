import {z,ZodError} from 'zod'
import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {prisma} from '@/lib/prisma'
import {env} from '@/env'
import {readAccessUser} from '@/http/middlewares/verify-jwt'
import {resolveTenant,normalizeTenantHost} from '@/http/tenant'
import {buildError} from '@/http/errors'
import {ResourceNotFoundError} from '@/use-cases/errors/resource-not-found-error'
import {ProfileError} from '@/domain/profiles/profile'
import {contactDefinition} from '@/domain/leads/contact-form'
import type {ProfileActor} from '@/domain/access/profile-access'
import * as forms from '@/repositories/contact-forms'
import * as handling from '@/repositories/contact-handling'
import {contactStatus,contactStatusInput,contactNoteInput,contactVersion} from '@/domain/leads/contact-handling'
let testDb:PrismaClient|null=null
export function setContactDbForTest(db:PrismaClient|null){if(process.env.NODE_ENV==='test')testDb=db}
async function run(q:FastifyRequest,r:FastifyReply,privateRoute:boolean,work:(db:PrismaClient,a:ProfileActor)=>Promise<unknown>){
 r.header('cache-control','private, no-store').header('x-content-type-options','nosniff')
 try{const t=await resolveTenant(normalizeTenantHost(q.headers.host??'')),user=await readAccessUser(q);if(privateRoute&&(!user||user.typ!=='access'))throw new ProfileError(401,'Entre para continuar.');if(privateRoute&&user?.tenantId!==t.id)throw new ProfileError(403,'Acesso negado.');if(q.headers['x-profile-id'])throw new ProfileError(403,'Compartilhamentos anteriores não concedem acesso a contatos.');return await work(testDb??prisma,{tenantId:t.id,ownerId:user?.sub??'',age:q.cookies.age==='yes',auditActorId:q.workspaceActor?.id})}
 catch(e){if(e instanceof ZodError)return r.code(400).send(buildError({code:'validation',message:'Confira os campos do formulário.',request_id:q.id}));if(e instanceof ProfileError||e instanceof ResourceNotFoundError){const status=e instanceof ProfileError?e.status:404;return r.code(status).send(buildError({code:status===409?'conflict':status===429?'rate_limited':status===404?'not_found':'forbidden',message:e instanceof ProfileError?e.message:'Página indisponível.',request_id:q.id}))}throw new Error('Não foi possível processar o contato.')}
}
const paging=z.object({cursor:z.string().uuid().optional(),status:contactStatus.optional(),q:z.string().trim().max(100).optional()}).strict()
const contactParams=z.object({id:z.string().uuid()}).strict()
const noteParams=z.object({id:z.string().uuid(),noteId:z.string().uuid()}).strict()
export async function contactRoutes(app:FastifyInstance){
 app.get('/me/forms',(q,r)=>run(q,r,true,(db,a)=>forms.readContactForm(db,a)))
 app.put('/me/forms',(q,r)=>run(q,r,true,(db,a)=>{const v=z.object({definition:contactDefinition,expectedVersion:z.number().int().nonnegative()}).strict().parse(q.body);return forms.saveContactForm(db,a,v.definition,v.expectedVersion)}))
 app.get('/me/forms/submissions',(q,r)=>run(q,r,true,(db,a)=>{const input=paging.parse(q.query);return forms.listContacts(db,a,input.cursor,new Date(),input.status,input.q)}))
 app.get('/me/forms/submissions/:id',(q,r)=>run(q,r,true,(db,a)=>handling.readContact(db,a,contactParams.parse(q.params).id)))
 app.get('/me/forms/submissions/:id/history',(q,r)=>run(q,r,true,(db,a)=>handling.readContactHistory(db,a,contactParams.parse(q.params).id,z.object({beforeVersion:z.coerce.number().int().positive().optional()}).strict().parse(q.query).beforeVersion)))
 app.patch('/me/forms/submissions/:id/status',(q,r)=>run(q,r,true,(db,a)=>handling.changeContactStatus(db,a,contactParams.parse(q.params).id,contactStatusInput.parse(q.body))))
 app.post('/me/forms/submissions/:id/notes',(q,r)=>run(q,r,true,(db,a)=>handling.writeContactNote(db,a,contactParams.parse(q.params).id,contactNoteInput.parse(q.body))))
 app.patch('/me/forms/submissions/:id/notes/:noteId',(q,r)=>run(q,r,true,(db,a)=>{const p=noteParams.parse(q.params),input=contactNoteInput.omit({id:true}).strict().parse(q.body);return handling.writeContactNote(db,a,p.id,{...input,id:p.noteId},true)}))
 app.delete('/me/forms/submissions/:id/notes/:noteId',(q,r)=>run(q,r,true,(db,a)=>{const p=noteParams.parse(q.params);return handling.deleteContactNote(db,a,p.id,p.noteId,z.object({expectedVersion:contactVersion}).strict().parse(q.body).expectedVersion)}))
 app.get('/me/forms/submissions/export',(q,r)=>run(q,r,true,(db,a)=>{const input=paging.parse(q.query);return forms.exportContacts(db,a,input.cursor,input.status,input.q)}))
 app.delete('/me/forms/submissions/:id',(q,r)=>run(q,r,true,(db,a)=>forms.deleteContact(db,a,z.object({id:z.string().uuid()}).strict().parse(q.params).id)))
 app.get('/profiles/:slug/contact-form',(q,r)=>run(q,r,false,(db,a)=>forms.publicContactForm(db,a.tenantId,z.object({slug:z.string().regex(/^[a-z0-9-]{3,40}$/)}).parse(q.params).slug,a.age)))
 app.post('/profiles/:slug/contact-form/submissions',(q,r)=>run(q,r,false,(db,a)=>{const slug=z.object({slug:z.string().regex(/^[a-z0-9-]{3,40}$/)}).parse(q.params).slug;const input=z.object({revisionId:z.string().uuid(),requestKey:z.string().uuid(),answers:z.record(z.string(),z.unknown()),marketingOptIn:z.boolean().default(false),website:z.string().max(200).default('')}).strict().parse(q.body);return forms.submitContact(db,{tenantId:a.tenantId,slug,age:a.age,secret:env.JWT_SECRET},input)}))
}
