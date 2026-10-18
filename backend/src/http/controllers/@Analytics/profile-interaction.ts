import type {FastifyInstance,FastifyReply,FastifyRequest} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {z,ZodError} from 'zod'
import {prisma} from '@/lib/prisma'
import {ProfileError} from '@/domain/profiles/profile'
import {canMeasureProfile,profileInteractionInput} from '@/domain/analytics/profile-interaction'
import {readAccessUser} from '@/http/middlewares/verify-jwt'
import {resolveTenant,normalizeTenantHost} from '@/http/tenant'
import {ResourceNotFoundError} from '@/use-cases/errors/resource-not-found-error'
import {buildError} from '@/http/errors'
import {analyticsSession} from './routes'
import {collectProfileInteraction,interactionQuery,profileMeasurementPreference,readProfileInteractionReport} from '@/repositories/profile-interactions'
let testDb:PrismaClient|null=null
export function setProfileInteractionsForTest(db:PrismaClient|null){if(process.env.NODE_ENV==='test')testDb=db}
async function run(q:FastifyRequest,r:FastifyReply,work:(db:PrismaClient,tenantId:string)=>Promise<unknown>){
 r.header('cache-control','private, no-store')
 try{return await work(testDb??prisma,(await resolveTenant(normalizeTenantHost(q.headers.host??''))).id)}catch(reason){
  if(reason instanceof ZodError)return r.code(400).send(buildError({code:'validation',message:'Confira os campos da medição.',request_id:q.id}))
  const error=reason instanceof ResourceNotFoundError?new ProfileError(404,'Página não encontrada.'):reason
  if(error instanceof ProfileError)return r.code(error.status).send(buildError({code:error.status===401?'unauthenticated':error.status===403?'forbidden':error.status===404?'not_found':error.status===409?'conflict':error.status===429?'rate_limited':'validation',message:error.message,request_id:q.id}))
  throw error
 }
}
async function actor(q:FastifyRequest,tenantId:string){const u=await readAccessUser(q);if(!u||u.typ!=='access')throw new ProfileError(401,'Entre para ver as métricas.');if(u.tenantId!==tenantId)throw new ProfileError(403,'Acesso negado.');return {tenantId,ownerId:u.sub,age:q.cookies.age==='yes'}}
export async function profileInteractionRoutes(app:FastifyInstance){
 app.post('/analytics/profiles/events',(q,r)=>run(q,r,async(db,tenantId)=>{
  const body=profileInteractionInput.parse(q.body),user=await readAccessUser(q)
  const excluded=(ownerId:string)=>!canMeasureProfile({consent:q.cookies.tla_profile_measure,dnt:q.headers.dnt as string|undefined,gpc:q.headers['sec-gpc'] as string|undefined,userAgent:q.headers['user-agent'],testTraffic:q.headers['x-test-traffic'] as string|undefined,owner:user?.tenantId===tenantId&&user.sub===ownerId,admin:user?.tenantId===tenantId&&user.role==='ADMIN',support:Boolean(q.supportSession)})
  if(excluded(''))return {counted:false}
  const result=await collectProfileInteraction(db,tenantId,body,analyticsSession(q,r),excluded,q.cookies.age==='yes')
  r.code(result.counted?201:200);return result
 }))
 app.get('/me/profile/measurement',(q,r)=>run(q,r,async(db,tenantId)=>profileMeasurementPreference(db,await actor(q,tenantId))))
 app.patch('/me/profile/measurement',(q,r)=>run(q,r,async(db,tenantId)=>profileMeasurementPreference(db,await actor(q,tenantId),z.object({enabled:z.boolean(),expectedVersion:z.number().int().min(0).max(2147483646)}).strict().parse(q.body))))
 app.get('/me/profile/interaction',(q,r)=>run(q,r,async(db,tenantId)=>readProfileInteractionReport(db,await actor(q,tenantId),interactionQuery.parse(q.query))))
}
