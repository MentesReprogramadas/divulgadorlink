import {setProfileInteractionsForTest} from '@/http/controllers/@Analytics/profile-interaction'
import {setProfileClockForTest} from '@/lib/profile-clock'
import {cleanBillingFixture} from '@/test-support/clean-billing-fixture'
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
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F15 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F15-PRIVATE-NAME',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 setProfileInteractionsForTest(db);setProfileClockForTest(()=>new Date('2026-10-19T12:00:00Z'));setProfilesForTest(db,{probe,judge});setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set(BASE_PROFILE_CAPABILITIES)})
})
afterEach(async()=>{
 for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.auditLog.deleteMany({where});await db.link.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.config.deleteMany({where});await cleanBillingFixture(db,tenantId);await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}
})
afterAll(async()=>{setProfileInteractionsForTest(null);setProfileClockForTest(null);setProfilesForTest(null);setProfileBillingForTest(null,null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH'|'DELETE',path:string,body?:unknown,actor:string|null=owner,tokenTenant=tenant,requestTenant=tenant,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:requestTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...headers},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID();return{slug:'pagina-f15',name:'F15-PRIVATE-TITLE',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true}]}}
async function save(value=content(),expectedVersion=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion});expect(r.statusCode,r.body).toBe(200);return value}
async function source(){const value=content();value.name='Projetos da Ana';value.items.push({...value.items[0],id:randomUUID(),label:'Segundo projeto',destination:'https://example.com/segundo'});await save(value);expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200);const list=await call('GET','me/profile/revisions');return {value,revisionId:list.json().revisions[0].id as string}}
async function create(slug='campanha-ana'){const src=await source();const input={name:'F15-PRIVATE-CAMPAIGN',slug,sourceRevisionId:src.revisionId,itemSelection:[src.value.items[0].id]};const r=await call('POST','me/profile/campaigns',input);expect(r.statusCode,r.body).toBe(200);return {input,src,row:r.json() as {id:string;version:number;slug:string;publicPath:string}}}
const path=(id:string)=>'me/profile/campaigns/'+id
const publish=(id:string,version=1)=>call('POST',path(id)+'/publish',{expectedVersion:version})
const publicRead=(slug='campanha-ana')=>call('GET','profiles/pagina-f15/campaigns/'+slug,undefined,null)
it('F15-T01/T03/U01 copying and editing a campaign preserves the main profile and freezes copied URLs',async()=>{
 const {input,src,row}=await create(),before=await db.profile.findFirstOrThrow({where:{tenantId:tenant}});judge.mockClear()
 expect((await publish(row.id)).statusCode).toBe(200);expect(judge).not.toHaveBeenCalled();const pub=await publicRead();expect(pub.statusCode,pub.body).toBe(200);expect(pub.headers['cache-control']).toBe('private, no-store');expect(pub.body).not.toContain('F15-PRIVATE-CAMPAIGN');expect(pub.body).not.toMatch(/ownerId|tenantId|passwordHash/);expect(pub.json().items[0].destination).toBe(src.value.items[0].destination)
 const update=await call('PATCH',path(row.id),{name:'Outro nome interno',slug:row.slug,itemSelection:[src.value.items[1].id],expectedVersion:1});expect(update.statusCode,update.body).toBe(200);expect(update.json()).toMatchObject({version:2,changed:true});expect(await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).toEqual(before);expect((await publicRead()).json().items[0].destination).toBe(src.value.items[0].destination)
 expect((await publish(row.id,2)).statusCode).toBe(200);expect((await publicRead()).json().items[0].destination).toBe(src.value.items[1].destination)
 const renamed={...src.value,name:'Página principal atualizada'};await save(renamed,1);expect((await call('POST','me/profile/publish',{expectedVersion:2})).statusCode).toBe(200);expect((await publicRead()).json().name).toBe('Projetos da Ana')
 expect((await call('POST','me/profile/campaigns',{...input,ownerId:other})).statusCode).toBe(400)
})
it('F15-T04/U02 archive withdraws public projection immediately and deleting preserves the main page',async()=>{
 const {row}=await create();await publish(row.id);expect((await call('PATCH',path(row.id),{name:'Nome privado',slug:'outro-endereco',itemSelection:(await call('GET',path(row.id))).json().content.items.map((item:{id:string})=>item.id),expectedVersion:1})).statusCode).toBe(409)
 const archived=await call('POST',path(row.id)+'/archive',{expectedVersion:1});expect(archived.statusCode,archived.body).toBe(200);expect(archived.json()).toMatchObject({state:'ARCHIVED',version:2,publishedVersion:null});expect((await publicRead()).statusCode).toBe(404);expect((await call('GET','profiles/pagina-f15',undefined,null)).statusCode).toBe(200)
 expect((await call('POST',path(row.id)+'/archive',{expectedVersion:1})).statusCode).toBe(200);expect((await call('DELETE',path(row.id),{expectedVersion:2})).statusCode).toBe(200);expect((await call('GET',path(row.id))).statusCode).toBe(404);expect(await db.profile.count({where:{tenantId:tenant}})).toBe(1)
})
it('F15-I02 private campaigns and source snapshots are isolated from ADMIN, other tenants and anonymous sessions',async()=>{
 const {row,input}=await create();await db.profile.create({data:{tenantId:tenant,ownerId:other,slug:'outra-f15',name:'Outra página'}});await db.profile.create({data:{tenantId:foreign,ownerId:foreignOwner,slug:'estrangeira-f15',name:'Outro tenant'}});expect((await call('GET',path(row.id),undefined,null)).statusCode).toBe(401);expect((await call('GET',path(row.id),undefined,other)).statusCode).toBe(404);expect((await call('GET','me/profile/campaigns',undefined,other)).json().campaigns).toEqual([]);expect((await call('POST','me/profile/campaigns',input,other)).statusCode).toBe(404)
 expect((await call('GET',path(row.id),undefined,owner,tenant,foreign)).statusCode).toBe(403);expect((await publicRead()).statusCode).toBe(404);expect((await call('GET',path(row.id)+'/preview',undefined,other)).statusCode).toBe(404)
 expect((await call('PATCH',path(row.id),{name:'Hack',slug:row.slug,itemSelection:input.itemSelection,expectedVersion:1,tenantId:foreign})).statusCode).toBe(400);expect((await call('GET',path(row.id))).json().version).toBe(1)
})
it('F15-I03 repeated creation, publish and CAS edits cannot duplicate campaigns or overwrite a concurrent change',async()=>{
 const {row,input}=await create();const repeated=await Promise.all(Array.from({length:3},()=>call('POST','me/profile/campaigns',input)));expect(repeated.every(r=>r.statusCode===200&&r.json().id===row.id)).toBe(true);expect(await db.campaignPage.count({where:{tenantId:tenant}})).toBe(1)
 await publish(row.id);await publish(row.id);expect(await db.auditLog.count({where:{tenantId:tenant,entityId:row.id,action:'profile.campaign.published'}})).toBe(1)
 const update={name:'Nome novo',slug:row.slug,itemSelection:input.itemSelection,expectedVersion:1};const edits=await Promise.all([call('PATCH',path(row.id),update),call('PATCH',path(row.id),{...update,name:'Concorrente'})]);expect(edits.map(r=>r.statusCode).sort()).toEqual([200,409])
})
it('F15-I01 availability failure keeps the draft and uses the same real destination guard on retry',async()=>{
 const {row}=await create();probe.mockResolvedValueOnce(null as unknown as number);const failed=await publish(row.id);expect(failed.statusCode,failed.body).toBe(503);expect((await call('GET',path(row.id))).json()).toMatchObject({state:'DRAFT',publishedVersion:null});expect((await publicRead()).statusCode).toBe(404);probe.mockResolvedValue(200);expect((await publish(row.id)).statusCode).toBe(200)
})
it('F15-T03/PG01 catalog references remain live, tenant-bound and eligible; principal withdrawal also hides campaigns',async()=>{
 const network=await db.network.create({data:{tenantId:tenant,name:'Site',slug:'site',knownHosts:[]}}),niche=await db.niche.create({data:{tenantId:tenant,name:'Estudo',slug:'estudo'}}),link=await db.link.create({data:{tenantId:tenant,ownerId:owner,networkId:network.id,nicheId:niche.id,name:'Grupo',description:'Estudo',canonicalUrl:'https://example.com/catalog-f15',status:'PUBLISHED'}})
 const value=content();value.items[0]={...value.items[0],type:'CATALOG',destination:link.id};await save(value);await call('POST','me/profile/publish',{expectedVersion:1});const revision=(await call('GET','me/profile/revisions')).json().revisions[0];const row=(await call('POST','me/profile/campaigns',{name:'Campanha',slug:'campanha-ana',sourceRevisionId:revision.id,itemSelection:[value.items[0].id]})).json();expect((await publish(row.id)).statusCode).toBe(200)
 await db.link.update({where:{id:link.id},data:{status:'UNAVAILABLE'}});expect((await publicRead()).json().items).toEqual([]);expect((await publish(row.id)).statusCode).toBe(422)
 await call('POST','me/profile/unpublish',{expectedVersion:1});expect((await publicRead()).statusCode).toBe(404)
})
async function measurement(){
 const plan=await db.profilePlan.create({data:{tenantId:tenant,tier:'PRO',title:'Fixture',versions:{create:{version:1,amountCents:1000,providerProductId:'prod_fixture',capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics'],providerPriceId:'price_'+tenant.replaceAll('-','')}}},include:{versions:true}}),account=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner}})
 await db.profileSubscription.create({data:{tenantId:tenant,ownerId:owner,accountId:account.id,planVersionId:plan.versions[0].id,status:'ACTIVE',periodStart:new Date('2026-10-01Z'),periodEnd:new Date('2026-11-01Z'),paidThrough:new Date('2026-11-01Z'),entitlements:{create:{capability:'profile.analytics',validFrom:new Date('2026-10-01Z'),validUntil:new Date('2026-11-01Z')}}}})
 setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set([...BASE_PROFILE_CAPABILITIES,'profile.analytics'])});expect((await call('PATCH','me/profile/measurement',{enabled:true,expectedVersion:0})).statusCode).toBe(200)
}
it('F15-T02/U03 campaign identity, period, consent, minimum sample and tokens stay separate from principal metrics',async()=>{
 const {row,src}=await create();await publish(row.id);await measurement();const view=(await publicRead()).json(),descriptor=view.measurement,profile=(await call('GET','profiles/pagina-f15',undefined,null)).json();expect(descriptor.campaignId).toBe(row.id)
 const event={eventId:randomUUID(),profileId:descriptor.profileId,revisionId:descriptor.revisionId,kind:'PAGE',blockId:null,viewportBucket:'MOBILE',scrollBucket:null,surfaceToken:descriptor.surfaceToken},route='analytics/profiles/campaigns/'+row.id+'/events',headers={cookie:'tla_profile_measure=v1_yes; analyticsSession='+randomUUID(),'user-agent':'Mozilla/5.0 Safari/605.1'}
 expect((await call('POST','analytics/profiles/events',event,null,tenant,tenant,headers)).statusCode).toBe(422);expect((await call('POST',route,{...event,surfaceToken:profile.measurement.surfaceToken},null,tenant,tenant,headers)).statusCode).toBe(422)
 expect((await call('POST',route,event,null,tenant,tenant,{...headers,cookie:'tla_profile_measure=v1_no'})).json().counted).toBe(false)
 for(let i=0;i<10;i++){const cookie='tla_profile_measure=v1_yes; analyticsSession='+randomUUID(),r=await call('POST',route,{...event,eventId:randomUUID()},null,tenant,tenant,{...headers,cookie});expect(r.statusCode,r.body).toBe(201)}
 const report=await call('GET',path(row.id)+'/interaction?from=2026-10-19&to=2026-10-19');expect(report.statusCode,report.body).toBe(200);expect(report.json()).toMatchObject({campaignId:row.id,range:{from:'2026-10-19',to:'2026-10-19'},summary:{available:true,sessions:10,pageViews:10}})
 expect((await call('GET','me/profile/interaction?from=2026-10-19&to=2026-10-19')).json().summary.sessions).toBe(0)
 await db.profile.create({data:{tenantId:tenant,ownerId:other,slug:'outra-f15',name:'Outra página'}});const ownerSubscription=await db.profileSubscription.findFirstOrThrow({where:{tenantId:tenant,ownerId:owner}}),otherAccount=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:other}})
 await db.profileSubscription.create({data:{tenantId:tenant,ownerId:other,accountId:otherAccount.id,planVersionId:ownerSubscription.planVersionId,status:'ACTIVE',periodStart:new Date('2026-10-01Z'),periodEnd:new Date('2026-11-01Z'),paidThrough:new Date('2026-11-01Z'),entitlements:{create:{capability:'profile.analytics',validFrom:new Date('2026-10-01Z'),validUntil:new Date('2026-11-01Z')}}}})
 expect((await call('GET',path(row.id)+'/interaction',undefined,other)).statusCode).toBe(404);expect(report.body).not.toMatch(/sessionKey|ownerId|tenantId|fixture.test/)
 const click={...event,eventId:randomUUID(),kind:'CLICK',blockId:src.value.items[0].id};const first=await call('POST',route,click,null,tenant,tenant,headers);expect(first.statusCode).toBe(201);expect((await call('POST',route,click,null,tenant,tenant,headers)).json().counted).toBe(false)
 await call('POST',path(row.id)+'/archive',{expectedVersion:1});expect((await call('POST',route,{...event,eventId:randomUUID()},null,tenant,tenant,headers)).statusCode).toBe(409)
})

