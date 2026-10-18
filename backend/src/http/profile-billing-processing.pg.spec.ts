import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanBillingFixture } from '@/test-support/clean-billing-fixture'
import { BillingProviderError } from '@/domain/billing/billing-gateway'
import { BASE_PROFILE_CAPABILITIES, PROFILE_CAPABILITIES } from '@/domain/billing/profile-plans'
import { billingCheckoutInput, billingPlanInput, billingSettingsInput } from '@/domain/billing/billing-input'
import { readBillingOperation, readMySubscription, requestProfileCheckout, requestProfileSubscriptionChange, saveBillingSettings, saveProfilePlan, type BillingActor, type BillingRuntime } from '@/repositories/profile-billing-repository'
import { BILLING_LEASE_MS, BILLING_MAX_ATTEMPTS, claimBillingEvent, recoverBillingLeases, storeBillingEvent } from '@/repositories/profile-billing-work'
import { processBillingEvent } from '@/use-cases/@Billing/process-billing-event'
import { processBillingOperation } from '@/use-cases/@Billing/process-billing-operation'
import { queueStaleBillingReconciliations, queueSuspendedBillingCancellations, reconcileExpiredCheckouts } from '@/use-cases/@Billing/billing-lifecycle'
import { MemoryBillingGateway } from '@/test-support/memory-billing-gateway'
import { PrismaAccountDeletionRepository } from '@/use-cases/@Auth/delete-account'

