import {setWorkspaceDbForTest} from '@/http/workspace-access'
import {randomUUID} from 'node:crypto'
import {Prisma,PrismaClient} from '@prisma/client'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setProfileInteractionsForTest} from '@/http/controllers/@Analytics/profile-interaction'
import {setProfileClockForTest} from '@/lib/profile-clock'
import {setProfileBillingForTest} from '@/lib/profile-billing'
import {BASE_PROFILE_CAPABILITIES} from '@/domain/billing/profile-plans'
import {cleanBillingFixture} from '@/test-support/clean-billing-fixture'
import {purgeProfileInteractions} from '@/repositories/profile-interactions'
import {summarizeProfileInteraction,type InteractionEvent} from '@/domain/analytics/profile-interaction'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,owner:string,other:string,profileId:string,block:string,hidden:string,subscriptionId:string
const now=new Date('2026-10-18T12:00:00Z')
beforeAll(async()=>{setWorkspaceDbForTest(db);setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
 tenant=randomUUID();owner=randomUUID();other=randomUUID();profileId=randomUUID();block=randomUUID();hidden=randomUUID()
 await db.tenant.create({data:{id:tenant,host:tenant+'.test',name:'F31 fixture'}})
 for(const id of [owner,other])await db.user.create({data:{id,tenantId:tenant,name:'Pessoa',passwordHash:'fixture',role:'ADMIN',identifiers:{create:{tenantId:tenant,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:now}}}})
 const category=randomUUID(),snapshot={slug:'pagina-f31',name:'Minha página',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:category,name:'Projetos',visible:true}],items:[{id:block,categoryId:category,type:'URL',label:'Meu projeto',destination:'https://example.org/projeto',visible:true},{id:hidden,categoryId:category,type:'URL',label:'Segredo',destination:'https://example.org/segredo',visible:false}]}
 await db.profile.create({data:{id:profileId,tenantId:tenant,ownerId:owner,slug:snapshot.slug,name:snapshot.name,publication:snapshot,version:1,publishedVersion:1}})
 await db.profileRevision.create({data:{tenantId:tenant,ownerId:owner,profileId,version:1,snapshot}})
 const plan=await db.profilePlan.create({data:{tenantId:tenant,tier:'PRO',title:'Fixture',versions:{create:{version:1,amountCents:1000,providerProductId:'prod_fixture',capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics'],providerPriceId:'price_'+tenant.replaceAll('-','')}}},include:{versions:true}})
 const account=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner}}),subscription=await db.profileSubscription.create({data:{tenantId:tenant,ownerId:owner,accountId:account.id,planVersionId:plan.versions[0].id,status:'ACTIVE',periodStart:new Date('2026-10-01Z'),periodEnd:new Date('2026-11-01Z'),paidThrough:new Date('2026-11-01Z'),entitlements:{create:{capability:'profile.analytics',validFrom:new Date('2026-10-01Z'),validUntil:new Date('2026-11-01Z')}}}});subscriptionId=subscription.id
 setProfilesForTest(db);setProfileInteractionsForTest(db);setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set([...BASE_PROFILE_CAPABILITIES,'profile.analytics'])});setProfileClockForTest(()=>now)
})
afterEach(async()=>{setProfileClockForTest(null);setProfileBillingForTest(null,null);await db.profile.deleteMany({where:{tenantId:tenant}});await db.auditLog.deleteMany({where:{tenantId:tenant}});await cleanBillingFixture(db,tenant);await db.userIdentifier.deleteMany({where:{tenantId:tenant}});await db.user.deleteMany({where:{tenantId:tenant}});await db.tenant.delete({where:{id:tenant}})})
afterAll(async()=>{setWorkspaceDbForTest(null);setProfilesForTest(null);setProfileInteractionsForTest(null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',route:string,body?:unknown,actor:string|null=null,extra:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+route,headers:{host:tenant+'.test','user-agent':'Mozilla/5.0 Safari/605.1',cookie:'tla_profile_measure=v1_yes; analyticsSession=12345678-1234-4234-8234-123456789abc',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tenant,role:'ADMIN',typ:'access'})}:{}),...extra},...(body?{payload:body}:{})})}
const preference=(enabled=true,expectedVersion=0)=>call('PATCH','me/profile/measurement',{enabled,expectedVersion},owner)
async function descriptor(){await preference();const r=await call('GET','profiles/pagina-f31');expect(r.statusCode,r.body).toBe(200);return r.json().measurement as {surfaceToken:string}}
function event(token:string,kind='PAGE',blockId:string|null=null,patch:Record<string,unknown>={}){return {eventId:randomUUID(),profileId,revisionId:1,kind,blockId,viewportBucket:'MOBILE',scrollBucket:null,surfaceToken:token,...patch}}
const report=(query='')=>call('GET','me/profile/interaction'+query,undefined,owner)
it('F31-T03 default off; verified own preference is versioned, audited and tenant-private',async()=>{
 expect((await call('GET','profiles/pagina-f31')).json().measurement).toBeUndefined()
 expect((await call('GET','me/profile/measurement',undefined,owner)).json()).toEqual({enabled:false,version:0,allowed:true})
 expect((await call('PATCH','me/profile/measurement',{enabled:true,expectedVersion:0})).statusCode).toBe(401)
 expect((await call('PATCH','me/profile/measurement',{enabled:true,expectedVersion:0},other)).statusCode).toBe(404)
 const concurrent=await Promise.all([preference(),preference()]);expect(concurrent.map(r=>r.statusCode).sort()).toEqual([200,409])
 expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.measurement.changed'}})).toBe(1)
 expect((await call('GET','me/profile/preview',undefined,owner)).json().measurement).toBeUndefined()
 await preference(false,1);expect((await call('GET','profiles/pagina-f31')).json().measurement).toBeUndefined()
})
it('F31-T02 consent, automation, owner/admin/support exclusions do not persist or mint identifiers',async()=>{
 const {surfaceToken}=await descriptor(),body=event(surfaceToken)
 const excludedHeaders:Record<string,string>[]=[{cookie:''},{cookie:'tla_consent=marketing'},{dnt:'1'},{'sec-gpc':'1'},{'user-agent':'Googlebot'},{'x-test-traffic':'1'}]
 for(const headers of excludedHeaders){const r=await call('POST','analytics/profiles/events',body,null,headers);expect(r.statusCode,r.body).toBe(200);expect(r.json().counted).toBe(false);expect(r.headers['set-cookie']).toBeUndefined()}
 expect((await call('POST','analytics/profiles/events',body,owner)).json().counted).toBe(false)
 expect((await call('POST','analytics/profiles/events',body,other)).json().counted).toBe(false)
 expect(await db.profileInteractionEvent.count({where:{tenantId:tenant}})).toBe(0)
 expect((await call('POST','analytics/profiles/events',{...body,email:'secret@example.org'})).statusCode).toBe(400)
})
it('F31-I01/I02 binds token, current publication and only currently eligible blocks',async()=>{
 const {surfaceToken}=await descriptor()
 for(const patch of [{surfaceToken:surfaceToken+'x'},{revisionId:2},{profileId:randomUUID()},{blockId:hidden,kind:'CLICK'}])expect((await call('POST','analytics/profiles/events',event(surfaceToken,'PAGE',null,patch))).statusCode).toBe(422)
 const body=event(surfaceToken);await db.profile.update({where:{id:profileId},data:{version:2,publishedVersion:2}});expect((await call('POST','analytics/profiles/events',body)).statusCode).toBe(409)
 await db.profile.update({where:{id:profileId},data:{publishedVersion:1}});await db.profileSubscription.update({where:{id:subscriptionId},data:{paidThrough:now}});expect((await call('POST','analytics/profiles/events',body)).json().counted).toBe(false);expect((await report()).statusCode).toBe(403)
 expect((await preference(false,1)).json()).toEqual({allowed:false,enabled:false,version:2})
})
it('F31-PG01 concurrent retries and repeated semantic interactions count once; conflicting IDs cannot replace facts',async()=>{
 const {surfaceToken}=await descriptor(),body=event(surfaceToken)
 const same=await Promise.all(Array.from({length:8},()=>call('POST','analytics/profiles/events',body)));expect(same.filter(r=>r.json().counted)).toHaveLength(1)
 const semantic=await Promise.all(Array.from({length:8},()=>call('POST','analytics/profiles/events',event(surfaceToken))));expect(semantic.every(r=>!r.json().counted)).toBe(true)
 expect((await call('POST','analytics/profiles/events',{...body,viewportBucket:'DESKTOP'})).statusCode).toBe(409)
 expect(await db.profileInteractionEvent.count({where:{tenantId:tenant}})).toBe(1)
})
it('F31-T01/T04/T05 SQL aggregation matches the domain oracle and separates revision/viewport; scroll never becomes a click or reading claim',async()=>{
 const {surfaceToken}=await descriptor();expect((await report()).json().summary.pageViews).toBeNull()
 for(let i=0;i<10;i++){
  const headers={cookie:'tla_profile_measure=v1_yes; analyticsSession='+randomUUID()}
  for(const body of [event(surfaceToken),event(surfaceToken,'IMPRESSION',block),...(i<3?[event(surfaceToken,'CLICK',block)]:[]),event(surfaceToken,'SCROLL',null,{scrollBucket:i<5?100:50})]){const r=await call('POST','analytics/profiles/events',body,null,headers);expect(r.statusCode,r.body).toBe(201)}
 }
 const r=await report('?viewport=MOBILE&revision=1');expect(r.statusCode,r.body).toBe(200);const summary=r.json().summary
 expect(summary).toMatchObject({available:true,sessions:10,pageViews:10,blocks:[{id:block,impressions:10,clicks:3,ctr:30}],scrollBuckets:[{reached:10},{reached:10},{reached:5},{reached:5}]})
 expect(summary.blocks).toHaveLength(1)
 const raw=await db.profileInteractionEvent.findMany({where:{profileId}}),oracle=summarizeProfileInteraction(raw.map(row=>({...row,day:row.day.toISOString().slice(0,10)})) as InteractionEvent[],[{id:block,label:'Meu projeto'}],{revisionId:1,viewportBucket:'MOBILE'})
 expect(summary).toEqual(oracle);expect((await report('?viewport=DESKTOP')).json().summary.pageViews).toBeNull()
 expect((await report('?revision=99')).statusCode).toBe(404);expect((await report('?from=2020-01-01')).statusCode).toBe(422)
 expect(JSON.stringify(raw)).not.toMatch(/example.org|Mozilla|analyticsSession|surfaceToken|destination/)
 const previous=await db.profile.findUniqueOrThrow({where:{id:profileId}})
 await db.profile.update({where:{id:profileId},data:{version:2,publishedVersion:2}})
 await db.profileRevision.create({data:{tenantId:tenant,ownerId:owner,profileId,version:2,snapshot:previous.publication!}})
 const published=(await call('GET','profiles/pagina-f31')).json().measurement
 expect((await call('POST','analytics/profiles/events',event(published.surfaceToken,'PAGE',null,{revisionId:2}))).statusCode).toBe(201)
 expect((await report('?revision=1&viewport=MOBILE')).json().summary.pageViews).toBe(10)
 expect((await report('?revision=2&viewport=MOBILE')).json().summary).toMatchObject({available:false,sessions:1,pageViews:null})
})
it('F31-PG02 preference audit failure rolls back and retention removes expired facts at the strict boundary',async()=>{
 await db.$executeRawUnsafe(`CREATE FUNCTION f31_reject_${tenant.replaceAll('-','')}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F31 rollback proof'; END $$`)
 const functionName='f31_reject_'+tenant.replaceAll('-',''),trigger='f31_trigger_'+tenant.replaceAll('-','')
 try{
  await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW."tenantId"='${tenant}') EXECUTE FUNCTION ${functionName}()`)
  expect((await preference()).statusCode).toBe(500);expect(await db.profileMeasurement.findUnique({where:{profileId}})).toBeNull()
 }finally{await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON audit_logs`);await db.$executeRawUnsafe(`DROP FUNCTION ${functionName}()`)}
 const {surfaceToken}=await descriptor();await call('POST','analytics/profiles/events',event(surfaceToken))
 const boundary=new Date(+now-180*86400000);await db.profileInteractionEvent.updateMany({where:{profileId},data:{createdAt:boundary}})
 expect((await purgeProfileInteractions(db,now)).count).toBe(0);expect((await purgeProfileInteractions(db,new Date(+now+1))).count).toBe(1)
})
it('F31-I03 a database failure persists no event and the same event ID can succeed on retry',async()=>{
 const {surfaceToken}=await descriptor(),body=event(surfaceToken),suffix=tenant.replaceAll('-',''),fn='f31_event_reject_'+suffix,trigger='f31_event_trigger_'+suffix
 await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F31 event rollback'; END $$`)
 try{
  await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON profile_interaction_events FOR EACH ROW WHEN (NEW."tenantId"='${tenant}') EXECUTE FUNCTION ${fn}()`)
  expect((await call('POST','analytics/profiles/events',body)).statusCode).toBe(500);expect(await db.profileInteractionEvent.count({where:{profileId}})).toBe(0)
 }finally{await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON profile_interaction_events`);await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`)}
 expect((await call('POST','analytics/profiles/events',body)).statusCode).toBe(201);expect(await db.profileInteractionEvent.count({where:{profileId}})).toBe(1)
})
it('F31-PG03 schema rejects forged ownership, malformed reach and kinds even outside HTTP',async()=>{
 const {surfaceToken}=await descriptor();await call('POST','analytics/profiles/events',event(surfaceToken))
 const row=await db.profileInteractionEvent.findFirstOrThrow({where:{profileId}})
 for(const patch of [{ownerId:other},{tenantId:randomUUID()},{kind:'INPUT'},{kind:'SCROLL',scrollBucket:null},{viewportBucket:'390x844'},{blockId:block}]){
  await expect(db.profileInteractionEvent.create({data:{...row,id:randomUUID(),eventId:randomUUID(),dedupeKey:randomUUID().replaceAll('-','').repeat(2),...patch}})).rejects.toThrow()
 }
 expect(await db.profileInteractionEvent.count({where:{profileId}})).toBe(1)
})
it('F31-I02 another host cannot collect or read this tenant; age-restricted content remains unmeasured before confirmation',async()=>{
 const {surfaceToken}=await descriptor(),foreign=randomUUID(),body=event(surfaceToken)
 await db.tenant.create({data:{id:foreign,host:foreign+'.test',name:'Foreign F31'}})
 try{
  expect((await call('POST','analytics/profiles/events',body,null,{host:foreign+'.test'})).statusCode).toBe(422)
  expect((await call('GET','me/profile/interaction',undefined,owner,{host:foreign+'.test'})).statusCode).toBe(403)
 }finally{await db.tenant.delete({where:{id:foreign}})}
 const p=await db.profile.findUniqueOrThrow({where:{id:profileId}})
 await db.profile.update({where:{id:profileId},data:{publication:{...(p.publication as Record<string,Prisma.InputJsonValue>),requiresAge:true}}})
 expect((await call('POST','analytics/profiles/events',body)).json().counted).toBe(false)
 expect((await call('POST','analytics/profiles/events',body,null,{cookie:'tla_profile_measure=v1_yes; analyticsSession=12345678-1234-4234-8234-123456789abc; age=yes'})).statusCode).toBe(201)
 expect(await db.profileInteractionEvent.count({where:{profileId}})).toBe(1)
})




async function prepareButtonTest(){
 await preference();const p=await db.profile.findUniqueOrThrow({where:{id:profileId}}),snapshot=p.publication as Prisma.JsonObject
 const config={blockId:block,labels:['Conhecer projeto','Explorar agora'],samplePerVariant:100,durationDays:7}
 await db.profile.update({where:{id:profileId},data:{publishedDraft:{...snapshot,buttonTest:config}}})
 const response=await call('POST','me/profile/button-tests/start',{expectedVersion:1},owner);expect(response.statusCode,response.body).toBe(200)
 const assignment=await call('POST','profiles/pagina-f31/button-test/assignment',{});expect(assignment.statusCode,assignment.body).toBe(200);const value=assignment.json().assignment;expect(value).toMatchObject({blockId:block,revisionId:1});const token=(await call('GET','profiles/pagina-f31')).json().measurement.surfaceToken
 return{...value,surfaceToken:token}
}
function buttonEvent(assignment:Record<string,unknown>,kind='EXPOSURE'){return{id:assignment.id,variant:assignment.variant,revisionId:assignment.revisionId,surfaceToken:assignment.surfaceToken,kind}}
it('F26-PG01/T01/T02/U03 atribuição estável, dedupe e clique somente após exposição; relatório não elege cedo',async()=>{
 const assignment=await prepareButtonTest(),route='profiles/pagina-f31/button-test/events'
 expect((await call('POST','profiles/pagina-f31/button-test/assignment',{})).json().assignment).toMatchObject({id:assignment.id,variant:assignment.variant,label:assignment.label})
 expect((await call('POST','me/profile/button-tests/start',{expectedVersion:1},owner)).json().id).toBe(assignment.id)
 expect((await call('POST',route,buttonEvent(assignment,'CLICK'))).json().counted).toBe(false)
 expect((await call('POST',route,buttonEvent(assignment))).json().counted).toBe(true);expect((await call('POST',route,buttonEvent(assignment))).json().counted).toBe(false)
 expect((await call('POST',route,buttonEvent(assignment,'CLICK'))).json().counted).toBe(true);expect((await call('POST',route,buttonEvent(assignment,'CLICK'))).json().counted).toBe(false)
 expect((await call('POST',route,{...buttonEvent(assignment),variant:1-assignment.variant})).statusCode).toBe(422)
 const report=(await call('GET','me/profile/button-tests',undefined,owner)).json();expect(report.experiments[0].counts[assignment.variant]).toEqual({exposures:1,clicks:1});expect(report.experiments[0].result.winner).toBeNull();expect(JSON.stringify(report)).not.toMatch(/sessionHash|analyticsSession/)
 setProfileClockForTest(()=>new Date(+now+7*86400000));const ended=(await call('GET','me/profile/button-tests',undefined,owner)).json().experiments[0];expect(ended.status).toBe('COMPLETE');expect(ended.result.status).toBe('INCONCLUSIVE')
})
it('F26-PG02/T03/T04/T05 consentimento, tenant, dono, token e cobertura impedem medição indevida',async()=>{
 const assignment=await prepareButtonTest(),route='profiles/pagina-f31/button-test/events'
 for(const extra of ([{cookie:''},{dnt:'1'},{'sec-gpc':'1'},{'user-agent':'Googlebot'}] as Record<string,string>[])){const response=await call('POST','profiles/pagina-f31/button-test/assignment',{},null,extra);expect(response.json().assignment).toBeNull();expect(response.headers['set-cookie']).toBeUndefined()}
 expect((await call('POST','profiles/pagina-f31/button-test/assignment',{},owner)).json().assignment).toBeNull()
 expect((await call('POST',route,{...buttonEvent(assignment),surfaceToken:assignment.surfaceToken+'x'})).statusCode).toBe(422)
 expect((await call('POST','me/profile/button-tests/'+assignment.id+'/stop',{expectedVersion:0},other)).statusCode).toBe(404)
 expect((await call('POST','me/profile/button-tests/start',{expectedVersion:0},owner)).statusCode).toBe(409)
 expect((await call('GET','me/profile/button-tests',undefined,null)).statusCode).toBe(401)
 expect((await call('GET','me/profile/button-tests',undefined,owner,{authorization:'Bearer '+app.jwt.sign({sub:owner,tenantId:randomUUID(),role:'ADMIN',typ:'access'})})).statusCode).toBe(403)
 await db.profileSubscription.update({where:{id:subscriptionId},data:{paidThrough:now}});expect((await call('POST','profiles/pagina-f31/button-test/assignment',{})).json().assignment).toBeNull();const masked=(await call('GET','me/profile/button-tests',undefined,owner)).json().experiments[0];expect(masked.counts).toEqual([{exposures:null,clicks:null},{exposures:null,clicks:null}]);expect(masked.result.status).toBe('UNAVAILABLE')
})
it('F26-PG03 publicação nova encerra teste e interrupção usa versão sem alterar conteúdo público',async()=>{
 const assignment=await prepareButtonTest();await db.profile.update({where:{id:profileId},data:{version:2,publishedVersion:2}})
 const report=(await call('GET','me/profile/button-tests',undefined,owner)).json().experiments[0];expect(report.status).toBe('STOPPED');expect(report.result.winner).toBeNull();expect((await call('POST','profiles/pagina-f31/button-test/assignment',{})).json().assignment).toBeNull();expect((await call('POST','me/profile/button-tests/'+assignment.id+'/stop',{expectedVersion:0},owner)).statusCode).toBe(409)
 expect((await call('GET','profiles/pagina-f31')).json().items[0].label).toBe('Meu projeto')
})

it('F26-PG04 permissões globais separam leitura e escrita e auditam o operador real',async()=>{
 const assignment=await prepareButtonTest();expect((await call('POST','me/profile/button-tests/'+assignment.id+'/stop',{expectedVersion:0},owner)).statusCode).toBe(200)
 await db.$executeRaw`INSERT INTO workspace_memberships(id,"tenantId","ownerId","userId",grants) VALUES(${randomUUID()},${tenant},${owner},${other},'{}'::jsonb)`
 const headers={'x-workspace-owner':owner};expect((await call('GET','me/profile/button-tests',undefined,other,headers)).statusCode).toBe(403)
 await db.$executeRaw`UPDATE workspace_memberships SET grants='{"page":{"read":true,"write":false}}'::jsonb WHERE "tenantId"=${tenant}`
 expect((await call('GET','me/profile/button-tests',undefined,other,headers)).statusCode).toBe(200);expect((await call('POST','me/profile/button-tests/start',{expectedVersion:1},other,headers)).statusCode).toBe(403)
 await db.$executeRaw`UPDATE workspace_memberships SET grants='{"page":{"read":true,"write":true}}'::jsonb WHERE "tenantId"=${tenant}`
 const start=await call('POST','me/profile/button-tests/start',{expectedVersion:1},other,headers);expect(start.statusCode,start.body).toBe(200);expect((await db.auditLog.findFirst({where:{tenantId:tenant,action:'PROFILE_BUTTON_TEST_START'},orderBy:{createdAt:'desc'}}))?.actorId).toBe(other)
 await db.$executeRaw`UPDATE workspace_memberships SET "revokedAt"=CURRENT_TIMESTAMP WHERE "tenantId"=${tenant}`;expect((await call('GET','me/profile/button-tests',undefined,other,headers)).statusCode).toBe(403)
})
