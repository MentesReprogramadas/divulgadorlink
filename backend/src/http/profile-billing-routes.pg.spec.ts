import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe-billing'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { cleanBillingFixture } from '@/test-support/clean-billing-fixture'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { setProfileBillingForTest } from '@/lib/profile-billing'
import { StripeBillingGateway } from '@/adapters/billing/stripe-billing-gateway'
import { BASE_PROFILE_CAPABILITIES } from '@/domain/billing/profile-plans'

const url = process.env.BILLING_DATABASE_URL ?? process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local billing database required')
const db = new PrismaClient({ datasources: { db: { url } } })
const client = new Stripe('sk_test_fixture', { maxNetworkRetries: 0 })
let tenant: string, owner: string, admin: string, foreign: string
beforeAll(async () => {
  setTenantsRepositoryForTest({ findByHost: host => db.tenant.findUnique({ where: { host } }) })
  setProfileBillingForTest(db, { enabled: false, production: false, gateway: new StripeBillingGateway(client,'whsec_fixture',false), webhookReady: true, delivered: new Set(BASE_PROFILE_CAPABILITIES) })
  await app.ready()
})
beforeEach(async () => {
  tenant = randomUUID(); owner = randomUUID(); admin = randomUUID(); foreign = randomUUID()
  for (const id of [tenant,foreign]) await db.tenant.create({ data: { id, name: 'F11 route fixture', host: id + '.localhost' } })
  for (const [id,role] of [[owner,'USER'],[admin,'ADMIN']] as const) await db.user.create({ data: { id, tenantId: tenant, name: 'Fixture', role, passwordHash: 'fixture' } })
})
afterAll(async () => { setProfileBillingForTest(null,null); await db.$disconnect() })
afterEach(() => cleanBillingFixture(db,tenant))
function token(sub = owner, role = 'USER', tenantId = tenant) { return app.jwt.sign({ sub, role, tenantId, typ: 'access' }) }
function headers(sub = owner, role = 'USER') { return { host: tenant + '.localhost', authorization: 'Bearer ' + token(sub,role) } }
it('F11-H01 no-store reads expose only free capabilities and real database permissions', async () => {
  const publicResult = await app.inject({ method: 'GET', url: '/api/v1/profile-plans', headers: {host:tenant+'.localhost'} })
  expect(publicResult.statusCode,publicResult.body).toBe(200)
  expect(publicResult.headers['cache-control']).toBe('no-store')
  expect(publicResult.json().plans.map((row: {available:boolean}) => row.available)).toEqual([true,false,false])
  const own = await app.inject({ method:'GET',url:'/api/v1/me/subscription',headers:headers() })
  expect(own.json().capabilities).toEqual(BASE_PROFILE_CAPABILITIES)
  expect(own.body).not.toMatch(/providerCustomerId|providerSubscriptionId|password|identifiers/)
  expect((await app.inject({method:'GET',url:'/api/v1/me/subscription',headers:{host:tenant+'.localhost'}})).statusCode).toBe(401)
  expect((await app.inject({method:'GET',url:'/api/v1/admin/profile-billing',headers:headers(owner,'ADMIN')})).statusCode).toBe(403)
  expect((await app.inject({method:'GET',url:'/api/v1/admin/profile-billing',headers:headers(admin,'USER')})).statusCode).toBe(200)
  expect((await app.inject({method:'GET',url:'/api/v1/me/subscription',headers:{...headers(),host:foreign+'.localhost'}})).statusCode).toBe(403)
  await db.user.update({where:{id:owner},data:{status:'BANNED'}})
  expect((await app.inject({method:'GET',url:'/api/v1/me/subscription',headers:headers()})).statusCode).toBe(403)
})
it('F11-H02 cookie mutations require CSRF and strict inputs; invented payment evidence cannot grant access', async () => {
  const cookie = 'accessToken=' + token() + '; csrfToken=' + 'a'.repeat(32)
  const request = {method:'POST' as const,url:'/api/v1/me/subscription/cancel',headers:{host:tenant+'.localhost',cookie,'content-type':'application/json','idempotency-key':randomUUID()},payload:{expectedVersion:1}}
  expect((await app.inject(request)).statusCode).toBe(403)
  const malicious = await app.inject({method:'POST',url:'/api/v1/subscriptions/checkout',headers:{...headers(),'idempotency-key':randomUUID()},payload:{planVersionId:randomUUID(),paid:true,ownerId:admin}})
  expect(malicious.statusCode,malicious.body).toBe(400)
  expect((await app.inject({method:'POST',url:'/api/v1/me/subscription/change',headers:{...headers(),'idempotency-key':randomUUID()},payload:{expectedVersion:1,targetPlanVersionId:randomUUID(),timing:'IMMEDIATE'}})).statusCode).toBe(400)
  expect(await db.profileEntitlement.count({where:{tenantId:tenant}})).toBe(0)
})
it('F11-H03 actual SDK validates exact webhook bytes and environment, durably deduplicates and never stores contact metadata', async () => {
  const customerId = 'cus_' + tenant.replaceAll('-','')
  await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner,providerCustomerId:customerId}})
  await db.profileBillingSettings.create({data:{tenantId:tenant,publicOrigin:'http://'+tenant+'.localhost'}})
  const payload = JSON.stringify({ id:'evt_'+tenant.replaceAll('-',''),object:'event',type:'customer.subscription.updated',created:Math.floor(Date.now()/1000),livemode:false,data:{object:{id:'sub_fixture',customer:customerId,metadata:{email:'private@example.test',ownerId:admin}}} })
  const signature = client.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'})
  const request = {method:'POST' as const,url:'/api/v1/billing/stripe/webhook',headers:{host:tenant+'.localhost','content-type':'application/json','stripe-signature':signature},payload}
  const accepted = await app.inject(request)
  expect(accepted.statusCode,accepted.body).toBe(200)
  expect((await app.inject(request)).statusCode).toBe(200)
  const rows = await db.profileBillingEvent.findMany({where:{tenantId:tenant}})
  expect(rows).toHaveLength(1);expect(JSON.stringify(rows)).not.toMatch(/private@example|metadata/)
  expect(rows[0].state).toBe('PENDING')
  expect((await app.inject({...request,payload:payload+' '})).statusCode).toBe(400)
  expect((await app.inject({...request,headers:{...request.headers,'stripe-signature':'t=1,v1=invalid'}})).statusCode).toBe(400)
  const live=payload.replace('"livemode":false','"livemode":true')
  expect((await app.inject({...request,payload:live,headers:{...request.headers,'stripe-signature':client.webhooks.generateTestHeaderString({payload:live,secret:'whsec_fixture'})}})).statusCode).toBe(400)
  expect(await db.profileEntitlement.count({where:{tenantId:tenant}})).toBe(0)
})
it('F11-H04 only the database administrator can retry a failed cancellation, retaining its provider idempotency identity',async()=>{
  const account=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner}})
  const plan=await db.profilePlan.create({data:{tenantId:tenant,tier:'PRO',title:'Pro',providerProductId:'prod_'+tenant.replaceAll('-','')}})
  const version=await db.profilePlanVersion.create({data:{tenantId:tenant,planId:plan.id,version:1,amountCents:1290,currency:'BRL',interval:'month',capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics'],providerPriceId:'price_'+tenant.replaceAll('-',''),providerProductId:plan.providerProductId!}})
  const subscription=await db.profileSubscription.create({data:{tenantId:tenant,ownerId:owner,accountId:account.id,planVersionId:version.id}})
  const operation=await db.profileBillingOperation.create({data:{tenantId:tenant,ownerId:owner,subscriptionId:subscription.id,kind:'CANCEL',requestKey:randomUUID(),fingerprint:'a'.repeat(64),expectedVersion:1,state:'FAILED',attempts:10,lastError:'UNAVAILABLE'}})
  const request={method:'POST' as const,url:'/api/v1/admin/profile-billing/operations/'+operation.id+'/retry',headers:headers(owner,'ADMIN'),payload:{}}
  expect((await app.inject(request)).statusCode).toBe(403)
  const result=await app.inject({...request,headers:headers(admin,'USER')});expect(result.statusCode,result.body).toBe(202)
  expect(await db.profileBillingOperation.findUniqueOrThrow({where:{id:operation.id}})).toMatchObject({state:'PENDING',attempts:0,requestKey:operation.requestKey,fingerprint:operation.fingerprint})
  expect((await app.inject({...request,headers:headers(admin)})).statusCode).toBe(404)
  expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.billing.cancel_retry'}})).toBe(1)
})
