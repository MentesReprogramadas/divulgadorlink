import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanBillingFixture } from '@/test-support/clean-billing-fixture'
import { BASE_PROFILE_CAPABILITIES, PROFILE_CAPABILITIES } from '@/domain/billing/profile-plans'
import type { BillingGateway } from '@/domain/billing/billing-gateway'
import { billingCheckoutInput, billingPlanInput, billingSettingsInput } from '@/domain/billing/billing-input'
import { billingCatalog, readBillingOperation, readMySubscription, requestProfileCheckout, saveBillingSettings, saveProfilePlan, type BillingActor, type BillingRuntime } from '@/repositories/profile-billing-repository'

const url = process.env.BILLING_DATABASE_URL ?? process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Local disposable F11 database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, foreign: string, owner: BillingActor, admin: BillingActor, other: BillingActor, runtime: BillingRuntime, priceId: string, productId: string
const forbidden = async () => { throw new Error('Unexpected external side effect') }
const gateway: BillingGateway = {
  livemode: false,
  price: async id => ({ id, productId, productName: 'Pro fixture', active: true, amountCents: 1290, currency: 'BRL', interval: 'month', intervalCount: 1, usageType: 'licensed', livemode: false }),
  createCustomer: vi.fn(forbidden), createCheckout: vi.fn(forbidden), checkout: forbidden, expireCheckout: forbidden, subscription: forbidden, subscriptionFromEvent: forbidden, resolveEventSubscription: forbidden,
  checkoutForSubscription: forbidden, cancelAtPeriodEnd: forbidden, cancelUnpaid: forbidden, changeAtPeriodEnd: forbidden, verifyEvent: () => null,
}
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); priceId = 'price_' + tenant.replaceAll('-',''); productId = 'prod_' + tenant.replaceAll('-','')
  owner = { tenantId: tenant, ownerId: randomUUID() }; other = { tenantId: tenant, ownerId: randomUUID() }; admin = { tenantId: tenant, ownerId: randomUUID() }
  for (const id of [tenant,foreign]) await db.tenant.create({ data: { id, name: 'Billing fixture', host: id + '.localhost' } })
  for (const actor of [owner,other,admin]) await db.user.create({ data: { id: actor.ownerId, tenantId: actor.tenantId, name: 'Fixture', passwordHash: 'fixture', role: actor === admin ? 'ADMIN' : 'USER',
    identifiers: { create: [{ tenantId: tenant, kind: 'EMAIL', normalizedValue: actor.ownerId + '@fixture.test', confirmedAt: new Date() }, { tenantId: tenant, kind: 'PHONE', normalizedValue: actor.ownerId, confirmedAt: new Date() }] },
  } })
  await db.profile.create({ data: { ...owner, slug: 'pagina-fixture', name: 'Página gratuita', bio: '', version: 1 } })
  runtime = { enabled: true, production: false, gateway, webhookReady: true, delivered: new Set(PROFILE_CAPABILITIES) }
  vi.clearAllMocks()
})
afterAll(() => db.$disconnect())
afterEach(() => cleanBillingFixture(db,tenant))
async function configure() {
  await saveBillingSettings(db, admin, billingSettingsInput.parse({ expectedVersion: 0, enabled: true, fiscalReviewed: true, publicOrigin: 'http://' + tenant + '.localhost:3200' }), runtime)
  await saveProfilePlan(db, admin, billingPlanInput.parse({ tier: 'PRO', amountCents: 1290, currency: 'BRL', interval: 'month', providerPriceId: priceId, capabilities: [...BASE_PROFILE_CAPABILITIES,'profile.analytics'], enabled: true, expectedVersion: 0 }), runtime)
  return db.profilePlanVersion.findFirstOrThrow({ where: { tenantId: tenant } })
}
it('F11-PG01/T01 free existing pages remain available without configuration or provider; future paid resources cannot be sold', async () => {
  const freeRuntime = { ...runtime, enabled: false, gateway: null, delivered: new Set(BASE_PROFILE_CAPABILITIES) }
  expect((await billingCatalog(db,tenant,freeRuntime)).map(row => row.available)).toEqual([true,false,false])
  expect((await readMySubscription(db,owner,freeRuntime)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  expect(await db.profileBillingAccount.count({ where: { tenantId: tenant } })).toBe(0)
  const before = await db.profile.findFirstOrThrow({ where: owner })
  const plan = await configure()
  await expect(requestProfileCheckout(db,owner,billingCheckoutInput.parse({ planVersionId: plan.id }),randomUUID(),{...runtime,delivered:new Set(BASE_PROFILE_CAPABILITIES)})).rejects.toMatchObject({status:409})
  expect(await db.profile.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before)
})
it('F11-PG02/T02 versioned prices are immutable, require a separate Product, and retain old editions on change', async () => {
  const first = await configure()
  await expect(db.profilePlanVersion.update({ where: { id: first.id }, data: { amountCents: 1 } })).rejects.toThrow()
  await expect(saveProfilePlan(db,admin,billingPlanInput.parse({tier:'PRO',amountCents:1290,currency:'BRL',interval:'month',providerPriceId:priceId,capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics','profile.scheduling'],enabled:true,expectedVersion:1}),runtime)).rejects.toMatchObject({status:422})
  const next = { tier:'PRO',amountCents:1290,currency:'BRL',interval:'month',providerPriceId:priceId+'_next',capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics','profile.scheduling'],enabled:true,expectedVersion:1 }
  await saveProfilePlan(db,admin,billingPlanInput.parse(next),runtime)
  expect(await db.profilePlanVersion.count({ where:{tenantId:tenant} })).toBe(2)
  expect((await db.profilePlanVersion.findUniqueOrThrow({where:{id:first.id}})).capabilities).toEqual([...BASE_PROFILE_CAPABILITIES,'profile.analytics'])
})
it('F11-PG03/T03 checkout is only a durable intent: simultaneous keys never create two open subscriptions or affect promotion orders', async () => {
  const plan = await configure(), input = billingCheckoutInput.parse({planVersionId:plan.id})
  const network = await db.network.create({data:{tenantId:tenant,name:'Site',slug:'site',knownHosts:[]}})
  const niche = await db.niche.create({data:{tenantId:tenant,name:'Estudos',slug:'estudos'}})
  const link = await db.link.create({data:{...owner,networkId:network.id,nicheId:niche.id,name:'Destaque existente',description:'Fixture',canonicalUrl:'https://example.com/destaque',status:'PUBLISHED'}})
  const order = await db.order.create({data:{tenantId:tenant,userId:owner.ownerId,linkId:link.id,status:'PAID',method:'CARD',productCode:'SEARCH',durationDays:7,amountCents:3000,savingsCents:0,paidAt:new Date()}})
  const promotion = await db.promotion.create({data:{tenantId:tenant,linkId:link.id,status:'ACTIVE',surface:'SEARCH',activatedAt:new Date(),expiresAt:new Date(Date.now()+7*86400000)}})
  const key = randomUUID()
  const replies = await Promise.all([requestProfileCheckout(db,owner,input,key,runtime),requestProfileCheckout(db,owner,input,key,runtime)])
  expect(replies[0].operationId).toBe(replies[1].operationId)
  await expect(requestProfileCheckout(db,owner,input,randomUUID(),runtime)).rejects.toMatchObject({status:409})
  expect(await db.profileSubscription.count({where:owner})).toBe(1)
  expect(await db.profileBillingOperation.count({where:owner})).toBe(1)
  expect(await db.order.count({where:{tenantId:tenant}})).toBe(1)
  expect(await db.promotion.count({where:{tenantId:tenant}})).toBe(1)
  expect(await db.order.findUniqueOrThrow({where:{id:order.id}})).toEqual(order)
  expect(await db.promotion.findUniqueOrThrow({where:{id:promotion.id}})).toEqual(promotion)
  expect(gateway.createCheckout).not.toHaveBeenCalled()
  expect((await readMySubscription(db,owner,runtime)).capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
})
it('F11-PG04 owner/tenant foreign keys and the open-subscription index reject cross-owner links and duplicate chargeable slots', async () => {
  const plan = await configure()
  const account = await db.profileBillingAccount.create({data:owner})
  const data = {...owner,accountId:account.id,planVersionId:plan.id}
  await db.profileSubscription.create({data})
  await expect(db.profileSubscription.create({data})).rejects.toThrow()
  await expect(db.profileSubscription.create({data:{...data,ownerId:other.ownerId}})).rejects.toThrow()
  await expect(db.profileSubscription.create({data:{...data,tenantId:foreign}})).rejects.toThrow()
})
it('F11-PG05 active database admin and verified owner checks are authoritative; origin and stale configurations fail closed', async () => {
  const settings = {expectedVersion:0,enabled:false,fiscalReviewed:false,publicOrigin:'http://'+tenant+'.localhost:3200'}
  await expect(saveBillingSettings(db,owner,billingSettingsInput.parse(settings),runtime)).rejects.toMatchObject({status:403})
  await expect(saveBillingSettings(db,admin,billingSettingsInput.parse({...settings,publicOrigin:'https://foreign.test'}),runtime)).rejects.toMatchObject({status:422})
  await saveBillingSettings(db,admin,billingSettingsInput.parse(settings),runtime)
  await expect(saveBillingSettings(db,admin,billingSettingsInput.parse(settings),runtime)).rejects.toMatchObject({status:409})
  await db.user.update({where:{id:admin.ownerId},data:{status:'BANNED'}})
  await expect(saveBillingSettings(db,admin,billingSettingsInput.parse({...settings,expectedVersion:1}),runtime)).rejects.toMatchObject({status:403})
})
it('F11-PG06 private operation reads never disclose another owner checkout, and key reuse with another payload is rejected', async () => {
  const plan = await configure(), key = randomUUID(), input = billingCheckoutInput.parse({planVersionId:plan.id})
  const created = await requestProfileCheckout(db,owner,input,key,runtime)
  await expect(readBillingOperation(db,other,created.operationId)).rejects.toMatchObject({status:404})
  expect(await readBillingOperation(db,owner,created.operationId)).toMatchObject({state:'PENDING',checkoutUrl:null})
  await expect(requestProfileCheckout(db,owner,{...input,returnPath:'/painel/perfil'},key,runtime)).rejects.toMatchObject({status:409})
  await db.userIdentifier.updateMany({where:{userId:owner.ownerId,kind:'EMAIL'},data:{confirmedAt:null}})
  await expect(requestProfileCheckout(db,owner,input,randomUUID(),runtime)).rejects.toMatchObject({status:403})
})
