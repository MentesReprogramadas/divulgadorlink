import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {pruneProfileRevisions} from '@/repositories/profile-revisions'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setRedirectsForTest} from '@/http/controllers/@Redirects/routes'
import {setContentReviewsForTest} from '@/http/controllers/@Moderation/content-reviews'
import {setProfileInteractionsForTest} from '@/http/controllers/@Analytics/profile-interaction'
import {setProfileBillingForTest} from '@/lib/profile-billing'
import {setProfileClockForTest} from '@/lib/profile-clock'
import {BASE_PROFILE_CAPABILITIES} from '@/domain/billing/profile-plans'
import {cleanBillingFixture} from '@/test-support/clean-billing-fixture'
import type {ChannelGroupInput} from '@/domain/profiles/channel-input'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,foreignOwner:string,profileId:string
const now=new Date('2026-10-18T12:00:00Z'),probe=vi.fn(async()=>200),judge=vi.fn(async()=>({pass:true,confidence:.99,reasons:[] as string[]})),ports={probe,judge}
const settings={schemaVersion:1,groups:[]}
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();profileId=randomUUID();probe.mockReset();probe.mockResolvedValue(200);judge.mockReset();judge.mockResolvedValue({pass:true,confidence:.99,reasons:[]})
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F37 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F37 fixture',role:id===other?'ADMIN':'USER',passwordHash:'fixture',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 const snapshot={slug:'pagina-f37',name:'Página anterior',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[]}
 await db.profile.create({data:{id:profileId,tenantId:tenant,ownerId:owner,slug:snapshot.slug,name:snapshot.name,version:1,publishedVersion:1,publication:snapshot,publishedDraft:snapshot}})
 await db.profileRevision.create({data:{profileId,tenantId:tenant,ownerId:owner,version:1,snapshot,createdAt:new Date('2026-04-20T12:00:00Z')}})
 setProfilesForTest(db,ports);setRedirectsForTest(db,ports);setContentReviewsForTest(db,ports);setProfileInteractionsForTest(db);setProfileClockForTest(()=>now);setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set([...BASE_PROFILE_CAPABILITIES,'profile.analytics'])})
})
afterEach(async()=>{setProfileClockForTest(null);setProfileBillingForTest(null,null);for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.redirectHandle.deleteMany({where});await db.auditLog.deleteMany({where});await cleanBillingFixture(db,tenantId);await db.network.deleteMany({where});await db.config.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}})
afterAll(async()=>{setProfilesForTest(null);setRedirectsForTest(null);setContentReviewsForTest(null);setProfileInteractionsForTest(null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH'|'PUT'|'DELETE',route:string,body?:unknown,options:{actor?:string|null;hostTenant?:string;tokenTenant?:string;headers?:Record<string,string>}={}){
 const actor=options.actor===undefined?owner:options.actor
 return app.inject({method,url:'/api/v1/'+route,headers:{host:(options.hostTenant??tenant)+'.test','user-agent':'Mozilla/5.0 Safari/605.1',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:options.tokenTenant??tenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...options.headers},...(body?{payload:body}:{})})
}
async function invite(destinationUrl:string,requiresAge=false,foreignSource=false){const result=await call('POST','me/redirects',{destinationUrl,label:'Convite validado',requiresAge,expectedRevision:0,requestKey:randomUUID()},foreignSource?{actor:foreignOwner,hostTenant:foreign,tokenTenant:foreign}:{});expect(result.statusCode,result.body).toBe(200);expect(result.json().destinationRevision.status).toBe('APPROVED');return result.json() as {id:string;version:number;destinationRevision:{id:string;status:string}}}
async function group(){const network=await db.network.create({data:{tenantId:tenant,name:'Telegram',slug:'telegram',knownHosts:['t.me']}}),site=await invite('https://example.com/comunidade'),telegram=await invite('https://t.me/comunidade');const body:ChannelGroupInput={expectedVersion:1,name:'Escolha um canal',visible:true,channels:[{id:randomUUID(),label:'Entrar',networkId:null,destinationRevisionId:site.destinationRevision.id,paused:false},{id:randomUUID(),label:'Entrar',networkId:network.id,destinationRevisionId:telegram.destinationRevision.id,paused:false}]};return{id:randomUUID(),body,network,site,telegram}}
const save=(value:Awaited<ReturnType<typeof group>>,patch:Partial<ChannelGroupInput>={})=>call('PUT','me/profile/channel-groups/'+value.id,{...value.body,...patch})
it('unified groups retain ordinary links, persist title visibility across publication and restrict exact source lookups',async()=>{
 const value=await group(),ordinaryId=randomUUID()
 const original=(await call('GET','me/profile')).json().draft,{version,...content}=original
 content.categories.push({id:value.id,name:'Comunidade',visible:true});content.items.push({id:ordinaryId,categoryId:value.id,type:'URL',label:'Meu guia',destination:'https://example.org/guia',visible:true});content.primaryItemId=ordinaryId
 expect((await call('PATCH','me/profile',{expectedVersion:version,content})).statusCode).toBe(200)
 const result=await save(value,{expectedVersion:2,channels:value.body.channels.map(channel=>({...channel,showLabel:false}))});expect(result.statusCode,result.body).toBe(200)
 expect(result.json().draft.items.map((item:{id:string})=>item.id)).toContain(ordinaryId);expect(result.json().draft.primaryItemId).toBe(ordinaryId)
 await publish(3);const publicPage=await live();expect(publicPage.items.map((item:{id:string})=>item.id)).toContain(ordinaryId);expect(publicPage.channelGroups[0].channels.every((channel:{showLabel:boolean})=>channel.showLabel===false)).toBe(true)
 const sourcePath='me/profile/channel-destinations/'+value.telegram.destinationRevision.id
 expect((await call('GET',sourcePath)).json()).toMatchObject({available:true,status:'APPROVED',networks:[{slug:'telegram'}]})
 expect((await call('GET',sourcePath,undefined,{actor:other})).statusCode).toBe(404);expect((await call('GET',sourcePath,undefined,{actor:null})).statusCode).toBe(401)
 expect((await save(value,{expectedVersion:3,channels:[]})).statusCode).toBe(200);expect((await call('GET','me/profile')).json().draft.items).toHaveLength(1)
})
it('pending destinations are recoverable drafts and never eligible for publication',async()=>{
 const value=await group(),revisionId=value.telegram.destinationRevision.id
 await db.redirectDestination.update({where:{id:revisionId},data:{status:'PENDING_REVIEW'}});await db.redirectHandle.update({where:{id:value.telegram.id},data:{activeRevisionId:null}})
 expect((await call('GET','me/profile/channel-destinations/'+revisionId)).json()).toMatchObject({available:false,status:'PENDING_REVIEW'})
 const result=await save(value);expect(result.statusCode,result.body).toBe(200)
 expect((await call('GET','me/profile/channel-groups')).json().groups[0].channels[1]).toMatchObject({status:'PENDING_REVIEW',available:false,destinationUrl:'https://t.me/comunidade'})
 expect((await call('POST','me/profile/publish',{expectedVersion:2})).statusCode).toBe(422);expect((await live()).channelGroups).toBeUndefined()
})
async function publish(expectedVersion:number){const result=await call('POST','me/profile/publish',{expectedVersion});expect(result.statusCode,result.body).toBe(200);return result.json() as {publishedRevisionId:number;review?:{id:string;status:string}}}
async function live(age=false){const result=await call('GET','profiles/pagina-f37',undefined,{actor:null,headers:age?{cookie:'age=yes'}:{}});expect(result.statusCode,result.body).toBe(200);return result.json()}
function resolve(href:string,headers:Record<string,string>={}){const url=new URL(href,'https://fixture.test'),id=url.pathname.split('/').at(-1);return call('GET','profiles/pagina-f37/channels/'+id+'/resolve'+url.search,undefined,{actor:null,headers})}
it('F37-PG01 metadata cannot reference a profile in another tenant or owner, duplicate its draft or invent a revision',async()=>{
 const data={profileId,tenantId:tenant,ownerId:owner,settings}
 await expect(db.profileChannelDraft.create({data:{...data,tenantId:foreign}})).rejects.toMatchObject({code:'P2003'})
 await expect(db.profileChannelDraft.create({data:{...data,ownerId:other}})).rejects.toMatchObject({code:'P2003'})
 await db.profileChannelDraft.create({data});await expect(db.profileChannelDraft.create({data})).rejects.toMatchObject({code:'P2002'})
 await expect(db.profileChannelRevision.create({data:{...data,version:2}})).rejects.toMatchObject({code:'P2003'})
 await db.profileChannelRevision.create({data:{...data,version:1}});expect((await db.profileChannelRevision.findUniqueOrThrow({where:{profileId_version:{profileId,version:1}}})).settings).toEqual(settings)
 await expect(db.profileChannelRevision.update({where:{profileId_version:{profileId,version:1}},data:{settings:{schemaVersion:1,groups:[{id:'invented'}]}}})).rejects.toThrow(/Published profile revisions are immutable/)
})
it('F37-PG02 SQL shape checks reject absent fields, wrong schema version/type, nonarrays and oversized metadata',async()=>{
 for(const value of [{},{schemaVersion:'1',groups:[]},{schemaVersion:2,groups:[]},{schemaVersion:1,groups:{}},{schemaVersion:1,groups:[],oversized:'x'.repeat(300001)}]){
  await expect(db.$executeRaw`INSERT INTO profile_channel_drafts ("profileId","tenantId","ownerId",settings,"updatedAt") VALUES (${profileId},${tenant},${owner},${JSON.stringify(value)}::jsonb,now())`).rejects.toThrow(/profile_channel_drafts_shape/)
 }
 expect(await db.profileChannelDraft.count({where:{profileId}})).toBe(0)
})
it('F37-PG03 metadata follows F19 retention and profile deletion while preserving the active historical publication',async()=>{
 const now=new Date('2026-10-18T12:00:00Z'),expired=new Date(now.getTime()-181*86400000),revision=await db.profileRevision.findUniqueOrThrow({where:{profileId_version:{profileId,version:1}}})
 await db.profileRevision.create({data:{profileId,tenantId:tenant,ownerId:owner,version:2,snapshot:revision.snapshot!,createdAt:expired}})
 for(const version of [1,2])await db.profileChannelRevision.create({data:{profileId,tenantId:tenant,ownerId:owner,version,settings}})
 await db.profileChannelDraft.create({data:{profileId,tenantId:tenant,ownerId:owner,settings}})
 await db.$transaction(tx=>pruneProfileRevisions(tx,{id:profileId,publishedVersion:1},now));expect((await db.profileChannelRevision.findMany({where:{profileId}})).map(row=>row.version)).toEqual([1]);expect(await db.profileChannelDraft.count({where:{profileId}})).toBe(1)
 await db.profile.delete({where:{id:profileId}});expect(await db.profileChannelRevision.count({where:{profileId}})).toBe(0);expect(await db.profileChannelDraft.count({where:{profileId}})).toBe(0)
})
it('F37-PG04 a failed metadata transaction does not modify the publication or leave a false draft record',async()=>{
 const before=await db.profile.findUniqueOrThrow({where:{id:profileId}})
 await expect(db.$transaction(async tx=>{await tx.profileChannelDraft.create({data:{profileId,tenantId:tenant,ownerId:owner,settings}});throw new Error('F37 fixture rollback')})).rejects.toThrow('F37 fixture rollback')
 expect(await db.profileChannelDraft.count({where:{profileId}})).toBe(0);expect(await db.profile.findUniqueOrThrow({where:{id:profileId}})).toEqual(before)
})
it('F37-T01/T02/T06 approved alternatives have explicit network labels and individually reject mismatches without partial writes',async()=>{
 const value=await group(),wrong={...value.body,channels:value.body.channels.map((channel,index)=>index?{...channel,networkId:value.network.id,destinationRevisionId:value.site.destinationRevision.id}:channel)}
 expect((await call('PUT','me/profile/channel-groups/'+value.id,wrong)).statusCode).toBe(422);expect(await db.profileChannelDraft.count({where:{profileId}})).toBe(0);expect((await db.profile.findUniqueOrThrow({where:{id:profileId}})).version).toBe(1)
 expect((await save(value)).statusCode).toBe(200);expect((await live()).channelGroups).toBeUndefined();await publish(2)
 const result=await live();expect(result.channelGroups[0].channels.map((channel:{network:{name:string}})=>channel.network.name)).toEqual(['Site','Telegram']);expect(JSON.stringify(result)).not.toMatch(/handleId|revisionId|networkId|paused|equivalent/)
 expect(result.channelGroups[0].channels.every((channel:{href:string})=>channel.href.includes('/canais/')&&channel.href.includes('?token='))).toBe(true);const chosen=await resolve(result.channelGroups[0].channels[1].href);expect(chosen.statusCode,chosen.body).toBe(302);expect(chosen.headers.location).toBe('https://t.me/comunidade')
 const details=(await call('GET','me/profile/channel-groups')).json();expect(details.profileVersion).toBe(2);expect(details.groups[0].channels.map((channel:{available:boolean})=>channel.available)).toEqual([true,true]);expect((await call('GET','me/profile/channel-destinations')).json().items).toHaveLength(2)
})
it('F37-T03 pause is a draft publication change; disabled or replaced invitations are ineligible immediately at read and click',async()=>{
 const value=await group();expect((await save(value)).statusCode).toBe(200);await publish(2);const original=await live()
 probe.mockResolvedValueOnce(503);const offline=await resolve(original.channelGroups[0].channels[0].href);expect(offline.statusCode).toBe(200);expect(offline.json()).toEqual({available:false});expect(offline.headers.location).toBeUndefined();expect((await live()).channelGroups[0].channels).toHaveLength(2)
 const paused=value.body.channels.map((channel,index)=>index?{...channel,paused:true}:channel);expect((await save(value,{expectedVersion:2,channels:paused})).statusCode).toBe(200);expect((await live()).channelGroups[0].channels).toHaveLength(2)
 const preview=(await call('GET','me/profile/preview')).json();expect(preview.channelGroups[0].channels).toHaveLength(1);expect(JSON.stringify(preview)).not.toMatch(/token=|surfaceToken/);await publish(3);expect((await live()).channelGroups[0].channels).toHaveLength(1);expect((await resolve(original.channelGroups[0].channels[1].href)).statusCode).toBe(422)
 const active=await live(),disabled=await call('POST','me/redirects/'+value.site.id+'/disable',{expectedRevision:1});expect(disabled.statusCode).toBe(200);const empty=await live();expect(empty.channelGroups[0].channels).toEqual([]);expect(JSON.stringify(empty)).not.toMatch(/https|token=/);const blocked=await resolve(active.channelGroups[0].channels[0].href);expect(blocked.statusCode).toBe(200);expect(blocked.json()).toEqual({available:false});expect(blocked.headers.location).toBeUndefined()
})
it('F37-I02 private actions preserve session, tenant, confirmed ownership and cookie CSRF boundaries',async()=>{
 const value=await group();expect((await call('GET','me/profile/channel-groups',undefined,{actor:null})).statusCode).toBe(401);expect((await call('GET','me/profile/channel-groups',undefined,{tokenTenant:foreign})).statusCode).toBe(403);expect((await call('GET','me/profile/channel-groups?ownerId='+owner)).statusCode).toBe(400)
 const own={slug:'outra-pagina',name:'Outra página',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[]};expect((await call('PATCH','me/profile',{expectedVersion:0,content:own},{actor:other})).statusCode).toBe(200);expect((await call('GET','me/profile/channel-groups',undefined,{actor:other})).json().groups).toEqual([]);expect((await call('PUT','me/profile/channel-groups/'+value.id,value.body,{actor:other})).statusCode).toBe(404)
 const alien=await invite('https://example.org/foreign',false,true);expect((await save(value,{channels:[{...value.body.channels[0],destinationRevisionId:alien.destinationRevision.id}]})).statusCode).toBe(404)
 const csrf='f'.repeat(32),cookie='accessToken='+app.jwt.sign({sub:owner,tenantId:tenant,role:'ADMIN',typ:'access'})+'; csrf='+csrf
 expect((await call('PUT','me/profile/channel-groups/'+value.id,value.body,{actor:null,headers:{cookie}})).statusCode).toBe(403);expect(await db.profileChannelDraft.count({where:{profileId}})).toBe(0);expect((await call('PUT','me/profile/channel-groups/'+value.id,value.body,{actor:null,headers:{cookie,'x-csrf-token':csrf}})).statusCode).toBe(200)
 await db.userIdentifier.updateMany({where:{tenantId:tenant,userId:owner},data:{confirmedAt:null}});expect((await call('POST','me/profile/publish',{expectedVersion:2})).statusCode).toBe(403)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await call('GET','me/profile/channel-groups')).statusCode).toBe(403)
})
it('F37-I03 concurrent identical retries are one change; stale edits and audit failure cannot replace the draft or publication',async()=>{
 const value=await group(),attempts=await Promise.all(Array.from({length:6},()=>save(value)));expect(attempts.map(result=>result.statusCode)).toEqual([200,200,200,200,200,200]);expect((await db.profile.findUniqueOrThrow({where:{id:profileId}})).version).toBe(2);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.channels.updated'}})).toBe(1)
 expect((await save(value,{name:'Edição antiga'})).statusCode).toBe(409)
 const before=await db.profile.findUniqueOrThrow({where:{id:profileId}}),metadata=await db.profileChannelDraft.findUniqueOrThrow({where:{profileId}})
 await db.$executeRawUnsafe(`CREATE FUNCTION f37_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."tenantId"='${tenant}' AND NEW.action='profile.channels.updated' THEN RAISE EXCEPTION 'F37 audit fixture'; END IF; RETURN NEW; END; $$`);await db.$executeRawUnsafe('CREATE TRIGGER f37_fail_audit_trigger BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION f37_fail_audit()')
 try{expect((await save(value,{expectedVersion:2,name:'Não deve persistir'})).statusCode).toBe(500)}finally{await db.$executeRawUnsafe('DROP TRIGGER f37_fail_audit_trigger ON audit_logs');await db.$executeRawUnsafe('DROP FUNCTION f37_fail_audit()')}
 expect(await db.profile.findUniqueOrThrow({where:{id:profileId}})).toEqual(before);expect(await db.profileChannelDraft.findUniqueOrThrow({where:{profileId}})).toEqual(metadata)
})
it('F37-T05 each choice has its own consented F31 block facts and clear report label, without duplicate F12 raw counts',async()=>{
 const value=await group();await save(value);await publish(2)
 const plan=await db.profilePlan.create({data:{tenantId:tenant,tier:'PRO',title:'Fixture',versions:{create:{version:1,amountCents:1000,providerProductId:'prod_fixture',providerPriceId:'price_'+tenant.replaceAll('-',''),capabilities:[...BASE_PROFILE_CAPABILITIES,'profile.analytics']}}},include:{versions:true}}),account=await db.profileBillingAccount.create({data:{tenantId:tenant,ownerId:owner}})
 await db.profileSubscription.create({data:{tenantId:tenant,ownerId:owner,accountId:account.id,planVersionId:plan.versions[0].id,status:'ACTIVE',periodStart:new Date('2026-10-01Z'),periodEnd:new Date('2026-11-01Z'),paidThrough:new Date('2026-11-01Z'),entitlements:{create:{capability:'profile.analytics',validFrom:new Date('2026-10-01Z'),validUntil:new Date('2026-11-01Z')}}}})
 expect((await call('PATCH','me/profile/measurement',{enabled:true,expectedVersion:0})).statusCode).toBe(200);const descriptor=(await live()).measurement
 for(let index=0;index<10;index++){const headers={cookie:'tla_profile_measure=v1_yes; analyticsSession='+randomUUID()},base={eventId:randomUUID(),profileId,revisionId:2,kind:'PAGE',blockId:null,viewportBucket:'MOBILE',scrollBucket:null,surfaceToken:descriptor.surfaceToken};expect((await call('POST','analytics/profiles/events',base,{actor:null,headers})).statusCode).toBe(201);if(!index)for(const channel of value.body.channels)expect((await call('POST','analytics/profiles/events',{...base,eventId:randomUUID(),kind:'CLICK',blockId:channel.id},{actor:null,headers})).statusCode).toBe(201)}
 const summary=(await call('GET','me/profile/interaction')).json().summary;expect(summary.available).toBe(true);expect(summary.blocks.map((block:{label:string;clicks:number})=>[block.label,block.clicks])).toEqual([['Site: Entrar',1],['Telegram: Entrar',1]]);expect(await db.redirectDaily.count({where:{revision:{tenantId:tenant}}})).toBe(0)
})
it('F37-I04 F19 restores metadata with the draft and preserves the current public choice until republished',async()=>{
 const value=await group();value.body.channels=value.body.channels.slice(1).map(channel=>({...channel,networkId:null}));await save(value);await publish(2)
 const changed=value.body.channels.map(channel=>({...channel,networkId:value.network.id}));expect((await save(value,{expectedVersion:2,channels:changed})).statusCode).toBe(200);expect((await call('GET','me/profile')).json().channelChanges).toBe(true);await publish(3)
 const historical=await db.profileRevision.findUniqueOrThrow({where:{profileId_version:{profileId,version:2}}}),detail=(await call('GET','me/profile/revisions/'+historical.id)).json();expect(detail.channelGroups[0].channels[0].networkName).toBe('Site')
 expect((await call('POST','me/profile/revisions/'+historical.id+'/restore',{expectedVersion:3})).statusCode).toBe(200);expect((await live()).channelGroups[0].channels[0].network.name).toBe('Telegram');expect((await call('GET','me/profile/preview')).json().channelGroups[0].channels[0].network.name).toBe('Site')
 expect((await call('POST','me/profile/discard',{expectedVersion:4})).statusCode).toBe(200);expect((await call('GET','me/profile/preview')).json().channelGroups[0].channels[0].network.name).toBe('Telegram');expect((await call('GET','me/profile')).json().channelChanges).toBe(false)
})
it('F37-I05 human approval rechecks channel revisions and stale review cannot publish a changed invitation',async()=>{
 const value=await group();await save(value);judge.mockResolvedValue({pass:false,confidence:.4,reasons:['Revisão fixture']});const review=await publish(2);expect(review.review?.status).toBe('PENDING');expect((await live()).channelGroups).toBeUndefined()
 judge.mockResolvedValue({pass:true,confidence:.99,reasons:[]});const replaced=await call('POST','me/redirects/'+value.telegram.id+'/destinations',{destinationUrl:'https://t.me/canal-atual',label:'Convite validado',requiresAge:false,expectedRevision:1,requestKey:randomUUID()});expect(replaced.statusCode).toBe(200)
 const decision=await call('POST','admin/content-reviews/'+review.review!.id+'/decision',{decision:'APPROVE'},{actor:other});expect(decision.statusCode,decision.body).toBe(422);expect((await db.contentReview.findUniqueOrThrow({where:{id:review.review!.id}})).status).toBe('PENDING');expect((await db.profile.findUniqueOrThrow({where:{id:profileId}})).publishedVersion).toBe(1)
 const channels=value.body.channels.map((channel,index)=>index?{...channel,destinationRevisionId:replaced.json().destinationRevision.id}:channel);expect((await save(value,{expectedVersion:2,channels})).statusCode).toBe(200);expect((await db.contentReview.findUniqueOrThrow({where:{id:review.review!.id}})).status).toBe('SUPERSEDED');await publish(3);expect((await live()).channelGroups[0].channels).toHaveLength(2)
})
it('F37-I06 a concurrent new publication during the selected destination probe invalidates the old token without redirecting',async()=>{
 const value=await group();await save(value);await publish(2);const href=(await live()).channelGroups[0].channels[0].href
 let began!:()=>void,release!:(status:number)=>void;const started=new Promise<void>(resolve=>{began=resolve}),gate=new Promise<number>(resolve=>{release=resolve});probe.mockImplementationOnce(async()=>{began();return gate})
 const attempt=resolve(href);await started;await save(value,{expectedVersion:2,channels:value.body.channels.map((channel,index)=>index?channel:{...channel,paused:true})});await publish(3);release(200);const result=await attempt;expect(result.statusCode,result.body).toBe(422);expect(result.headers.location).toBeUndefined();expect(await db.redirectDaily.count({where:{revision:{tenantId:tenant}}})).toBe(0)
})
it('F37-I07 age-gated channels do not expose choices, tokens or destinations before acceptance',async()=>{
 const source=await invite('https://example.com/restrito',true),id=randomUUID();expect((await call('PUT','me/profile/channel-groups/'+id,{expectedVersion:1,name:'Comunidade',visible:true,channels:[{id:randomUUID(),label:'Entrar',networkId:null,destinationRevisionId:source.destinationRevision.id,paused:false}]})).statusCode).toBe(200);await publish(2);expect(await live()).toEqual({restricted:true});const adult=await live(true),result=await resolve(adult.channelGroups[0].channels[0].href);expect(result.json()).toEqual({restricted:true});expect(result.headers.location).toBeUndefined()
})
