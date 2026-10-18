import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setProfileClockForTest} from '@/lib/profile-clock'
import {setProfileBillingForTest} from '@/lib/profile-billing'
import {BASE_PROFILE_CAPABILITIES} from '@/domain/billing/profile-plans'
import {cleanBillingFixture} from '@/test-support/clean-billing-fixture'
import type {ProfileContent} from '@/domain/profiles/profile'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,foreignOwner:string,subscriptionId:string,now:Date
const start='2026-10-18T13:00:00.000Z',end='2026-10-18T14:00:00.000Z'
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();now=new Date('2026-10-18T12:00:00Z')
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F18 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'Pessoa real',passwordHash:'fixture',role:'ADMIN',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:now}}}})
 const plan=await db.profilePlan.create({data:{tenantId:tenant,tier:'PRO',title:'Fixture',versions:{create:{version:1,amountCents:1000,providerProductId:'prod_fixture',capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.scheduling'],providerPriceId:'price_'+tenant.replaceAll('-','')}}},include:{versions:true}})
 const account=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner}}),subscription=await db.profileSubscription.create({data:{tenantId:tenant,ownerId:owner,accountId:account.id,planVersionId:plan.versions[0].id,status:'ACTIVE',periodStart:new Date('2026-10-01Z'),periodEnd:new Date('2026-11-01Z'),paidThrough:new Date('2026-11-01Z'),entitlements:{create:{capability:'profile.scheduling',validFrom:new Date('2026-10-01Z'),validUntil:new Date('2026-11-01Z')}}}});subscriptionId=subscription.id
 setProfilesForTest(db,{probe:async()=>200,judge:async()=>({pass:true,confidence:.99,reasons:[]})});setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set([...BASE_PROFILE_CAPABILITIES,'profile.scheduling'])});setProfileClockForTest(()=>now)
})
afterEach(async()=>{setProfileClockForTest(null);setProfileBillingForTest(null,null);await cleanBillingFixture(db,tenant)})
afterAll(async()=>{setProfilesForTest(null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',route:string,body?:unknown,actor:string|null=null,hostTenant=tenant,age=false){return app.inject({method,url:'/api/v1/'+route,headers:{host:hostTenant+'.test',...(age?{cookie:'age=yes'}:{}),...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:hostTenant,role:'ADMIN',typ:'access'})}:{})},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID(),b=randomUUID();return{slug:'pagina-f18',name:'Página F18',bio:'Identidade fora da busca',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Educação',visible:true},{id:b,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Áudio de curso',destination:'https://example.com/curso',visible:true},{id:randomUUID(),categoryId:b,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true},{id:randomUUID(),categoryId:g,type:'URL',label:'F18-HIDDEN-SECRET',destination:'https://example.com/hidden-secret',visible:false},{id:randomUUID(),categoryId:g,type:'URL',label:'F18-FUTURE-SECRET',destination:'https://example.com/future-secret',visible:true,schedule:{startsAt:start,endsAt:end,timeZone:'UTC',paused:false}}]}}
async function save(value:ProfileContent,expectedVersion=0,actor=owner,host=tenant){const r=await call('PATCH','me/profile',{content:value,expectedVersion},actor,host);expect(r.statusCode,r.body).toBe(200);return r.json()}
async function publish(expectedVersion=1,actor=owner,host=tenant){const r=await call('POST','me/profile/publish',{expectedVersion},actor,host);expect(r.statusCode,r.body).toBe(200)}
async function initial(value=content()){await save(value);await publish();return value}
const search=(query='',host=tenant,age=false)=>call('GET','profiles/pagina-f18/items'+(query?'?'+query:''),undefined,null,host,age)
const stored=()=>db.profile.findFirstOrThrow({where:{tenantId:tenant,ownerId:owner}})
it('F18-T01/I01 only current public items are searchable by title/group; draft, hidden, future, owner identifiers and settings never leak',async()=>{
 const value=await initial(),r=await search('q=audio%20educacao');expect(r.statusCode,r.body).toBe(200);expect(r.json().items.map((item:{label:string})=>item.label)).toEqual(['Áudio de curso']);expect(r.body).not.toMatch(/HIDDEN-SECRET|FUTURE-SECRET|hidden-secret|future-secret|ownerId|tenantId|password|startsAt|schedule/);expect(r.headers['cache-control']).toContain('no-store')
 await save({...value,items:value.items.map((item,index)=>index?item:{...item,label:'F18-DRAFT-SECRET'})},1);expect((await search('q=DRAFT-SECRET')).json().items).toEqual([]);expect((await search('q=audio')).json().items).toHaveLength(1)
 const foreignValue=content();foreignValue.items=foreignValue.items.filter(item=>item.label==='Meu projeto');await save(foreignValue,0,foreignOwner,foreign);await publish(1,foreignOwner,foreign);expect((await search('q=audio',foreign)).json().items).toEqual([])
})
it('F18-U02/T03 filters combine, unknown category stays empty and malformed query/cursor never broadens the search',async()=>{
 const value=await initial();expect((await search('q=audio&categoryId='+value.categories[0].id)).json().items).toHaveLength(1);expect((await search('q=audio&categoryId='+value.categories[1].id)).json().items).toEqual([]);expect((await search('categoryId='+randomUUID())).json().items).toEqual([])
 for(const query of ['q='+('x'.repeat(101)),'categoryId=wrong','at='+start,'ownerId='+owner])expect((await search(query)).statusCode).toBe(400)
 expect((await search('cursor=forged')).statusCode).toBe(422)
})
it('F18-PG01 stable cursor has no repeats and binds host, filters, publication and currently eligible items',async()=>{
 const value=content(),g=value.categories[0].id;value.items=Array.from({length:43},(_,i)=>({id:randomUUID(),categoryId:g,type:'URL',label:'Material '+i,destination:'https://example.org/'+i,visible:true}));value.primaryItemId=value.items[42].id;await initial(value)
 const first=await search();expect(first.statusCode,first.body).toBe(200);expect(first.json().items).toHaveLength(20);expect(first.json().items[0].id).toBe(value.primaryItemId);let cursor=first.json().search.nextCursor;const ids:string[]=first.json().items.map((item:{id:string})=>item.id)
 while(cursor){const r=await search('cursor='+encodeURIComponent(cursor));expect(r.statusCode,r.body).toBe(200);ids.push(...r.json().items.map((item:{id:string})=>item.id));cursor=r.json().search.nextCursor}expect(new Set(ids).size).toBe(43);expect(ids).toHaveLength(43)
 const original=first.json().search.nextCursor;expect((await search('q=Material&cursor='+encodeURIComponent(original))).statusCode).toBe(409)
 const b=content();b.items=b.items.filter(item=>!item.schedule);await save(b,0,foreignOwner,foreign);await publish(1,foreignOwner,foreign);expect((await search('cursor='+encodeURIComponent(original),foreign)).statusCode).toBe(409)
 await save({...value,bio:'Edição publicada'},1);await publish(2);expect((await search('cursor='+encodeURIComponent(original))).statusCode).toBe(409)
})
it('F18-T02 actual server boundaries, paid coverage and owner/age restrictions remain enforced before search metadata',async()=>{
 const value=await initial();expect((await search('q=FUTURE')).json().items).toEqual([]);now=new Date(start);expect((await search('q=FUTURE')).json().items).toHaveLength(1);now=new Date(end);expect((await search('q=FUTURE')).json().items).toEqual([])
 now=new Date(start);await db.profileSubscription.update({where:{id:subscriptionId},data:{paidThrough:now}});expect((await search('q=FUTURE')).json().items).toEqual([])
 await save({...value,requiresAge:true},1);await publish(2);const gate=await search('q=audio');expect(gate.json()).toEqual({restricted:true});expect((await search('q=audio',tenant,true)).json().items).toHaveLength(1)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await search('',tenant,true)).statusCode).toBe(404)
})
it('F18-T04/I03 queries are read-only and publishing an edit updates results while the previous draft remains private',async()=>{
 const value=await initial(),before=await stored(),audit=await db.auditLog.count({where:{tenantId:tenant}});await search('q=audio');await search('q=audio');expect(await stored()).toEqual(before);expect(await db.auditLog.count({where:{tenantId:tenant}})).toBe(audit)
 const changed={...value,items:value.items.map((item,index)=>index?item:{...item,label:'Novo curso publicado'})};await save(changed,1);expect((await search('q=Novo')).json().items).toEqual([]);await publish(2);expect((await search('q=Novo')).json().items).toHaveLength(1);expect((await search('q=audio')).json().items).toEqual([])
})
it('F18 preview is private, scoped to its owner and respects the existing temporal simulation without changing public results',async()=>{
 const value=await initial();await save({...value,items:value.items.map((item,index)=>index?item:{...item,label:'Prévia privada'})},1)
 expect((await call('GET','me/profile/preview/items?q=privada')).statusCode).toBe(401);expect((await call('GET','me/profile/preview/items?q=privada',undefined,other)).statusCode).toBe(404)
 const mine=await call('GET','me/profile/preview/items?q=privada',undefined,owner);expect(mine.statusCode,mine.body).toBe(200);expect(mine.json().items).toHaveLength(1);expect((await search('q=privada')).json().items).toEqual([])
 const future=await call('GET','me/profile/preview/items?q=FUTURE&at='+encodeURIComponent(start),undefined,owner);expect(future.statusCode,future.body).toBe(200);expect(future.json().items).toHaveLength(1);expect((await search('q=FUTURE')).json().items).toEqual([])
})
