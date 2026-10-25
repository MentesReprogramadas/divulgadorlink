import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setProfileBillingForTest} from '@/lib/profile-billing'
import {BASE_PROFILE_CAPABILITIES} from '@/domain/billing/profile-plans'
import type {ProfileContent} from '@/domain/profiles/profile'
import {readOutbound,resetOutboundForTest} from '@/adapters/notifications/outbound-mail'
import sharp from 'sharp'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,foreignOwner:string
const probe=vi.fn(async()=>200),judge=vi.fn(async()=>({pass:true,confidence:.99,reasons:[] as string[]}))
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
 process.env.EMAIL_OUTBOX='1';resetOutboundForTest()
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();probe.mockClear();judge.mockReset();judge.mockResolvedValue({pass:true,confidence:.99,reasons:[]})
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F38 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F38-PRIVATE-NAME',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 setProfilesForTest(db,{probe,judge});setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set(BASE_PROFILE_CAPABILITIES)})
})
afterEach(async()=>{
 delete process.env.EMAIL_OUTBOX;resetOutboundForTest()
 for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.auditLog.deleteMany({where});await db.redirectHandle.deleteMany({where});await db.link.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.config.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}
})
afterAll(async()=>{setProfilesForTest(null);setProfileBillingForTest(null,null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH'|'PUT'|'DELETE',path:string,body?:unknown,actor:string|null=owner,tokenTenant=tenant,requestTenant=tenant,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:requestTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...headers},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID();return{slug:'pagina-f38',name:'F38-PRIVATE-TITLE',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true}]}}
async function save(value=content(),expectedVersion=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion});expect(r.statusCode,r.body).toBe(200);return value}

async function invite(role='EDITOR',requestKey=randomUUID()){const p=await db.profile.findUniqueOrThrow({where:{tenantId_ownerId:{tenantId:tenant,ownerId:owner}}});const r=await call('POST','me/profile/invitations',{resourceId:p.id,email:other+'@fixture.test',role,requestKey});expect(r.statusCode,r.body).toBe(200);return {...r.json(),profileId:p.id,requestKey}}
const accept=(token:string,actor=other)=>call('POST','invitations/accept',{token},actor)
const shared=(method:'GET'|'PATCH'|'POST',id:string,path='',body?:unknown,actor=other)=>call(method,'me/profile'+path,body,actor,tenant,tenant,{'x-profile-id':id})
it('conta sem e-mail confirmado não usa convites de página para enviar mensagens',async()=>{
 await save();await db.userIdentifier.updateMany({where:{userId:owner,tenantId:tenant},data:{confirmedAt:null}})
 const profile=await db.profile.findUniqueOrThrow({where:{tenantId_ownerId:{tenantId:tenant,ownerId:owner}}})
 expect((await call('POST','me/profile/invitations',{resourceId:profile.id,email:other+'@fixture.test',role:'EDITOR',requestKey:randomUUID()})).statusCode).toBe(403)
 expect(readOutbound(other+'@fixture.test')).toHaveLength(0)
 expect(await db.profileInvitation.count({where:{tenantId:tenant}})).toBe(0)
})
it('foto nova passa com pixels pela mesma aprovação da página e não vaza antes de aprovar',async()=>{
 const bytes=await sharp({create:{width:16,height:16,channels:3,background:'navy'}}).webp().toBuffer()
 const uploaded=await call('POST','me/profile/avatar',{base64:bytes.toString('base64')});expect(uploaded.statusCode,uploaded.body).toBe(200)
 const value={...content(),avatarAssetId:uploaded.json().avatarAssetId};await save(value)
 judge.mockResolvedValueOnce({pass:false,confidence:.99,reasons:['Conferir imagem']})
 const published=await call('POST','me/profile/publish',{expectedVersion:1});expect(published.statusCode,published.body).toBe(200)
 expect(published.json().review.status).toBe('PENDING')
 expect(judge).toHaveBeenCalledWith(expect.objectContaining({images:[expect.objectContaining({mimeType:'image/webp',label:'Foto da página',base64:expect.any(String)})]}))
 expect((await call('GET','profiles/'+value.slug+'/avatar/'+value.avatarAssetId,undefined,null)).statusCode).toBe(404)
})
it('convite de página envia o link por e-mail sem duplicar em repetição',async()=>{
 await save();const created=await invite()
 expect(created.emailDelivery).toBe('sent')
 const mail=readOutbound(other+'@fixture.test')
 expect(mail).toHaveLength(1)
 expect(mail[0].kind).toBe('profile_invitation')
 expect(mail[0].text).toContain(tenant+'.test/equipe/convite?token='+created.token)
 expect(mail[0].text).not.toContain('scope=workspace')
 await invite('EDITOR',created.requestKey)
 expect(readOutbound(other+'@fixture.test')).toHaveLength(1)
})
it('F20-T01/T02/T03/I01 concurrent acceptance creates one membership, scoped editing and actual actor audit',async()=>{
 const value=await save(),i=await invite();expect(new Date(i.invitation.expiresAt).getTime()-Date.now()).toBeGreaterThan(6.9*86400000)
 expect((await Promise.all([accept(i.token),accept(i.token)])).map(r=>r.statusCode).sort()).toEqual([200,409]);expect(await db.profileMembership.count({where:{profileId:i.profileId}})).toBe(1)
 expect((await shared('GET',i.profileId)).json().access.role).toBe('EDITOR')
 const update=await shared('PATCH',i.profileId,'',{expectedVersion:1,content:{...value,bio:'Colaborador'}});expect(update.statusCode,update.body).toBe(200)
 expect(await db.auditLog.count({where:{tenantId:tenant,actorId:other,entityId:i.profileId,action:'profile.collaborator.changed'}})).toBe(1)
 expect((await shared('POST',i.profileId,'/publish',{expectedVersion:2})).statusCode).toBe(200)
})
it('F20-T04 old session and used token cannot restore revoked access',async()=>{
 const value=await save(),i=await invite(),a=await accept(i.token);expect(a.statusCode,a.body).toBe(200)
 expect((await call('DELETE','me/profile/members/'+a.json().membership.id,{expectedVersion:1})).statusCode).toBe(200)
 expect((await shared('GET',i.profileId)).statusCode).toBe(403);expect((await shared('PATCH',i.profileId,'',{expectedVersion:1,content:value})).statusCode).toBe(403);expect((await accept(i.token)).statusCode).toBe(409)
 expect((await db.profile.findUniqueOrThrow({where:{id:i.profileId}})).version).toBe(1)
})
it('F20-T05/I02 foreign tenant, wrong recipient, anonymous and ungranted resource are denied',async()=>{
 await save();const i=await invite();expect((await accept(i.token,owner)).statusCode).toBe(403);expect((await call('POST','invitations/accept',{token:i.token},null)).statusCode).toBe(401);expect((await call('POST','invitations/accept',{token:i.token},foreignOwner,foreign,foreign)).statusCode).toBe(404)
 expect((await shared('GET',i.profileId)).statusCode).toBe(403);await accept(i.token);expect((await shared('GET',randomUUID())).statusCode).toBe(404)
 for(const path of ['/export?revision=draft','/campaigns','/revisions','/team'])expect((await shared('GET',i.profileId,path)).statusCode).toBe(403)
 expect((await shared('POST',i.profileId,'/apply-template',{})).statusCode).toBe(403)
 expect((await call('GET','me/profile',undefined,other,tenant,foreign,{'x-profile-id':i.profileId})).statusCode).toBe(403)
})
it('F20-T01 reader sees only allowed page and cannot edit, upload or publish',async()=>{
 const value=await save(),i=await invite('VIEWER');await accept(i.token);await db.contentReview.create({data:{tenantId:tenant,ownerId:owner,profileId:i.profileId,version:1,kind:'PROFILE',status:'REJECTED',reason:'Revisão necessária',snapshot:value}});expect((await shared('GET',i.profileId)).json().review.canAppeal).toBe(false)
 for(const path of ['', '/preview','/preview/items','/catalog','/channel-groups']){const r=await shared('GET',i.profileId,path);expect(r.statusCode,r.body).toBe(200)}
 expect((await shared('PATCH',i.profileId,'',{expectedVersion:1,content:value})).statusCode).toBe(403);expect((await shared('POST',i.profileId,'/publish',{expectedVersion:1})).statusCode).toBe(403);expect((await shared('POST',i.profileId,'/avatar',{base64:''})).statusCode).toBe(403)
})
it('F20-T02 expired/revoked invitations and unconfirmed accounts cannot accept',async()=>{
 await save();const i=await invite();await db.profileInvitation.update({where:{id:i.invitation.id},data:{expiresAt:new Date(0)}});expect((await accept(i.token)).statusCode).toBe(409)
 const next=await invite();await db.userIdentifier.updateMany({where:{userId:other},data:{confirmedAt:null}});expect((await accept(next.token)).statusCode).toBe(403);await db.userIdentifier.updateMany({where:{userId:other},data:{confirmedAt:new Date()}})
 expect((await call('DELETE','me/profile/invitations/'+next.invitation.id)).statusCode).toBe(200);expect((await accept(next.token)).statusCode).toBe(409)
})
it('F20-U03/I03 idempotent creation lists no token or recipient and rejects changed request',async()=>{
 await save();const i=await invite(),stored=await db.profileInvitation.findUniqueOrThrow({where:{id:i.invitation.id}});expect(JSON.stringify(stored)).not.toContain(i.token);expect(JSON.stringify(stored)).not.toContain(other+'@fixture.test')
 const repeat=await invite('EDITOR',i.requestKey);expect(repeat.token).toBeNull();expect(repeat.invitation.id).toBe(i.invitation.id)
 const list=await call('GET','me/profile/team');expect(list.body).not.toMatch(/tokenHash|recipientHash|requestKey/);expect(list.body).not.toContain(i.token)
 expect((await call('POST','me/profile/invitations',{resourceId:i.profileId,email:other+'@fixture.test',role:'VIEWER',requestKey:i.requestKey})).statusCode).toBe(409);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.team.invited'}})).toBe(1)
})
it('F20-T01 resource owner suspension and member verification remain enforced',async()=>{
 await save();const i=await invite();await accept(i.token);await db.userIdentifier.updateMany({where:{userId:other},data:{confirmedAt:null}});expect((await shared('POST',i.profileId,'/publish',{expectedVersion:1})).statusCode).toBe(403)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await shared('GET',i.profileId)).statusCode).toBe(403)
})
it('F20-PG01 composite keys and role checks reject foreign associations',async()=>{
 await save();const i=await invite();for(const data of [{profileId:i.profileId,tenantId:tenant,ownerId:owner,userId:foreignOwner,role:'EDITOR'},{profileId:i.profileId,tenantId:tenant,ownerId:other,userId:owner,role:'EDITOR'},{profileId:i.profileId,tenantId:tenant,ownerId:owner,userId:other,role:'ADMIN'}])await expect(db.profileMembership.create({data})).rejects.toThrow()
})
it('F20-I03 failed membership persistence rolls back invitation use and audit, retry succeeds',async()=>{
 await save();const i=await invite();await db.$executeRawUnsafe(`CREATE FUNCTION f20_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F20 fault'; END $$`);await db.$executeRawUnsafe(`CREATE TRIGGER f20_failure BEFORE INSERT ON profile_memberships FOR EACH ROW EXECUTE FUNCTION f20_fail()`)
 try{expect((await accept(i.token)).statusCode).toBe(500);expect((await db.profileInvitation.findUniqueOrThrow({where:{id:i.invitation.id}})).usedAt).toBeNull();expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.team.accepted'}})).toBe(0)}finally{await db.$executeRawUnsafe('DROP TRIGGER f20_failure ON profile_memberships');await db.$executeRawUnsafe('DROP FUNCTION f20_fail()')}
 expect((await accept(i.token)).statusCode).toBe(200)
})
it('F20-T04 unused older invitation cannot undo revocation; only a new owner invitation can regrant',async()=>{
 await save();const first=await invite(),older=await invite();const accepted=await accept(first.token);expect(accepted.statusCode).toBe(200);expect((await call('DELETE','me/profile/members/'+accepted.json().membership.id,{expectedVersion:1})).statusCode).toBe(200);expect((await accept(older.token)).statusCode).toBe(409);const fresh=await invite();expect((await accept(fresh.token)).statusCode).toBe(200)
})

it('F20-T01/T05 page editor sees approved sources and bound drafts only; reader cannot browse unrelated resources',async()=>{
 await save();const i=await invite();await accept(i.token);const handle=await db.redirectHandle.create({data:{tenantId:tenant,ownerId:owner,creationKey:randomUUID(),creationHash:'fixture'}}),pending=await db.redirectDestination.create({data:{handleId:handle.id,tenantId:tenant,number:1,requestKey:randomUUID(),requestHash:'fixture',label:'PRIVATE-UNBOUND',destinationUrl:'https://example.com/private-pending',status:'PENDING_REVIEW'}})
 expect((await shared('GET',i.profileId,'/channel-destinations/'+pending.id)).statusCode).toBe(404)
 const value=await db.profile.findUniqueOrThrow({where:{id:i.profileId}}),saved=await call('GET','me/profile');const group=saved.json().draft.categories[0].id
 const binding=await call('PUT','me/profile/channel-groups/'+group,{expectedVersion:value.version,name:'Projetos',visible:true,channels:[{id:randomUUID(),label:'UNAUTHORIZED',networkId:null,destinationRevisionId:pending.id,paused:false,showLabel:true}]},other,tenant,tenant,{'x-profile-id':i.profileId});expect([403,404]).toContain(binding.statusCode)
 const accepted=await db.profileMembership.findFirstOrThrow({where:{profileId:i.profileId}});await db.profileMembership.update({where:{id:accepted.id},data:{role:'VIEWER'}});expect((await shared('GET',i.profileId,'/channel-destinations')).statusCode).toBe(403)
})