it('F15-I02 verified publication, active ownership and CSRF are enforced per action',async()=>{
 const {row}=await create();await db.userIdentifier.updateMany({where:{tenantId:tenant,userId:owner},data:{confirmedAt:null}});expect((await publish(row.id)).statusCode).toBe(403);expect((await call('POST',path(row.id)+'/archive',{expectedVersion:1})).statusCode).toBe(200)
 const token=app.jwt.sign({sub:owner,tenantId:tenant,role:'USER',typ:'access'}),csrf='c'.repeat(32),cookie='accessToken='+token+'; csrf='+csrf
 expect((await call('POST',path(row.id)+'/archive',{expectedVersion:2},null,tenant,tenant,{cookie})).statusCode).toBe(403);expect((await call('POST',path(row.id)+'/archive',{expectedVersion:2},null,tenant,tenant,{cookie,'x-csrf-token':csrf})).statusCode).toBe(200)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await call('GET',path(row.id))).statusCode).toBe(403);expect((await publicRead()).statusCode).toBe(404)
})
it('F15-PG01 composite campaign/profile relations reject a different owner',async()=>{
 const {row}=await create(),stored=await db.campaignPage.findUniqueOrThrow({where:{id:row.id}})
 await expect(db.campaignPage.create({data:{tenantId:tenant,ownerId:other,profileId:stored.profileId,name:'Foreign owner',slug:'outra-campanha',sourceRevisionId:stored.sourceRevisionId,sourceVersion:stored.sourceVersion,sourceSnapshot:stored.sourceSnapshot!,content:stored.content!}})).rejects.toThrow()
 expect(await db.campaignPage.count({where:{tenantId:tenant}})).toBe(1)
})
it('F15-I03 a failed campaign persistence transaction leaves the main profile and audit unchanged',async()=>{
 const src=await source(),before=await db.profile.findFirstOrThrow({where:{tenantId:tenant}}),suffix=tenant.replaceAll('-',''),fn='f15_reject_'+suffix,trigger='f15_trigger_'+suffix
 await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F15 rollback'; END $$`)
 try{await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON campaign_pages FOR EACH ROW WHEN (NEW."tenantId"='${tenant}') EXECUTE FUNCTION ${fn}()`);expect((await call('POST','me/profile/campaigns',{name:'Campanha',slug:'campanha-ana',sourceRevisionId:src.revisionId,itemSelection:[src.value.items[0].id]})).statusCode).toBe(500);expect(await db.campaignPage.count({where:{tenantId:tenant}})).toBe(0);expect(await db.auditLog.count({where:{tenantId:tenant,action:{startsWith:'profile.campaign.'}}})).toBe(0);expect(await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).toEqual(before)}finally{await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON campaign_pages`);await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`)}
})

it('F15-T01/T02 renaming a private campaign label keeps the public version and measured identity intact',async()=>{
 const {row,input}=await create();await publish(row.id);const renamed=await call('PATCH',path(row.id),{name:'Outro nome interno',slug:row.slug,itemSelection:input.itemSelection,expectedVersion:1});expect(renamed.statusCode,renamed.body).toBe(200);expect(renamed.json()).toMatchObject({version:2,publishedVersion:1,changed:false});const repeated=await publish(row.id,2);expect(repeated.statusCode,repeated.body).toBe(200);expect(repeated.json().publishedVersion).toBe(1)
})

it('F15-I01 source channels keep their historical adult restriction when copied into ordinary campaign links',async()=>{
 const value=content();value.name='Página de origem';await save(value);const profile=await db.profile.findFirstOrThrow({where:{tenantId:tenant}}),handle=await db.redirectHandle.create({data:{tenantId:tenant,ownerId:owner,creationKey:randomUUID(),creationHash:'a'.repeat(64),version:1}}),destination=await db.redirectDestination.create({data:{handleId:handle.id,tenantId:tenant,number:1,requestKey:randomUUID(),requestHash:'b'.repeat(64),label:'Convite adulto',destinationUrl:value.items[0].destination,requiresAge:true,status:'APPROVED'}})
 await db.redirectHandle.update({where:{id:handle.id},data:{activeRevisionId:destination.id}});await db.profileChannelDraft.create({data:{profileId:profile.id,tenantId:tenant,ownerId:owner,settings:{schemaVersion:1,groups:[{id:value.categories[0].id,channels:[{id:value.items[0].id,networkId:null,handleId:handle.id,revisionId:destination.id,paused:false}]}]}}})
 const original=await call('POST','me/profile/publish',{expectedVersion:1});expect(original.statusCode,original.body).toBe(200);expect((await call('GET','profiles/pagina-f15',undefined,null)).json().restricted).toBe(true)
 const revision=(await call('GET','me/profile/revisions')).json().revisions[0],created=await call('POST','me/profile/campaigns',{name:'Restrita',slug:'campanha-ana',sourceRevisionId:revision.id,itemSelection:[value.items[0].id]});expect(created.statusCode,created.body).toBe(200);expect(created.json().content.requiresAge).toBe(true);judge.mockClear();expect((await publish(created.json().id)).statusCode).toBe(200);expect(judge).not.toHaveBeenCalled();const visitor=await publicRead();expect(visitor.json()).toEqual({restricted:true});expect(visitor.body).not.toContain(value.items[0].destination)
 const adult=await call('GET','profiles/pagina-f15/campaigns/campanha-ana',undefined,null,tenant,tenant,{cookie:'age=yes'});expect(adult.statusCode,adult.body).toBe(200);expect(adult.json().items[0].destination).toBe(value.items[0].destination);expect(adult.body).not.toMatch(/handleId|destinationRevisionId|profile-channel/)
})

it('F15-PG02 reversible SQL quarantine protects the old F31 reader without losing campaign facts',async()=>{
 const {row}=await create();await publish(row.id);await measurement();const campaign=(await publicRead()).json().measurement,main=(await call('GET','profiles/pagina-f15',undefined,null)).json().measurement
 for(const descriptor of [main,campaign,campaign]){const route=descriptor.campaignId?'analytics/profiles/campaigns/'+row.id+'/events':'analytics/profiles/events',body={eventId:randomUUID(),profileId:descriptor.profileId,revisionId:descriptor.revisionId,kind:'PAGE',blockId:null,viewportBucket:'MOBILE',scrollBucket:null,surfaceToken:descriptor.surfaceToken};expect((await call('POST',route,body,null,tenant,tenant,{cookie:'tla_profile_measure=v1_yes; analyticsSession='+randomUUID(),'user-agent':'Mozilla/5.0 Safari/605.1'})).statusCode).toBe(201)}
 await call('POST',path(row.id)+'/archive',{expectedVersion:1})
 const profile=await db.profile.findFirstOrThrow({where:{tenantId:tenant}})
 await db.$transaction(async tx=>{
  const legacy=()=>tx.profileInteractionEvent.count({where:{tenantId:tenant,profileId:profile.id,revisionId:1,kind:'PAGE'}})
  expect(await legacy()).toBe(3)
  await tx.$executeRaw`CREATE TEMP TABLE f15_event_quarantine ON COMMIT DROP AS SELECT * FROM profile_interaction_events WHERE "tenantId"=${tenant} AND "campaignId"=${row.id}`
  expect((await tx.$queryRaw<Array<{count:bigint}>>`SELECT count(*)::bigint FROM f15_event_quarantine`)[0].count).toBe(2n)
  await tx.profileInteractionEvent.deleteMany({where:{tenantId:tenant,campaignId:row.id}});expect(await legacy()).toBe(1)
  await tx.$executeRaw`INSERT INTO profile_interaction_events SELECT * FROM f15_event_quarantine`;expect(await legacy()).toBe(3)
 })
 expect(await db.profileInteractionEvent.count({where:{tenantId:tenant,campaignId:row.id}})).toBe(2);expect((await call('GET','me/profile/interaction?from=2026-10-19&to=2026-10-19')).json().summary.sessions).toBe(1);expect((await call('GET',path(row.id)+'/interaction?from=2026-10-19&to=2026-10-19')).json().summary.sessions).toBe(2)
 expect((await publicRead()).statusCode).toBe(404)
})
