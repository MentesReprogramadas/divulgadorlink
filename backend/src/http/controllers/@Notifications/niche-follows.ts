import type {FastifyInstance} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {z} from 'zod'
import {prisma} from '@/lib/prisma'
import {resolveTenant,normalizeTenantHost} from '@/http/tenant'
import {withNotificationActor} from './renewal-reminders'
import {RenewalReminderError} from '@/use-cases/@Notifications/renewal-reminders'
import {followedNiches,followNiche,digestPreferences,unsubscribeNicheDigest} from '@/use-cases/@Notifications/niche-follows'
import {buildError} from '@/http/errors'
let testDb:PrismaClient|null=null
export function setNicheFollowsDbForTest(db:PrismaClient|null){if(process.env.NODE_ENV==='test')testDb=db}
const empty=z.object({}).strict(),params=z.object({nicheId:z.string().min(1).max(128)}).strict()
export async function nicheFollowRoutes(app:FastifyInstance){
 app.get('/me/followed-niches',(q,r)=>withNotificationActor(q,r,a=>{empty.parse(q.query);return followedNiches(testDb??prisma,a)}))
 app.put('/me/followed-niches/:nicheId',(q,r)=>withNotificationActor(q,r,a=>{empty.parse(q.query);empty.parse(q.body??{});return followNiche(testDb??prisma,a,params.parse(q.params).nicheId,true)}))
 app.delete('/me/followed-niches/:nicheId',(q,r)=>withNotificationActor(q,r,a=>{empty.parse(q.query);empty.parse(q.body??{});return followNiche(testDb??prisma,a,params.parse(q.params).nicheId,false)}))
 app.patch('/me/niche-digest-preferences',(q,r)=>withNotificationActor(q,r,a=>digestPreferences(testDb??prisma,a,z.object({emailDigest:z.boolean(),frequency:z.enum(['WEEKLY','MONTHLY']),expectedVersion:z.number().int().nonnegative().max(2147483646)}).strict().parse(q.body))))
 app.post('/niche-digests/unsubscribe',async(q,r)=>{
  r.header('cache-control','private, no-store')
  const {token}=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(q.body)
  const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''))
  try{return await unsubscribeNicheDigest(testDb??prisma,tenant.id,token)}catch(error){if(!(error instanceof RenewalReminderError))throw error;return r.code(error.status).send(buildError({code:'not_found',message:error.message,request_id:q.id}))}
 })
}
