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
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();probe.mockClear();judge.mockReset();judge.mockResolvedValue({pass:true,confidence:.99,reasons:[]})
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F34 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F34-PRIVATE-NAME',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 setProfilesForTest(db,{probe,judge});setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set(BASE_PROFILE_CAPABILITIES)})
})
afterEach(async()=>{
 for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.auditLog.deleteMany({where});await db.link.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.config.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}
})
afterAll(async()=>{setProfilesForTest(null);setProfileBillingForTest(null,null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',path:string,body?:unknown,actor:string|null=owner,tokenTenant=tenant,requestTenant=tenant,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:requestTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...headers},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID();return{slug:'pagina-f34',name:'F34-PRIVATE-TITLE',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true}]}}
async function save(value=content(),expectedVersion=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion});expect(r.statusCode,r.body).toBe(200);return value}
const get=()=>call('GET','me/profile/checklist')
const action=(kind='PREVIEW_REQUESTED',expectedVersion=1)=>call('POST','me/profile/checklist/actions',{action:kind,expectedVersion})
async function publish(expectedVersion=1){const r=await call('POST','me/profile/publish',{expectedVersion});expect(r.statusCode,r.body).toBe(200);return r}
const audits=()=>db.auditLog.count({where:{tenantId:tenant,action:{startsWith:'profile.checklist.'}}})
it('F34-T01/T04 a missing profile guides creation and optional fields never become publication requirements',async()=>{
 const empty=await get();expect(empty.statusCode,empty.body).toBe(200);expect(empty.json()).toMatchObject({canPublish:false,profileVersion:0,progress:{completed:1,total:4}})
 await save();const ready=await get();expect(ready.json()).toMatchObject({canPublish:true,progress:{completed:3,total:4},requiresFinalValidation:true});expect(ready.json().steps.filter((step:{required:boolean})=>!step.required).map((step:{id:string})=>step.id)).toEqual(['presentation','preview','share'])
 expect(probe).not.toHaveBeenCalled();expect(judge).not.toHaveBeenCalled();await publish();expect((await get()).json().progress).toEqual({completed:4,total:4});expect(probe).toHaveBeenCalledTimes(1)
})
it('F34-T02/I01 invalid saved destinations use the publication guard and cannot replace the live version',async()=>{
 const value=await save();await publish();await save({...value,items:value.items.map(item=>({...item,destination:'http://127.0.0.1/F34-DESTINATION-SECRET'}))},1)
 const r=await get();expect(r.json()).toMatchObject({profileVersion:2,canPublish:false});expect(r.json().steps.find((step:{id:string})=>step.id==='links')).toMatchObject({state:'PENDING'});expect(r.body).not.toContain('F34-DESTINATION-SECRET')
 expect((await call('POST','me/profile/publish',{expectedVersion:2})).statusCode).toBe(422);expect((await call('GET','profiles/pagina-f34')).body).not.toContain('F34-DESTINATION-SECRET');expect((await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).publishedVersion).toBe(1)
})
it('F34-I02 private state belongs to the session, never a supplied owner ID or an ADMIN cookie',async()=>{
 await save();expect((await call('GET','me/profile/checklist',undefined,null)).statusCode).toBe(401);expect((await call('GET','me/profile/checklist',undefined,null,tenant,tenant,{cookie:'catalogo_role=ADMIN'})).statusCode).toBe(401)
 const own=await call('GET','me/profile/checklist',undefined,other);expect(own.statusCode).toBe(200);expect(own.json().profileVersion).toBe(0);expect(own.body).not.toMatch(/F34-PRIVATE-NAME|F34-PRIVATE-TITLE|password|fixture.test/)
 expect((await call('POST','me/profile/checklist/actions',{action:'PREVIEW_REQUESTED',expectedVersion:1},other)).statusCode).toBe(404)
 expect((await call('GET','me/profile/checklist?ownerId='+owner,undefined,other)).statusCode).toBe(400)
 expect((await call('GET','me/profile/checklist',undefined,owner,tenant,foreign)).statusCode).toBe(403)
 expect((await call('GET','me/profile/checklist',undefined,foreignOwner,foreign,foreign)).json().profileVersion).toBe(0)
 expect((await call('POST','me/profile/checklist/actions',{action:'PREVIEW_REQUESTED',expectedVersion:1,ownerId:owner},other)).statusCode).toBe(400);expect(await audits()).toBe(0)
})
it('F34-I01 account verification and suspension remain enforced even if a client invents completion',async()=>{
 await save();await db.userIdentifier.updateMany({where:{tenantId:tenant,userId:owner},data:{confirmedAt:null}});expect((await get()).json().canPublish).toBe(false);expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(403)
 expect((await call('POST','me/profile/checklist/actions',{action:'PUBLISH',expectedVersion:1,completed:true})).statusCode).toBe(400)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await get()).statusCode).toBe(403);expect((await action()).statusCode).toBe(403);expect(await audits()).toBe(0)
})
it('F34-T03/T05/PG01 requested preview and reported copy are version-bound, concurrent-idempotent actions, not publication or delivery',async()=>{
 const value=await save();expect((await action('LINK_COPIED')).statusCode).toBe(409)
 const responses=await Promise.all(Array.from({length:6},()=>action()));expect(responses.every(r=>r.statusCode===200)).toBe(true);expect(await audits()).toBe(1);expect((await get()).json().steps.find((step:{id:string})=>step.id==='preview')).toMatchObject({state:'REQUESTED'})
 expect((await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).version).toBe(1);expect((await action('PREVIEW_REQUESTED',0)).statusCode).toBe(409)
 await publish();await Promise.all(Array.from({length:6},()=>action('LINK_COPIED')));expect(await audits()).toBe(2);const shared=(await get()).json();expect(shared.steps.find((step:{id:string})=>step.id==='share')).toMatchObject({state:'COMPLETE'});expect(shared.publicPath).toBe('/p/pagina-f34')
 await save({...value,bio:'Uma descrição nova'},1);const changed=(await get()).json();expect(changed.steps.find((step:{id:string})=>step.id==='preview').state).toBe('SUGGESTED');expect(changed.steps.find((step:{id:string})=>step.id==='share').state).toBe('COMPLETE');await publish(2);expect((await get()).json().steps.find((step:{id:string})=>step.id==='share').state).toBe('SUGGESTED')
 expect(JSON.stringify(await db.auditLog.findMany({where:{tenantId:tenant,action:{startsWith:'profile.checklist.'}},select:{after:true}}))).not.toMatch(/example.com|F34-PRIVATE|clipboard|destination/)
})
it('F34-I03 repeated GET is pure and a failed audit transaction leaves no false milestone',async()=>{
 await save();const before=await db.profile.findFirstOrThrow({where:{tenantId:tenant}});await get();await get();expect(await audits()).toBe(0);expect(await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).toEqual(before)
 const suffix=tenant.replaceAll('-',''),fn='f34_reject_'+suffix,trigger='f34_trigger_'+suffix
 await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F34 rollback proof'; END $$`)
 try{await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW."tenantId"='${tenant}') EXECUTE FUNCTION ${fn}()`);expect((await action()).statusCode).toBe(500);expect(await audits()).toBe(0);expect((await get()).json().steps.find((step:{id:string})=>step.id==='preview').state).toBe('SUGGESTED')}
 finally{await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON audit_logs`);await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`)}
 expect((await action()).statusCode).toBe(200);expect(await audits()).toBe(1)
})
it('F34-I01 review statuses are reported faithfully and cannot be bypassed by the checklist',async()=>{
 const value=await save();judge.mockResolvedValueOnce({pass:false,confidence:.3,reasons:['F34 suspicion']});const pending=await publish();expect(pending.json().review.status).toBe('PENDING');expect((await get()).json().steps.find((step:{id:string})=>step.id==='publication').state).toBe('IN_REVIEW')
 await db.contentReview.update({where:{id:pending.json().review.id},data:{status:'REJECTED',reason:'Corrija o texto.',resolvedAt:new Date()}});expect((await get()).json().steps.find((step:{id:string})=>step.id==='publication').state).toBe('REJECTED');expect((await get()).json().canPublish).toBe(false)
 await save({...value,name:'Outro nome válido'},1);expect((await get()).json().canPublish).toBe(true);expect((await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).publishedVersion).toBeNull()
})
it('F34-PG02 catalog references are rechecked against the same current ownership/publication rules',async()=>{
 const network=await db.network.create({data:{tenantId:tenant,name:'Site',slug:'site',knownHosts:[]}}),niche=await db.niche.create({data:{tenantId:tenant,name:'Estudo',slug:'estudo'}}),link=await db.link.create({data:{tenantId:tenant,ownerId:owner,networkId:network.id,nicheId:niche.id,name:'Link',description:'Estudo',canonicalUrl:'https://example.com/catalog-f34',status:'PUBLISHED'}})
 const value=content();value.items[0]={...value.items[0],type:'CATALOG',destination:link.id};await save(value);expect((await get()).json().canPublish).toBe(true);await db.link.update({where:{id:link.id},data:{status:'UNAVAILABLE'}});expect((await get()).json().canPublish).toBe(false);expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(422)
})
it('F34-I02 session-cookie mutations keep the existing CSRF boundary',async()=>{
 await save();const token=app.jwt.sign({sub:owner,tenantId:tenant,role:'USER',typ:'access'}),csrf='c'.repeat(32),cookie='accessToken='+token+'; csrf='+csrf
 expect((await call('POST','me/profile/checklist/actions',{action:'PREVIEW_REQUESTED',expectedVersion:1},null,tenant,tenant,{cookie})).statusCode).toBe(403);expect(await audits()).toBe(0)
 expect((await call('POST','me/profile/checklist/actions',{action:'PREVIEW_REQUESTED',expectedVersion:1},null,tenant,tenant,{cookie,'x-csrf-token':csrf})).statusCode).toBe(200);expect(await audits()).toBe(1)
})
