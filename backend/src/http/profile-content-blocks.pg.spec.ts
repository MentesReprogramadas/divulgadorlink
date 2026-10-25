import { randomUUID } from 'node:crypto'
import {decideContentReview} from '@/use-cases/@Moderation/review-public-content'
import { readFileSync } from 'node:fs'
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

beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
  tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();now=new Date('2026-10-17T11:00:00Z')
  for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F11 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
  for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F11 fixture',passwordHash:'fixture',role:'ADMIN',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:now}}}})
  const plan=await db.profilePlan.create({data:{tenantId:tenant,tier:'PRO',title:'Fixture',versions:{create:{version:1,amountCents:1000,providerProductId:'prod_fixture',capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.richBlocks'],providerPriceId:'price_'+tenant.replaceAll('-','')}}},include:{versions:true}})
  const account=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner}})
  const subscription=await db.profileSubscription.create({data:{tenantId:tenant,ownerId:owner,accountId:account.id,planVersionId:plan.versions[0].id,status:'ACTIVE',periodStart:new Date('2026-10-01Z'),periodEnd:new Date('2026-11-01Z'),paidThrough:new Date('2026-11-01Z'),entitlements:{create:{capability:'profile.richBlocks',validFrom:new Date('2026-10-01Z'),validUntil:new Date('2026-11-01Z')}}}})
  subscriptionId=subscription.id
  setProfilesForTest(db,{probe:async()=>200,judge:async()=>({pass:true,confidence:.99,reasons:[]})})
  setRedirectsForTest(db,{probe:async()=>200,judge:async()=>({pass:true,confidence:.99,reasons:[]})})
  setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set([...BASE_PROFILE_CAPABILITIES,'profile.richBlocks'])})
  setProfileClockForTest(()=>now)
})
afterEach(async()=>{setProfileClockForTest(null);setProfileBillingForTest(null,null);await cleanBillingFixture(db,tenant)})
afterAll(async()=>{setProfilesForTest(null);setRedirectsForTest(null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',route:string,body?:unknown,actor:string|null=owner,actorTenant=tenant){return app.inject({method,url:'/api/v1/'+route,headers:{host:tenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:actorTenant,role:'ADMIN',typ:'access'})}:{})},...(body?{payload:body}:{})})}
it('blocos são privados no rascunho, moderados, versionados e cobertos pelo plano; imagens não atravessam contas',async()=>{
 const image=await call('POST','me/profile/avatar',{base64:readFileSync('src/domain/profiles/avatar.fixture.png').toString('base64')})
 expect(image.statusCode,image.body).toBe(200)
 const assetId=image.json().avatarAssetId,group=randomUUID()
 const content:ProfileContent={slug:'blocos-premium',name:'Portfólio',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Contato',visible:true}],items:[{id:randomUUID(),categoryId:group,type:'URL',label:'Site',destination:'https://example.com',visible:true}],contentBlocks:[{id:randomUUID(),type:'TEXT',title:'Serviços',body:'Consultoria',visible:true},{id:randomUUID(),type:'IMAGE',title:'Projeto',assetId,alt:'Projeto finalizado',caption:'Feito à mão',visible:true},{id:randomUUID(),type:'VIDEO',title:'Vídeo',url:'https://youtu.be/dQw4w9WgXcQ',visible:false}]}
 const save=await call('PATCH','me/profile',{expectedVersion:0,content});expect(save.statusCode,save.body).toBe(200);expect(save.json().draft.contentBlocks).toEqual(content.contentBlocks)
 expect((await call('GET','me/profile/avatar/'+assetId,undefined,other)).statusCode).toBe(404)
 expect((await call('GET','profiles/blocos-premium/media/'+assetId,undefined,null)).statusCode).toBe(404)
 expect((await call('GET','me/profile/preview')).json().contentBlocks).toHaveLength(2)
 const published=await call('POST','me/profile/publish',{expectedVersion:1});expect(published.statusCode,published.body).toBe(200)
 expect(published.json().review.status).toBe('PENDING')
 await decideContentReview(db,{tenantId:tenant,ownerId:other},published.json().review.id,'APPROVE',undefined,{probe:async()=>200,judge:async()=>({pass:true,confidence:.99,reasons:[]})})
 expect((await call('GET','profiles/blocos-premium',undefined,null)).json().contentBlocks).toHaveLength(2)
 expect((await call('GET','profiles/blocos-premium/media/'+assetId,undefined,null)).statusCode).toBe(200)
 const revisions=(await call('GET','me/profile/revisions')).json().revisions
 expect(revisions).toHaveLength(1)
 now=new Date('2026-11-02Z')
 expect((await call('GET','profiles/blocos-premium',undefined,null)).json().contentBlocks).toEqual([])
 expect((await call('GET','profiles/blocos-premium/media/'+assetId,undefined,null)).statusCode).toBe(404)
 expect((await call('GET','me/profile')).json().draft.contentBlocks).toHaveLength(3)
 const changed={...content,contentBlocks:content.contentBlocks!.map(block=>({...block,title:'Mudança bloqueada'}))}
 expect((await call('PATCH','me/profile',{expectedVersion:1,content:changed})).statusCode).toBe(403)
 expect((await call('PATCH','me/profile',{expectedVersion:1,content:{...content,contentBlocks:[]}})).statusCode).toBe(200)
 expect((await call('GET','me/profile/avatar/'+assetId)).statusCode).toBe(200)
 expect((await call('POST','me/profile/discard',{expectedVersion:2})).json().draft.contentBlocks).toHaveLength(3)
 await db.profileSubscription.update({where:{id:subscriptionId},data:{status:'CANCELED'}})
 const profile=await db.profile.findFirstOrThrow({where:{tenantId:tenant,ownerId:owner}})
 const transfer=await call('POST','me/agency/transfers',{profileId:profile.id,recipientEmail:other+'@fixture.test',expectedVersion:profile.version,consent:true,requestKey:randomUUID()})
 expect(transfer.statusCode,transfer.body).toBe(200)
 const accepted=await call('POST','me/agency/transfers/'+transfer.json().id+'/accept',{expectedVersion:0,consent:true},other)
 expect(accepted.statusCode,accepted.body).toBe(200)
 expect((await call('GET','me/profile',undefined,other)).json().draft.contentBlocks).toHaveLength(3)
 expect((await call('GET','me/profile/avatar/'+assetId,undefined,other)).statusCode).toBe(200)
})
