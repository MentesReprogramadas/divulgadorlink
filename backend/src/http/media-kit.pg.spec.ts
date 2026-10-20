import {setProfileClockForTest} from '@/lib/profile-clock'
import {PrismaPromotionPerformanceRepository} from '@/repositories/promotion-performance-repository'
import {emptyMediaKit,type MediaKitContent} from '@/domain/profiles/media-kit'
import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setProfileBillingForTest} from '@/lib/profile-billing'
import {BASE_PROFILE_CAPABILITIES} from '@/domain/billing/profile-plans'
import type {ProfileContent} from '@/domain/profiles/profile'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,foreignOwner:string
const probe=vi.fn(async()=>200),judge=vi.fn(async()=>({pass:true,confidence:.99,reasons:[] as string[]}))
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{setProfileClockForTest(()=>new Date('2026-10-19T12:00:00Z'));
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();probe.mockClear();judge.mockReset();judge.mockResolvedValue({pass:true,confidence:.99,reasons:[]})
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F38 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F38-PRIVATE-NAME',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 setProfilesForTest(db,{probe,judge});setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set(BASE_PROFILE_CAPABILITIES)})
})
afterEach(async()=>{
 for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.auditLog.deleteMany({where});await db.analyticsEvent.deleteMany({where});await db.link.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.config.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}
})
afterAll(async()=>{setProfileClockForTest(null);setProfilesForTest(null);setProfileBillingForTest(null,null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH'|'DELETE',path:string,body?:unknown,actor:string|null=owner,tokenTenant=tenant,requestTenant=tenant,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:requestTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...headers},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID();return{slug:'pagina-f38',name:'F38-PRIVATE-TITLE',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true}]}}
async function save(value=content(),expectedVersion=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion});expect(r.statusCode,r.body).toBe(200);return value}

async function setup(){await save();expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200);const network=await db.network.create({data:{tenantId:tenant,name:'Instagram',slug:'instagram',knownHosts:['example.com']}}),niche=await db.niche.create({data:{tenantId:tenant,name:'Ciência',slug:'ciencia'}}),link=await db.link.create({data:{tenantId:tenant,ownerId:owner,name:'Projeto publicado',description:'Projeto seguro',canonicalUrl:'https://example.com/kit',networkId:network.id,nicheId:niche.id,status:'PUBLISHED'}});const contact=await db.userIdentifier.findFirstOrThrow({where:{tenantId:tenant,userId:owner,kind:'EMAIL'}});return {link,contact}}
async function configure(content:MediaKitContent=emptyMediaKit(),version=0){const r=await call('PATCH','me/profile/media-kit',{content,expectedVersion:version});expect(r.statusCode,r.body).toBe(200);return r.json()}
const publish=(version=1)=>call('POST','me/profile/media-kit/publish',{expectedVersion:version})
const publicKit=(age=false)=>call('GET','profiles/pagina-f38/media-kit',undefined,null,tenant,tenant,age?{cookie:'age=yes'}:{})
it('F21-T01/T02/T03/I01 real F01 aggregates, informed metrics and allowlist preserve source/period',async()=>{
 const {link,contact}=await setup(),content={...emptyMediaKit(),publicFields:{showBio:true,showPhoto:true,contactIds:[contact.id]},metricSelections:[{linkId:link.id,metric:'CLICKS' as const,from:'2026-10-18',to:'2026-10-18'},{linkId:link.id,metric:'CTR' as const,from:'2026-10-18',to:'2026-10-18'}],manualMetrics:[{platform:'INSTAGRAM' as const,value:1234,asOf:'2026-10-17'}]};await configure(content)
 const at=new Date('2026-10-18T15:00Z');await db.analyticsEvent.createMany({data:[...Array.from({length:10},()=>({id:randomUUID(),tenantId:tenant,sessionId:randomUUID(),linkId:link.id,surface:'HOME',day:new Date('2026-10-18T00:00Z'),kind:'IMPRESSION',createdAt:at})),...Array.from({length:2},()=>({id:randomUUID(),tenantId:tenant,sessionId:randomUUID(),linkId:link.id,surface:'HOME',day:new Date('2026-10-18T00:00Z'),kind:'CLICK',createdAt:at}))]})
 expect((await publish()).statusCode).toBe(200);const r=await publicKit();expect(r.statusCode,r.body).toBe(200);expect(r.headers['cache-control']).toBe('private, no-store');expect(r.json().metrics.map((m:{value:number})=>m.value)).toEqual([2,20]);expect(r.json().metrics[0]).toMatchObject({source:'MEASURED',period:{from:'2026-10-18',to:'2026-10-18'},updatedAt:'2026-10-19T12:00:00.000Z',coverage:'COMPLETE'});expect(r.json().manualMetrics[0]).toMatchObject({source:'INFORMED',value:1234});expect(r.body).not.toMatch(/sessionId|tenantId|ownerId|investmentCents|cpcCents|tokenHash|passwordHash|requestKey/);expect(r.json().metrics[0].label).toBe('Cliques')
})
it('F21-T04/U03 withdrawal of selected fields or confirmed contact immediately reduces public projection',async()=>{
 const {contact}=await setup(),content={...emptyMediaKit(),publicFields:{showBio:true,showPhoto:true,contactIds:[contact.id]}};await configure(content);await publish();expect((await publicKit()).json().contacts).toHaveLength(1)
 await configure({...content,publicFields:{showBio:false,showPhoto:false,contactIds:[]}},1);let visible=(await publicKit()).json();expect(visible.contacts).toEqual([]);expect(visible.presentation.bio).toBe('');expect(visible.presentation.avatarAssetId).toBeNull()
 await configure(content,2);expect((await publish(3)).statusCode).toBe(200);await db.userIdentifier.update({where:{id:contact.id},data:{confirmedAt:null}});visible=(await publicKit()).json();expect(visible.contacts).toEqual([]);expect(JSON.stringify(visible)).not.toContain(contact.normalizedValue)
})
it('F21-U02/I01 unavailable coverage is null, report failure returns retryable 503 without fabricated zeros',async()=>{
 const {link}=await setup();await configure({...emptyMediaKit(),metricSelections:[{linkId:link.id,metric:'CLICKS',from:'2020-01-01',to:'2020-01-02'}]});await publish();const r=await publicKit();expect(r.json().metrics[0]).toMatchObject({value:null,coverage:'UNAVAILABLE',source:'MEASURED'})
 const fault=vi.spyOn(PrismaPromotionPerformanceRepository.prototype,'read').mockRejectedValueOnce(new Error('upstream unavailable'));try{const failed=await publicKit();expect(failed.statusCode).toBe(503);expect(failed.body).not.toContain('"value":0')}finally{fault.mockRestore()}
})
it('F21-I02 own, foreign tenant, anonymous and collaborator never gain ownership by selector or ADMIN role',async()=>{
 await setup();await configure();expect((await publicKit()).statusCode).toBe(404);expect((await call('GET','me/profile/media-kit',undefined,null)).statusCode).toBe(401);expect((await call('GET','me/profile/media-kit',undefined,other)).statusCode).toBe(404);expect((await call('GET','me/profile/media-kit',undefined,foreignOwner,foreign,foreign)).statusCode).toBe(404)
 const p=await db.profile.findUniqueOrThrow({where:{tenantId_ownerId:{tenantId:tenant,ownerId:owner}}});await db.profileMembership.create({data:{profileId:p.id,tenantId:tenant,ownerId:owner,userId:other,role:'EDITOR'}})
 expect((await call('GET','me/profile/media-kit',undefined,other,tenant,tenant,{'x-profile-id':p.id})).statusCode).toBe(403)
 const before=await db.mediaKitConfig.findUniqueOrThrow({where:{profileId:p.id}});expect((await call('PATCH','me/profile/media-kit',{content:emptyMediaKit(),expectedVersion:1},other)).statusCode).toBe(404);expect((await db.mediaKitConfig.findUniqueOrThrow({where:{profileId:p.id}})).version).toBe(before.version)
})
it('F21-T04 foreign/unpublished links or identifiers are rejected even for ADMIN',async()=>{
 const {link}=await setup(),otherContact=await db.userIdentifier.findFirstOrThrow({where:{userId:other}});let r=await call('PATCH','me/profile/media-kit',{content:{...emptyMediaKit(),publicFields:{showBio:true,showPhoto:true,contactIds:[otherContact.id]}},expectedVersion:0});expect(r.statusCode).toBe(422)
 await db.link.update({where:{id:link.id},data:{ownerId:other}});r=await call('PATCH','me/profile/media-kit',{content:{...emptyMediaKit(),metricSelections:[{linkId:link.id,metric:'CLICKS',from:'2026-10-18',to:'2026-10-18'}]},expectedVersion:0});expect(r.statusCode).toBe(422)
 expect((await db.mediaKitConfig.count({where:{tenantId:tenant}}))).toBe(0)
})
it('F21-I03 CAS/idempotence, profile withdrawal and re-publication preserve independent approved snapshot',async()=>{
 const value=await save();expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200);await configure();expect((await publish()).statusCode).toBe(200);expect((await publish()).statusCode).toBe(200);expect(await db.auditLog.count({where:{tenantId:tenant,action:'media-kit.published'}})).toBe(1)
 expect((await call('PATCH','me/profile/media-kit',{content:{...emptyMediaKit(),publicFields:{showBio:false,showPhoto:true,contactIds:[]}},expectedVersion:0})).statusCode).toBe(409)
 await save({...value,bio:'NOVA BIO PRIVADA'},1);expect((await publicKit()).body).not.toContain('NOVA BIO PRIVADA');expect((await call('POST','me/profile/unpublish',{expectedVersion:2})).statusCode).toBe(200);expect((await publicKit()).statusCode).toBe(404)
})
it('F21-T04/PG01 adult selection stays gated and tenant-composite config FK rejects foreign owner',async()=>{
 const {link}=await setup();await db.network.update({where:{id:link.networkId},data:{requiresAge:true}});await configure({...emptyMediaKit(),metricSelections:[{linkId:link.id,metric:'CLICKS',from:'2026-10-18',to:'2026-10-18'}]});await publish();expect((await publicKit()).json()).toEqual({restricted:true});expect((await publicKit(true)).json().restricted).toBe(false)
 const p=await db.profile.findUniqueOrThrow({where:{tenantId_ownerId:{tenantId:tenant,ownerId:owner}}});await db.mediaKitConfig.delete({where:{profileId:p.id}});await expect(db.mediaKitConfig.create({data:{profileId:p.id,tenantId:foreign,ownerId:foreignOwner,draft:emptyMediaKit()}})).rejects.toThrow()
})
it('F21-I03 failed persistence rolls back configuration and audit; retry succeeds',async()=>{
 await setup();await db.$executeRawUnsafe(`CREATE FUNCTION f21_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F21 fault'; END $$`);await db.$executeRawUnsafe(`CREATE TRIGGER f21_failure BEFORE INSERT ON media_kit_configs FOR EACH ROW EXECUTE FUNCTION f21_fail()`)
 try{expect((await call('PATCH','me/profile/media-kit',{content:emptyMediaKit(),expectedVersion:0})).statusCode).toBe(500);expect(await db.mediaKitConfig.count({where:{tenantId:tenant}})).toBe(0);expect(await db.auditLog.count({where:{tenantId:tenant,action:'media-kit.saved'}})).toBe(0)}finally{await db.$executeRawUnsafe('DROP TRIGGER f21_failure ON media_kit_configs');await db.$executeRawUnsafe('DROP FUNCTION f21_fail()')};await configure()
})

it('F21-U01/T04 invalid manual numbers/dates and unconfirmed publisher fail without publication',async()=>{
 await setup();for(const manual of [{platform:'INSTAGRAM',value:-1,asOf:'2026-10-18'},{platform:'INSTAGRAM',value:4.5,asOf:'2026-10-18'},{platform:'INSTAGRAM',value:1,asOf:'2026-02-31'},{platform:'INSTAGRAM',value:1,asOf:'2027-01-01'}]){const r=await call('PATCH','me/profile/media-kit',{content:{...emptyMediaKit(),manualMetrics:[manual]},expectedVersion:0});expect([400,422]).toContain(r.statusCode)}
 await configure();await db.userIdentifier.updateMany({where:{userId:owner},data:{confirmedAt:null}});expect((await publish()).statusCode).toBe(403);expect((await publicKit()).statusCode).toBe(404)
})
