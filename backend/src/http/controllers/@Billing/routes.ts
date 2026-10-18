import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'
import { BillingError, billingCheckoutInput, billingExpectedVersion, billingPlanInput, billingRequestKey, billingSettingsInput } from '@/domain/billing/billing-input'
import { BillingProviderError } from '@/domain/billing/billing-gateway'
import { profileBillingDb, profileBillingRuntime } from '@/lib/profile-billing'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { buildError } from '@/http/errors'
import { logDomainEvent } from '@/observability/logger'
import * as billing from '@/repositories/profile-billing-repository'
import { storeBillingEvent } from '@/repositories/profile-billing-work'
import { requestBillingReconciliation } from '@/use-cases/@Billing/billing-lifecycle'

const empty = z.object({}).strict()
const operationParams = z.object({ id: z.string().uuid() })
const eventParams = z.object({ id: z.string().max(128).regex(/^[a-zA-Z0-9_-]+$/) })
const cancelInput = z.object({ expectedVersion: billingExpectedVersion }).strict()
const changeInput = z.object({ expectedVersion: billingExpectedVersion, targetPlanVersionId: z.string().uuid(), timing: z.literal('PERIOD_END') }).strict()
type Scope = 'PUBLIC' | 'OWNER' | 'ADMIN'
async function run(request: FastifyRequest, reply: FastifyReply, scope: Scope, action: (db: PrismaClient, actor: billing.BillingActor) => Promise<unknown>) {
  reply.header('cache-control', scope === 'PUBLIC' ? 'no-store' : 'private, no-store').header('x-content-type-options','nosniff')
  try {
    const user = await readAccessUser(request)
    if (scope !== 'PUBLIC' && (!user || user.typ !== 'access')) throw new BillingError(401,'Entre para continuar.')
    const tenant = await resolveTenant(normalizeTenantHost(request.headers.host ?? ''))
    if (scope !== 'PUBLIC' && user?.tenantId !== tenant.id) throw new BillingError(403,'Acesso negado.')
    const db = profileBillingDb(), actor = { tenantId: tenant.id, ownerId: user?.sub ?? '' }
    if (scope === 'ADMIN') await billing.requireBillingActor(db,actor,'ADMIN')
    return await action(db,actor)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.code(404).send(buildError({code:'not_found',message:'Recurso não encontrado.',request_id:request.id}))
    if (error instanceof ZodError) return reply.code(400).send(buildError({code:'validation',message:'Confira os campos informados.',request_id:request.id}))
    if (error instanceof BillingError) return reply.code(error.status).send(buildError({code:error.status===401?'unauthenticated':error.status===403?'forbidden':error.status===404?'not_found':error.status===409?'conflict':error.status===503?'provider_error':'validation',message:error.message,request_id:request.id}))
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return reply.code(409).send(buildError({code:'conflict',message:'Já existe uma solicitação ou configuração equivalente. Atualize os dados.',request_id:request.id}))
    logDomainEvent('profile.billing.failed',{request_id:request.id,result:error instanceof BillingProviderError?error.code:'STORAGE_FAILURE'})
    return reply.code(503).send(buildError({code:'provider_error',message:'Assinatura indisponível. Tente novamente.',request_id:request.id}))
  }
}
export async function profileBillingRoutes(app: FastifyInstance) {
  app.get('/profile-plans',(q,r)=>run(q,r,'PUBLIC',async(db,actor)=>({plans:await billing.billingCatalog(db,actor.tenantId,profileBillingRuntime())})))
  app.get('/me/subscription',(q,r)=>run(q,r,'OWNER',(db,actor)=>billing.readMySubscription(db,actor,profileBillingRuntime())))
  app.post('/subscriptions/checkout',(q,r)=>run(q,r,'OWNER',async(db,actor)=>{
    const input = billingCheckoutInput.parse(q.body), key = billingRequestKey.parse(q.headers['idempotency-key'])
    const result = await billing.requestProfileCheckout(db,actor,input,key,profileBillingRuntime());r.code(202);return result
  }))
  app.post('/me/subscription/cancel',(q,r)=>run(q,r,'OWNER',async(db,actor)=>{
    const input = cancelInput.parse(q.body), key = billingRequestKey.parse(q.headers['idempotency-key'])
    const result = await billing.requestProfileSubscriptionChange(db,actor,{kind:'CANCEL',expectedVersion:input.expectedVersion},key,profileBillingRuntime());r.code(202);return result
  }))
  app.post('/me/subscription/change',(q,r)=>run(q,r,'OWNER',async(db,actor)=>{
    const input = changeInput.parse(q.body), key = billingRequestKey.parse(q.headers['idempotency-key'])
    const result = await billing.requestProfileSubscriptionChange(db,actor,{kind:'CHANGE',expectedVersion:input.expectedVersion,targetVersionId:input.targetPlanVersionId},key,profileBillingRuntime());r.code(202);return result
  }))
  app.post('/me/subscription/reconcile',(q,r)=>run(q,r,'OWNER',async(db,actor)=>{empty.parse(q.body);r.code(202);return requestBillingReconciliation(db,actor)}))
  app.get('/me/billing-operations/:id',(q,r)=>run(q,r,'OWNER',(db,actor)=>billing.readBillingOperation(db,actor,operationParams.parse(q.params).id)))
  app.get('/admin/profile-billing',(q,r)=>run(q,r,'ADMIN',(db,actor)=>billing.readBillingAdmin(db,actor,profileBillingRuntime())))
  app.put('/admin/profile-billing/settings',(q,r)=>run(q,r,'ADMIN',(db,actor)=>billing.saveBillingSettings(db,actor,billingSettingsInput.parse(q.body),profileBillingRuntime())))
  app.post('/admin/profile-billing/plans',(q,r)=>run(q,r,'ADMIN',(db,actor)=>billing.saveProfilePlan(db,actor,billingPlanInput.parse(q.body),profileBillingRuntime())))
  app.post('/admin/profile-billing/operations/:id/retry',(q,r)=>run(q,r,'ADMIN',async(db,actor)=>{
    empty.parse(q.body);const id=operationParams.parse(q.params).id
    return billing.withBillingActor(db,actor,'ADMIN',async tx=>{
      const operation=await tx.profileBillingOperation.findFirst({where:{id,tenantId:actor.tenantId,state:'FAILED',kind:'CANCEL'}})
      if(!operation) throw new BillingError(404,'Cancelamento com falha não encontrado.')
      await tx.profileBillingOperation.updateMany({where:{id,state:'FAILED'},data:{state:'PENDING',attempts:0,leaseToken:null,lockedAt:null,lastError:null,nextAttemptAt:new Date()}})
      await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.ownerId,action:'profile.billing.cancel_retry',entityType:'ProfileBillingOperation',entityId:id}})
      r.code(202);return{queued:true}
    })
  }))
  app.post('/admin/profile-billing/events/:id/retry',(q,r)=>run(q,r,'ADMIN',async(db,actor)=>{
    empty.parse(q.body);const id=eventParams.parse(q.params).id
    return billing.withBillingActor(db,actor,'ADMIN',async tx=>{
      const event=await tx.profileBillingEvent.findFirst({where:{id,tenantId:actor.tenantId,state:'FAILED'}})
      if(!event) throw new BillingError(404,'Confirmação com falha não encontrada.')
      await tx.profileBillingEvent.updateMany({where:{id,state:'FAILED'},data:{state:'PENDING',attempts:0,leaseToken:null,lockedAt:null,lastError:null,nextAttemptAt:new Date()}})
      await tx.auditLog.create({data:{tenantId:actor.tenantId,actorId:actor.ownerId,action:'profile.billing.event_retry',entityType:'ProfileBillingEvent',entityId:id}})
      r.code(202);return{queued:true}
    })
  }))
}
export async function profileBillingWebhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser('application/json',{parseAs:'buffer'},(_request,body,done)=>done(null,body))
  app.post('/billing/stripe/webhook',async(q,r)=>{
    r.header('cache-control','no-store')
    const runtime=profileBillingRuntime()
    if(!runtime.gateway || !runtime.webhookReady) return r.code(503).send({received:false})
    const signature=q.headers['stripe-signature']
    if(!Buffer.isBuffer(q.body) || typeof signature!=='string') return r.code(400).send({received:false})
    try {
      const reference=runtime.gateway.verifyEvent(q.body,signature)
      return reference ? await storeBillingEvent(profileBillingDb(),reference) : {received:true,ignored:true}
    } catch(error) {
      if(error instanceof BillingProviderError && error.code==='SIGNATURE') return r.code(400).send({received:false})
      logDomainEvent('profile.billing.webhook_failed',{request_id:q.id,result:'STORAGE_FAILURE'})
      return r.code(503).send({received:false})
    }
  })
}