const url = process.env.BILLING_DATABASE_URL ?? process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Local disposable billing database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let gateway: MemoryBillingGateway, runtime: BillingRuntime, owner: BillingActor, admin: BillingActor, now: Date, price: string, planId: string
const clock = () => now
beforeEach(async () => {
  const tenantId = randomUUID()
  now = new Date(); owner = { tenantId, ownerId: randomUUID() }; admin = { tenantId, ownerId: randomUUID() }
  await db.tenant.create({ data: { id: tenantId, host: tenantId + '.localhost', name: 'Processing fixture' } })
  for (const actor of [owner,admin]) await db.user.create({ data: { id: actor.ownerId, tenantId, name: 'Fixture', role: actor === admin ? 'ADMIN' : 'USER', passwordHash: 'fixture', identifiers: { create: { tenantId, kind: 'EMAIL', normalizedValue: actor.ownerId + '@fixture.test', confirmedAt: now } } } })
  await db.profile.create({ data: { ...owner, slug: 'pagina', name: 'Página preservada', bio: 'Conteúdo gratuito', version: 1 } })
  gateway = new MemoryBillingGateway()
  runtime = { enabled: true, production: false, gateway, webhookReady: true, delivered: new Set(PROFILE_CAPABILITIES) }
  price = 'price_' + randomUUID().replaceAll('-','')
  gateway.prices.set(price, { id: price, productId: 'prod_' + owner.tenantId.replaceAll('-',''), productName: 'Pro fixture', active: true, amountCents: 1290, currency: 'BRL', interval: 'month', intervalCount: 1, usageType: 'licensed', livemode: false })
  await saveBillingSettings(db,admin,billingSettingsInput.parse({expectedVersion:0,enabled:true,fiscalReviewed:true,publicOrigin:'http://'+owner.tenantId+'.localhost:3200'}),runtime)
  await saveProfilePlan(db,admin,billingPlanInput.parse({expectedVersion:0,tier:'PRO',amountCents:1290,currency:'BRL',interval:'month',providerPriceId:price,capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics'],enabled:true}),runtime)
  planId = (await db.profilePlanVersion.findFirstOrThrow({where:{tenantId:owner.tenantId}})).id
})
afterAll(() => db.$disconnect())
afterEach(() => cleanBillingFixture(db,owner.tenantId))
async function startCheckout() {
  const result = await requestProfileCheckout(db,owner,billingCheckoutInput.parse({planVersionId:planId}),randomUUID(),runtime,now)
  expect(await processBillingOperation(db,runtime,clock)).toBe(true)
  const row = await db.profileSubscription.findUniqueOrThrow({where:{id:(await db.profileBillingOperation.findUniqueOrThrow({where:{id:result.operationId}})).subscriptionId}})
  expect(row.status).toBe('PENDING')
  return { row, operationId: result.operationId }
}
async function event(providerId: string, kind = 'customer.subscription.updated') {
  const snapshot = gateway.subscriptions.get(providerId)!
  const id = 'evt_' + randomUUID().replaceAll('-','')
  await storeBillingEvent(db,{id,kind,customerId:snapshot.customerId,objectId:providerId,objectType:'subscription',livemode:false,createdAt:now},now)
  return id
}
async function activate() {
  const started = await startCheckout()
  const providerId = gateway.complete(started.row.providerCheckoutId!,now)
  const id = await event(providerId,'customer.subscription.created')
  await processBillingEvent(db,runtime,clock)
  return {...started,providerId,eventId:id}
}
it('F11-PG07/T02 only a correlated canonical paid period activates; retries/replays never create another Customer, Checkout or entitlement', async () => {
  const started = await startCheckout()
  expect((await readBillingOperation(db,owner,started.operationId,now)).checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\/c\/pay\//)
  expect((await readMySubscription(db,owner,runtime,now)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  const providerId = gateway.complete(started.row.providerCheckoutId!,now)
  const id = await event(providerId)
  await processBillingEvent(db,runtime,clock)
  const current = await readMySubscription(db,owner,runtime,now)
  expect(current.capabilities).toContain('profile.analytics'); expect(current.subscription?.status).toBe('ACTIVE')
  expect(await db.profileEntitlement.count({where:owner})).toBe(1)
  await storeBillingEvent(db,{id,kind:'customer.subscription.updated',customerId:gateway.subscriptions.get(providerId)!.customerId,objectId:providerId,objectType:'subscription',livemode:false,createdAt:now})
  expect(await processBillingEvent(db,runtime,clock)).toBe(false)
  expect(gateway.customers.size).toBe(1); expect(gateway.checkouts.size).toBe(1)
  expect(await db.profileBillingEvent.count({where:{id}})).toBe(1)
  expect(await db.profileEntitlement.count({where:owner})).toBe(1)
})
it('F11-PG08 a crash after external Customer creation is retried with the same provider idempotency key', async () => {
  await requestProfileCheckout(db,owner,billingCheckoutInput.parse({planVersionId:planId}),randomUUID(),runtime,now)
  const write = vi.spyOn(db.profileBillingAccount,'updateMany').mockRejectedValueOnce(new Error('disposable write failure'))
  try { await processBillingOperation(db,runtime,clock) } finally { write.mockRestore() }
  expect(gateway.customers.size).toBe(1); expect(gateway.checkouts.size).toBe(0)
  const pending = await db.profileBillingOperation.findFirstOrThrow({where:owner})
  expect(pending.state).toBe('PENDING')
  now = new Date(now.getTime()+5000)
  await processBillingOperation(db,runtime,clock)
  expect(gateway.customers.size).toBe(1); expect(gateway.checkouts.size).toBe(1)
  expect(gateway.calls.filter(row=>row.method==='customer').map(row=>row.key)).toEqual([expect.any(String),gateway.calls.find(row=>row.method==='customer')!.key])
})
it('F11-PG09 out-of-order canonical responses cannot restore access after a more recent cancellation', async () => {
  const active = await activate(), original = gateway.subscriptions.get(active.providerId)!
  const old = structuredClone(original)
  let release!: () => void, started!: () => void
  const held = new Promise<void>(resolve=>{release=resolve}), reached = new Promise<void>(resolve=>{started=resolve})
  const read = vi.spyOn(gateway,'subscription').mockImplementationOnce(async()=>{started();await held;return old})
  await event(active.providerId)
  const first = processBillingEvent(db,runtime,clock)
  try {
    await reached
    original.status='CANCELED'
    await event(active.providerId)
    await processBillingEvent(db,runtime,clock)
    release(); await first
  } finally { release(); read.mockRestore() }
  expect((await db.profileSubscription.findUniqueOrThrow({where:{id:active.row.id}})).status).toBe('CANCELED')
  expect((await readMySubscription(db,owner,runtime,now)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  expect(await db.profileBillingEvent.count({where:{...owner,state:'SUPERSEDED'}})).toBe(1)
})
it('F11-PG10/T04 cancellation preserves paid time and content; an account suspension automatically queues a stop to renewal', async () => {
  const active = await activate(), before = await db.profile.findFirstOrThrow({where:owner})
  runtime={...runtime,enabled:false}
  await saveBillingSettings(db,admin,billingSettingsInput.parse({expectedVersion:1,enabled:false,fiscalReviewed:false,publicOrigin:'http://'+owner.tenantId+'.localhost:3200'}),runtime)
  expect((await readMySubscription(db,owner,runtime,now)).subscription?.hasPaidAccess).toBe(true)
  const current = await readMySubscription(db,owner,runtime,now)
  await requestProfileSubscriptionChange(db,owner,{kind:'CANCEL',expectedVersion:current.subscription!.version},randomUUID(),runtime,now)
  await processBillingOperation(db,runtime,clock)
  expect(gateway.subscriptions.get(active.providerId)!.cancelAtPeriodEnd).toBe(true)
  expect((await readMySubscription(db,owner,runtime,now)).capabilities).toContain('profile.analytics')
  expect(await db.profile.findUniqueOrThrow({where:{id:before.id}})).toEqual(before)
  gateway.subscriptions.get(active.providerId)!.cancelAtPeriodEnd=false
  await event(active.providerId); await processBillingEvent(db,runtime,clock)
  await db.user.update({where:{id:owner.ownerId},data:{status:'BANNED'}})
  await queueSuspendedBillingCancellations(db,now)
  await processBillingOperation(db,runtime,clock)
  expect(gateway.subscriptions.get(active.providerId)!.cancelAtPeriodEnd).toBe(true)
  expect(gateway.calls.filter(row=>row.method==='checkout')).toHaveLength(1)
  await expect(readMySubscription(db,owner,runtime,now)).rejects.toMatchObject({status:403})
})
it('F11-PG11 a change is scheduled at the boundary; the new tier only applies after the canonical price and paid period change', async () => {
  const active = await activate(), nextPrice = price+'_premium'
  gateway.prices.set(nextPrice,{...gateway.prices.get(price)!,id:nextPrice,productId:'prod_'+randomUUID().replaceAll('-','')})
  await saveProfilePlan(db,admin,billingPlanInput.parse({expectedVersion:0,tier:'PREMIUM',amountCents:1290,currency:'BRL',interval:'month',providerPriceId:nextPrice,capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics','profile.richBlocks'],enabled:true}),runtime)
  const target = await db.profilePlanVersion.findFirstOrThrow({where:{tenantId:owner.tenantId,providerPriceId:nextPrice}})
  const current = await readMySubscription(db,owner,runtime,now)
  await requestProfileSubscriptionChange(db,owner,{kind:'CHANGE',expectedVersion:current.subscription!.version,targetVersionId:target.id},randomUUID(),runtime,now)
  await processBillingOperation(db,runtime,clock)
  expect((await readMySubscription(db,owner,runtime,now)).subscription).toMatchObject({tier:'PRO',nextPlan:{tier:'PREMIUM'}})
  const provider = gateway.subscriptions.get(active.providerId)!
  now = new Date(provider.periodEnd!.getTime()+1000)
  provider.priceId=nextPrice;provider.periodStart=new Date(now.getTime()-1000);provider.periodEnd=new Date(now.getTime()+30*86400000);provider.paidThrough=provider.periodEnd;provider.nextPriceId=null;provider.scheduleId=null
  await event(active.providerId);await processBillingEvent(db,runtime,clock)
  const changed = await readMySubscription(db,owner,runtime,now)
  expect(changed.subscription?.tier).toBe('PREMIUM');expect(changed.capabilities).toContain('profile.richBlocks')
})
it('F11-PG12 a provider outage grants nothing, retries remain bounded and a dead worker lease is recovered', async () => {
  const active = await startCheckout(), providerId = gateway.complete(active.row.providerCheckoutId!,now)
  await event(providerId)
  const read = vi.spyOn(gateway,'subscription').mockRejectedValue(new BillingProviderError('UNAVAILABLE'))
  try { await processBillingEvent(db,runtime,clock) } finally { read.mockRestore() }
  expect((await readMySubscription(db,owner,runtime,now)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  const pending = await db.profileBillingEvent.findFirstOrThrow({where:owner})
  expect(pending.state).toBe('PENDING')
  await db.profileBillingEvent.update({where:{id:pending.id},data:{state:'PROCESSING',attempts:BILLING_MAX_ATTEMPTS,lockedAt:new Date(now.getTime()-BILLING_LEASE_MS-1),leaseToken:randomUUID()}})
  await recoverBillingLeases(db,now)
  expect((await db.profileBillingEvent.findUniqueOrThrow({where:{id:pending.id}})).state).toBe('FAILED')
  expect(await claimBillingEvent(db,now)).toBeNull()
})
it('F11-PG13 expiration requires a real expired Checkout; pending/complete asynchronous payments keep their chargeable slot', async () => {
  const pending = await startCheckout()
  now = new Date(pending.row.checkoutExpiresAt!.getTime()+1000)
  await reconcileExpiredCheckouts(db,runtime,now)
  expect((await db.profileSubscription.findUniqueOrThrow({where:{id:pending.row.id}})).status).toBe('EXPIRED')
  const again = await startCheckout(), providerId = gateway.complete(again.row.providerCheckoutId!,now,false)
  await event(providerId);await processBillingEvent(db,runtime,clock)
  expect((await readMySubscription(db,owner,runtime,now)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  await expect(requestProfileCheckout(db,owner,billingCheckoutInput.parse({planVersionId:planId}),randomUUID(),runtime)).rejects.toMatchObject({status:409})
})
it('F11-PG14/T02 periodic canonical reconciliation recovers a missing webhook without creating or duplicating payment',async()=>{
  const pending=await startCheckout()
  gateway.complete(pending.row.providerCheckoutId!,now)
  now=new Date(now.getTime()+360000)
  expect(await queueStaleBillingReconciliations(db,now)).toBe(1)
  expect(await queueStaleBillingReconciliations(db,now)).toBe(0)
  expect(await db.profileBillingEvent.count({where:owner})).toBe(1)
  await processBillingEvent(db,runtime,clock)
  expect((await readMySubscription(db,owner,runtime,now)).subscription?.hasPaidAccess).toBe(true)
  expect(gateway.checkouts.size).toBe(1)
})
it('F11-PG15 deleting the real account stops renewal without changing the existing anonymization or retaining contacts',async()=>{
  const active=await activate()
  await new PrismaAccountDeletionRepository(db).anonymize(owner.ownerId)
  const account=await db.user.findUniqueOrThrow({where:{id:owner.ownerId},include:{identifiers:true}})
  expect(account.status).toBe('ACTIVE');expect(account.name).toBe('Conta excluída');expect(account.identifiers).toHaveLength(0)
  expect((await readMySubscription(db,owner,runtime,now)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  await queueSuspendedBillingCancellations(db,now);await processBillingOperation(db,runtime,clock)
  expect(gateway.subscriptions.get(active.providerId)!.cancelAtPeriodEnd).toBe(true)
  await event(active.providerId);await processBillingEvent(db,runtime,clock)
  expect((await readMySubscription(db,owner,runtime,now)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  expect(await db.profileEntitlement.count({where:{...owner,revokedAt:null}})).toBe(0)
  expect(await db.profile.count({where:owner})).toBe(0)
})
it('F11-PG16 changing an identifier does not withdraw a paid period while the new email awaits verification',async()=>{
  const active=await activate()
  await db.userIdentifier.updateMany({where:{userId:owner.ownerId},data:{confirmedAt:null}})
  await event(active.providerId);await processBillingEvent(db,runtime,clock)
  const current=await readMySubscription(db,owner,runtime,now)
  expect(current.canCheckout).toBe(false)
  expect(current.subscription?.hasPaidAccess).toBe(true)
  await queueSuspendedBillingCancellations(db,now)
  expect(await db.profileBillingOperation.count({where:{...owner,kind:'CANCEL'}})).toBe(0)
})
