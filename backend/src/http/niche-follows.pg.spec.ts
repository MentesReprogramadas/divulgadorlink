import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {beforeAll,beforeEach,afterEach,afterAll,expect,it,vi} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setNicheFollowsDbForTest} from '@/http/controllers/@Notifications/niche-follows'
import {followNiche,digestPreferences,followedNiches,unsubscribeNicheDigest} from '@/use-cases/@Notifications/niche-follows'
import {runNicheDigestCycle} from '@/use-cases/@Notifications/niche-digests'
import type {OutboundEmail} from '@/adapters/notifications/resend-mailer'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}}),now=new Date('2026-10-19T12:00:00Z'),later=new Date(now.getTime()+7*86400000)
let tenant:string,foreign:string,user:string,other:string,niche:string,foreignNiche:string,network:string,adultNiche:string
const a=()=>({tenantId:tenant,actorId:user})
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});setNicheFollowsDbForTest(db);await app.ready()})
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();user=randomUUID();other=randomUUID();niche=randomUUID();foreignNiche=randomUUID();network=randomUUID();adultNiche=randomUUID()
 for(const id of [tenant,foreign])await db.tenant.create({data:{id,host:id+'.test',name:'F05'}})
 for(const [id,tenantId] of [[user,tenant],[other,tenant]])await db.user.create({data:{id,tenantId,name:'F05-PRIVATE-NAME',passwordHash:'F05-SECRET',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:now}}}})
 await db.network.create({data:{id:network,tenantId:tenant,name:'Site',slug:'site',knownHosts:[]}})
 for(const [id,tenantId,requiresAge] of [[niche,tenant,false],[foreignNiche,foreign,false],[adultNiche,tenant,true]] as const)await db.niche.create({data:{id,tenantId,name:requiresAge?'F05-ADULT':'Estudos',slug:id,requiresAge}})
})
afterEach(async()=>{for(const tenantId of [tenant,foreign]){const where={tenantId};await db.auditLog.deleteMany({where});await db.link.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}})
afterAll(async()=>{setNicheFollowsDbForTest(null);await db.$disconnect()})
async function link(name='Novo projeto',patch:Record<string,unknown>={}){return db.link.create({data:{tenantId:tenant,ownerId:other,networkId:network,nicheId:niche,canonicalUrl:'https://example.com/'+randomUUID(),name,description:'Projeto de estudo',status:'PUBLISHED',...patch}})}
async function enable(){const state=await followedNiches(db,a());await digestPreferences(db,a(),{emailDigest:true,frequency:'WEEKLY',expectedVersion:state.preferences.expectedVersion},now)}
const cycle=(deliver:(email:OutboundEmail)=>Promise<void>,at=later)=>runNicheDigestCycle(db,{enabled:true,now:at,deliver})
function request(method:'GET'|'PUT'|'DELETE'|'PATCH'|'POST',path:string,body?:unknown,actor:string|null=user,tokenTenant=tenant,hostTenant=tenant){return app.inject({method,url:'/api/v1/'+path,headers:{host:hostTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{} )},...(body?{payload:body}:{})})}
it('F05-T01/T05 defaults off; following does not consent; confirmed explicit preference uses shared CAS without changing F02',async()=>{
 await followNiche(db,a(),niche,true);let state=await followedNiches(db,a());expect(state.preferences.emailDigest).toBe(false);expect((await db.user.findUniqueOrThrow({where:{id:user}})).emailRenewal).toBe(false)
 await enable();state=await followedNiches(db,a());expect(state.preferences).toMatchObject({emailDigest:true,frequency:'WEEKLY',nextDigestAt:later.toISOString()});await expect(digestPreferences(db,a(),{emailDigest:false,frequency:'WEEKLY',expectedVersion:0})).rejects.toThrow('preferências mudaram')
 await db.userIdentifier.updateMany({where:{userId:user},data:{confirmedAt:null}});await expect(digestPreferences(db,a(),{emailDigest:true,frequency:'MONTHLY',expectedVersion:state.preferences.expectedVersion})).rejects.toThrow('Confirme')
})
it('F05-T03/PG01 baseline and sent receipts prevent duplicates including concurrent cycles',async()=>{
 const baseline=await link('Baseline');await followNiche(db,a(),niche,true);await followNiche(db,a(),niche,true);expect(await db.nicheFollow.count({where:{tenantId:tenant}})).toBe(1);expect(await db.nicheDigestReceipt.count({where:{tenantId:tenant,linkId:baseline.id}})).toBe(1)
 await enable();const fresh=await link('Novo após adesão'),deliver=vi.fn(async(_email:OutboundEmail)=>undefined);await Promise.all([cycle(deliver),cycle(deliver)]);expect(deliver).toHaveBeenCalledTimes(1);expect(deliver.mock.calls[0][0].text).toContain(fresh.name);expect(deliver.mock.calls[0][0].text).not.toContain('Baseline');expect(await db.nicheDigestReceipt.count({where:{tenantId:tenant,reason:'SENT'}})).toBe(1)
 await cycle(deliver,new Date(later.getTime()+7*86400000));expect(deliver).toHaveBeenCalledTimes(1);expect((await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}})).payload).toBeNull()
})
it('F05-U01/T01 a period without eligible publications never contacts the provider',async()=>{await followNiche(db,a(),niche,true);await enable();const deliver=vi.fn(async()=>undefined);expect(await cycle(deliver)).toEqual({sent:0});expect(deliver).not.toHaveBeenCalled();expect(await db.nicheDigestBatch.count({where:{tenantId:tenant}})).toBe(0)})
it('F05-I01 delivery retries preserve exact body/key and only successful deliveries create receipts',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();const deliver=vi.fn<(email:OutboundEmail)=>Promise<void>>().mockRejectedValueOnce(new Error('Provider unavailable')).mockResolvedValue(undefined)
 await cycle(deliver);expect(await db.nicheDigestReceipt.count({where:{tenantId:tenant,reason:'SENT'}})).toBe(0);await cycle(deliver,new Date(later.getTime()+60000));expect(deliver).toHaveBeenCalledTimes(2);expect(deliver.mock.calls[1][0]).toEqual(deliver.mock.calls[0][0]);expect(await db.nicheDigestReceipt.count({where:{tenantId:tenant,reason:'SENT'}})).toBe(1)
})
it('F05-T02/U03 unsubscribe is tenant-bound, idempotent, private and suppresses queued delivery',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();let email:OutboundEmail|undefined;await cycle(async value=>{email=value;throw new Error('Uncertain provider')});const token=new URL(email!.text.match(/https?:\/\/[^\s]+\/resumos\/cancelar\?token=[a-f0-9]+/)![0]).searchParams.get('token')!
 await expect(unsubscribeNicheDigest(db,foreign,token,later)).rejects.toThrow('expirou');expect(await unsubscribeNicheDigest(db,tenant,token,later)).toEqual({disabled:true});expect(await unsubscribeNicheDigest(db,tenant,token,later)).toEqual({disabled:true});const deliver=vi.fn(async()=>undefined);await cycle(deliver,new Date(later.getTime()+60000));expect(deliver).not.toHaveBeenCalled();expect((await followedNiches(db,a())).preferences.emailDigest).toBe(false);expect((await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}})).payload).toBeNull()
})
it('F05-T04/U04 a publication moderated after selection is suppressed before retry',async()=>{
 await followNiche(db,a(),niche,true);await enable();const row=await link();await cycle(async()=>{throw new Error('offline')});await db.link.update({where:{id:row.id},data:{status:'UNAVAILABLE'}});const deliver=vi.fn(async()=>undefined);await cycle(deliver,new Date(later.getTime()+60000));expect(deliver).not.toHaveBeenCalled();expect((await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}})).status).toBe('SKIPPED')
})
it('F05-T04/T05 source changes, adult network and account restrictions cannot leak through retries',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();await cycle(async()=>{throw new Error('offline')});await db.network.update({where:{id:network},data:{requiresAge:true}});const deliver=vi.fn(async()=>undefined);await cycle(deliver,new Date(later.getTime()+60000));expect(deliver).not.toHaveBeenCalled();expect(await db.nicheDigestReceipt.count({where:{tenantId:tenant,reason:'SENT'}})).toBe(0);await expect(followNiche(db,a(),adultNiche,true)).rejects.toThrow();await expect(followNiche(db,a(),foreignNiche,true)).rejects.toThrow()
})
it('F05-I02 HTTP binds actions to the session, never owner parameters or role cookies',async()=>{
 expect((await request('GET','me/followed-niches',undefined,null)).statusCode).toBe(401);await followNiche(db,a(),niche,true)
 const otherState=await request('GET','me/followed-niches',undefined,other);expect(otherState.statusCode).toBe(200);expect(otherState.json().niches[0].followed).toBe(false);expect(otherState.body).not.toMatch(/F05-SECRET|F05-PRIVATE-NAME|fixture.test/)
 expect((await request('PUT','me/followed-niches/'+foreignNiche)).statusCode).toBe(404);expect((await request('GET','me/followed-niches?ownerId='+user)).statusCode).toBe(400);expect((await request('GET','me/followed-niches',undefined,user,tenant,foreign)).statusCode).toBe(403)
 await db.user.update({where:{id:user},data:{status:'BANNED'}});expect((await request('PUT','me/followed-niches/'+niche)).statusCode).toBe(404)
})
it('F05-PG01 composite keys reject cross-tenant relations and unfollow removes receipt metadata',async()=>{
 await expect(db.nicheFollow.create({data:{tenantId:tenant,userId:user,nicheId:foreignNiche}})).rejects.toThrow();await link();await followNiche(db,a(),niche,true);await followNiche(db,a(),niche,false);await followNiche(db,a(),niche,false);expect(await db.nicheDigestReceipt.count({where:{tenantId:tenant}})).toBe(0)
})
it('F05-I03 an uncommitted batch rollback cannot advance the period or claim success',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();const before=(await db.user.findUniqueOrThrow({where:{id:user}})).nextDigestAt,deliver=vi.fn(async()=>undefined),suffix=tenant.replaceAll('-',''),fn='f05_reject_'+suffix,trigger='f05_trigger_'+suffix
 await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F05 rollback'; END $$`)
 try{await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON niche_digest_batches FOR EACH ROW WHEN (NEW."tenantId"='${tenant}') EXECUTE FUNCTION ${fn}()`);await expect(cycle(deliver)).rejects.toThrow();expect(deliver).not.toHaveBeenCalled();expect((await db.user.findUniqueOrThrow({where:{id:user}})).nextDigestAt).toEqual(before);expect(await db.nicheDigestBatch.count({where:{tenantId:tenant}})).toBe(0)}finally{await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON niche_digest_batches`);await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`)}
 expect(await cycle(deliver)).toEqual({sent:1})
})

it('F05-I01/I03 provider success followed by database failure retries the same idempotency key',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();const calls:OutboundEmail[]=[],providerKeys=new Set<string>(),deliver=async(email:OutboundEmail)=>{calls.push(email);providerKeys.add(email.idempotencyKey!)}
 const suffix=tenant.replaceAll('-',''),fn='f05_receipt_'+suffix,trigger='f05_receipt_trigger_'+suffix
 await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F05 post-provider rollback'; END $$`)
 try{await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON niche_digest_receipts FOR EACH ROW WHEN (NEW."tenantId"='${tenant}') EXECUTE FUNCTION ${fn}()`);await expect(cycle(deliver)).rejects.toThrow();expect(calls).toHaveLength(1);expect((await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}})).status).toBe('PENDING');expect(await db.nicheDigestReceipt.count({where:{tenantId:tenant,reason:'SENT'}})).toBe(0)}finally{await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON niche_digest_receipts`);await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`)}
 expect(await cycle(deliver)).toEqual({sent:1});expect(calls).toHaveLength(2);expect(calls[1]).toEqual(calls[0]);expect(providerKeys.size).toBe(1)
})
it('F05-T01/T02 changing frequency cancels a pending payload and schedules 30 days without altering F02',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();await cycle(async()=>{throw new Error('offline')});const state=await followedNiches(db,a());await digestPreferences(db,a(),{emailDigest:true,frequency:'MONTHLY',expectedVersion:state.preferences.expectedVersion},later)
 expect((await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}})).status).toBe('SKIPPED');const updated=await db.user.findUniqueOrThrow({where:{id:user}});expect(updated.nextDigestAt?.getTime()).toBe(later.getTime()+30*86400000);expect(updated.emailRenewal).toBe(false);const deliver=vi.fn(async()=>undefined);await cycle(deliver,new Date(later.getTime()+60000));expect(deliver).not.toHaveBeenCalled()
})
it('F05-T04/T05 changed content and unconfirmed recipient invalidate stored bodies before retry',async()=>{
 await followNiche(db,a(),niche,true);await enable();const row=await link();await cycle(async()=>{throw new Error('offline')});await db.link.update({where:{id:row.id},data:{name:'Texto modificado'}});const deliver=vi.fn(async()=>undefined);await cycle(deliver,new Date(later.getTime()+60000));expect(deliver).not.toHaveBeenCalled();expect((await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}})).status).toBe('SKIPPED')
 await db.user.update({where:{id:user},data:{nextDigestAt:later}});await cycle(async()=>{throw new Error('offline')});await db.userIdentifier.updateMany({where:{userId:user},data:{confirmedAt:null}});await cycle(deliver,new Date(later.getTime()+60000));expect(deliver).not.toHaveBeenCalled();expect(await db.nicheDigestBatch.count({where:{tenantId:tenant,status:'PENDING'}})).toBe(0)
})
it('F05-I01 expiry stops retries at 23 hours; tokens and batch metadata expire after 30 days',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();let email:OutboundEmail|undefined;await cycle(async value=>{email=value;throw new Error('offline')});const token=new URL(email!.text.match(/https?:\/\/[^\s]+\/resumos\/cancelar\?token=[a-f0-9]+/)![0]).searchParams.get('token')!,deliver=vi.fn(async()=>undefined)
 await cycle(deliver,new Date(later.getTime()+23*3600000));expect(deliver).not.toHaveBeenCalled();expect((await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}})).payload).toBeNull();await unsubscribeNicheDigest(db,tenant,token,new Date(later.getTime()+86400000))
 const expired=new Date(later.getTime()+31*86400000);await expect(unsubscribeNicheDigest(db,tenant,token,expired)).rejects.toThrow('expirou');await cycle(deliver,expired);expect(await db.nicheDigestBatch.count({where:{tenantId:tenant}})).toBe(0)
})
it('F05-I02 cookie writes preserve CSRF and stale roles cannot grant another user preference',async()=>{
 const token=app.jwt.sign({sub:user,tenantId:tenant,role:'USER',typ:'access'}),csrf='c'.repeat(32),cookie='accessToken='+token+'; csrf='+csrf
 const call=(headers:Record<string,string>)=>app.inject({method:'PUT',url:'/api/v1/me/followed-niches/'+niche,headers:{host:tenant+'.test',cookie,...headers}})
 expect((await call({})).statusCode).toBe(403);expect(await db.nicheFollow.count({where:{tenantId:tenant}})).toBe(0);expect((await call({'x-csrf-token':csrf})).statusCode).toBe(200)
})

it('F05-I01 operational sending off still clears pending payloads without contacting a provider',async()=>{
 await followNiche(db,a(),niche,true);await enable();await link();await cycle(async()=>{throw new Error('offline')});const deliver=vi.fn(async()=>undefined)
 expect(await runNicheDigestCycle(db,{enabled:false,now:new Date(later.getTime()+60000),deliver})).toEqual({sent:0});expect(deliver).not.toHaveBeenCalled();const batch=await db.nicheDigestBatch.findFirstOrThrow({where:{tenantId:tenant}});expect(batch).toMatchObject({status:'SKIPPED',payload:null});expect((await followedNiches(db,a())).preferences.emailDigest).toBe(true)
})
