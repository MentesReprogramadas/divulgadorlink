import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { setProfilesForTest } from '@/http/controllers/@Profiles/routes'
import { setRedirectsForTest } from '@/http/controllers/@Redirects/routes'
import { setProfileClockForTest } from '@/lib/profile-clock'
import { setProfileBillingForTest } from '@/lib/profile-billing'
import { BASE_PROFILE_CAPABILITIES } from '@/domain/billing/profile-plans'
import { cleanBillingFixture } from '@/test-support/clean-billing-fixture'
import type { ProfileContent } from '@/domain/profiles/profile'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,foreignOwner:string,now:Date,subscriptionId:string
const start='2026-10-17T12:00:00.000Z',end='2026-10-17T13:00:00.000Z'
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
  tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();now=new Date('2026-10-17T11:00:00Z')
  for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F14 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
  for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F14 fixture',passwordHash:'fixture',role:'ADMIN',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:now}}}})
  const plan=await db.profilePlan.create({data:{tenantId:tenant,tier:'PRO',title:'Fixture',versions:{create:{version:1,amountCents:1000,providerProductId:'prod_fixture',capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.scheduling'],providerPriceId:'price_'+tenant.replaceAll('-','')}}},include:{versions:true}})
  const account=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner}})
  const subscription=await db.profileSubscription.create({data:{tenantId:tenant,ownerId:owner,accountId:account.id,planVersionId:plan.versions[0].id,status:'ACTIVE',periodStart:new Date('2026-10-01Z'),periodEnd:new Date('2026-11-01Z'),paidThrough:new Date('2026-11-01Z'),entitlements:{create:{capability:'profile.scheduling',validFrom:new Date('2026-10-01Z'),validUntil:new Date('2026-11-01Z')}}}})
  subscriptionId=subscription.id
  setProfilesForTest(db,{probe:async()=>200,judge:async()=>({pass:true,confidence:.99,reasons:[]})})
  setRedirectsForTest(db,{probe:async()=>200,judge:async()=>({pass:true,confidence:.99,reasons:[]})})
  setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set([...BASE_PROFILE_CAPABILITIES,'profile.scheduling'])})
  setProfileClockForTest(()=>now)
})
afterEach(async()=>{setProfileClockForTest(null);setProfileBillingForTest(null,null);await cleanBillingFixture(db,tenant)})
afterAll(async()=>{setProfilesForTest(null);setRedirectsForTest(null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',route:string,body?:unknown,actor:string|null=owner,actorTenant=tenant){return app.inject({method,url:'/api/v1/'+route,headers:{host:tenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:actorTenant,role:'ADMIN',typ:'access'})}:{})},...(body?{payload:body}:{})})}
function content():ProfileContent{const group=randomUUID();return{slug:'f14-pagina',name:'Página F14',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Eventos',visible:true}],items:[{id:randomUUID(),categoryId:group,type:'URL',label:'F14-FUTURE-SECRET',destination:'https://example.com/f14-private-future',visible:true,schedule:{startsAt:start,endsAt:end,timeZone:'America/Sao_Paulo',paused:false}}]}}
async function saved(value=content(),version=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion:version});expect(r.statusCode,r.body).toBe(200);return r.json()}
async function published(){await saved();const r=await call('POST','me/profile/publish',{expectedVersion:1});expect(r.statusCode,r.body).toBe(200)}
it('F14-T01/I01 exact server boundaries filter API output, no-store and primary button; publication retains future data',async()=>{
  await published()
  const before=await call('GET','profiles/f14-pagina',undefined,null);expect(before.statusCode).toBe(200);expect(before.headers['cache-control']).toBe('private, no-store');expect(before.body).not.toMatch(/FUTURE-SECRET|private-future|schedule|startsAt/);expect(before.json().nextBoundary).toBe(start)
  const row=await db.profile.findFirstOrThrow({where:{tenantId:tenant}});expect(JSON.stringify(row.publication)).toContain('FUTURE-SECRET')
  now=new Date(start);const visible=await call('GET','profiles/f14-pagina',undefined,null);expect(visible.json().items).toHaveLength(1);expect(visible.body).not.toContain('startsAt');expect(visible.json().nextBoundary).toBe(end)
  now=new Date(end);expect((await call('GET','profiles/f14-pagina',undefined,null)).json().items).toEqual([])
  expect((await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).version).toBe(1)
})
it('F14-T02/PG01 real constraints and API reject invalid windows without changing the draft',async()=>{
  const value=content();await saved(value)
  const invalid={...value,items:value.items.map(item=>({...item,schedule:{...item.schedule!,endsAt:start}}))}
  expect((await call('PATCH','me/profile',{content:invalid,expectedVersion:1})).statusCode).toBe(400)
  expect((await call('GET','me/profile')).json().draft.version).toBe(1)
  await expect(db.profileItem.updateMany({where:{tenantId:tenant},data:{endsAt:new Date(start)}})).rejects.toThrow()
  await expect(db.profileItem.updateMany({where:{tenantId:tenant},data:{timeZone:null}})).rejects.toThrow()
})
it('F14-T03/I02 temporal preview is owner-only and cannot change the public clock or expose content cross-tenant',async()=>{
  await published();const path='me/profile/preview?at='+encodeURIComponent(start)
  expect((await call('GET',path)).json().items).toHaveLength(1)
  expect((await call('GET',path,undefined,null)).statusCode).toBe(401)
  expect((await call('GET',path,undefined,other)).statusCode).toBe(404)
  expect((await call('GET',path,undefined,foreignOwner,foreign)).statusCode).toBe(403)
  expect((await call('GET','profiles/f14-pagina?at='+encodeURIComponent(start),undefined,null)).body).not.toContain('FUTURE-SECRET')
})
it('F14-I03 serializes simultaneous drafts, idempotent repeat and rollback keep publication/history separate',async()=>{
  const value=content();await saved(value);const next={...value,items:value.items.map(item=>({...item,schedule:{...item.schedule!,paused:true}}))}
  const results=await Promise.all([call('PATCH','me/profile',{content:next,expectedVersion:1}),call('PATCH','me/profile',{content:{...next,bio:'Outra edição'},expectedVersion:1})]);expect(results.map(r=>r.statusCode).sort()).toEqual([200,409])
  const state=(await call('GET','me/profile')).json();const {version,...sameContent}=state.draft;expect((await saved(sameContent,version)).draft.version).toBe(version)
  expect(await db.profileRevision.count({where:{tenantId:tenant}})).toBe(0)
  expect((await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).publication).toBeNull()
})
it('F14 capability is checked on the server; expiry preserves content, allows removing a schedule and denies forged edits',async()=>{
  const value=content();await saved(value);await call('POST','me/profile/publish',{expectedVersion:1});now=new Date(start)
  await db.profileSubscription.update({where:{id:subscriptionId},data:{paidThrough:now}})
  expect((await call('GET','profiles/f14-pagina',undefined,null)).json().items).toEqual([])
  const modified={...value,items:value.items.map(item=>({...item,schedule:{...item.schedule!,paused:true}}))}
  expect((await call('PATCH','me/profile',{content:modified,expectedVersion:1})).statusCode).toBe(403)
  expect((await call('GET','me/profile')).json().draft.items[0].schedule).toEqual(value.items[0].schedule)
  const removed={...value,items:value.items.map(item=>({...item,schedule:null}))};expect((await call('PATCH','me/profile',{content:removed,expectedVersion:1})).statusCode).toBe(200)
  expect((await call('POST','me/profile/publish',{expectedVersion:2})).statusCode).toBe(200)
  expect((await call('GET','profiles/f14-pagina',undefined,null)).json().items).toHaveLength(1)
})
it('F14-T04/U04 hiding a button does not disable the linked permanent handle',async()=>{
  const created=await call('POST','me/redirects',{expectedRevision:0,destinationUrl:'https://example.com/evento',label:'Evento',requiresAge:false,requestKey:randomUUID()});expect(created.statusCode,created.body).toBe(200)
  const id=created.json().id,value=content();value.items[0].destination='https://'+tenant+'.test/r/'+id
  await saved(value);expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200)
  now=new Date(end);expect((await call('GET','profiles/f14-pagina',undefined,null)).json().items).toEqual([])
  const resolved=await call('GET','r/'+id,undefined,null);expect(resolved.statusCode).toBe(302);expect(resolved.headers.location).toBe('https://example.com/evento')
  expect((await db.redirectHandle.findUniqueOrThrow({where:{id}})).disabled).toBe(false)
})
it('F14-H01 schedule survives immutable history and explicit draft restoration without republishing',async()=>{
  const first=content();await saved(first);expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200)
  const revision=(await call('GET','me/profile/revisions')).json().revisions[0]
  const ordinary={...first,items:first.items.map(item=>({...item,schedule:null}))};await saved(ordinary,1);expect((await call('POST','me/profile/publish',{expectedVersion:2})).statusCode).toBe(200)
  const restored=await call('POST','me/profile/revisions/'+revision.id+'/restore',{expectedVersion:2});expect(restored.statusCode,restored.body).toBe(200);expect(restored.json().draft.items[0].schedule).toEqual(first.items[0].schedule);expect(restored.json().publishedVersion).toBe(2)
  expect((await call('GET','profiles/f14-pagina',undefined,null)).json().items).toHaveLength(1)
  expect((await call('GET','me/profile/preview')).json().items).toEqual([])
})
