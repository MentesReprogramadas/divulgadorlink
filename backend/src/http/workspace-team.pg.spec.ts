import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setWorkspaceDbForTest} from '@/http/workspace-access'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setProfileBillingForTest} from '@/lib/profile-billing'
import {BASE_PROFILE_CAPABILITIES} from '@/domain/billing/profile-plans'
import type {ProfileContent} from '@/domain/profiles/profile'
import {permissionSections} from '@/domain/access/workspace-permissions'
import {readOutbound,resetOutboundForTest} from '@/adapters/notifications/outbound-mail'
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
 setProfilesForTest(db,{probe,judge});setWorkspaceDbForTest(db);setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set(BASE_PROFILE_CAPABILITIES)})
})
afterEach(async()=>{
 vi.unstubAllGlobals();vi.unstubAllEnvs()
 delete process.env.EMAIL_OUTBOX;resetOutboundForTest()
 for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.auditLog.deleteMany({where});await db.link.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.config.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}
})
afterAll(async()=>{setProfilesForTest(null);setWorkspaceDbForTest(null);setProfileBillingForTest(null,null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH'|'DELETE',path:string,body?:unknown,actor:string|null=owner,tokenTenant=tenant,requestTenant=tenant,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:requestTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...headers},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID();return{slug:'pagina-f38',name:'F38-PRIVATE-TITLE',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true}]}}
async function save(value=content(),expectedVersion=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion});expect(r.statusCode,r.body).toBe(200);return value}
const get=(revision='draft')=>call('GET','me/profile/export?revision='+revision)

const grants={page:{read:true,write:true},campaigns:{read:true,write:false}}
it('convite de equipe chega por e-mail uma vez, com o tenant e o escopo corretos',async()=>{
 const input={email:other+'@fixture.test',grants,requestKey:randomUUID()}
 const sent=await call('POST','team/invitations',input)
 expect(sent.statusCode,sent.body).toBe(200)
 expect(sent.json().emailDelivery).toBe('sent')
 const mail=readOutbound(input.email)
 expect(mail).toHaveLength(1)
 expect(mail[0].kind).toBe('workspace_invitation')
 expect(mail[0].text).toContain(tenant+'.test/equipe/convite?scope=workspace&token='+sent.json().token)
 expect(mail[0].subject).not.toContain(sent.json().token)
 expect((await call('POST','team/invitations',input)).json().token).toBeNull()
 expect(readOutbound(input.email)).toHaveLength(1)
})
it('falha do provedor mantém convite revogável e nunca confirma envio por e-mail',async()=>{
 delete process.env.EMAIL_OUTBOX
 vi.stubEnv('RESEND_API_KEY','test-key');vi.stubEnv('EMAIL_FROM','teste@example.test')
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:503})))
 const created=await call('POST','team/invitations',{email:other+'@fixture.test',grants,requestKey:randomUUID()})
 expect(created.statusCode,created.body).toBe(200)
 expect(created.json()).toMatchObject({emailDelivery:'failed',token:expect.any(String)})
 const invitations=(await call('GET','team')).json().invitations
 expect(invitations).toHaveLength(1)
 expect((await call('DELETE','team/invitations/'+invitations[0].id)).statusCode).toBe(200)
 expect((await call('POST','team/accept',{token:created.json().token},other)).statusCode).toBe(409)
})
async function inviteWorkspace(value=grants){const r=await call('POST','team/invitations',{email:other+'@fixture.test',grants:value,requestKey:randomUUID()});expect(r.statusCode,r.body).toBe(200);return r.json().token as string}
async function join(value=grants){const token=await inviteWorkspace(value),r=await call('POST','team/accept',{token},other);expect(r.statusCode,r.body).toBe(200);return token}
function scoped(method:'GET'|'POST'|'PATCH'|'DELETE',path:string,body?:unknown){return call(method,path,body,other,tenant,tenant,{cookie:'workspaceOwner='+owner})}
it('global team does not require a profile, accepts only once and stores hashed invitations',async()=>{
 const token=await inviteWorkspace();const stored=await db.$queryRaw<Array<{tokenHash:string}>>`SELECT "tokenHash" FROM workspace_invitations WHERE "tenantId"=${tenant}`;expect(JSON.stringify(stored)).not.toContain(token)
 const result=await Promise.all([call('POST','team/accept',{token},other),call('POST','team/accept',{token},other)]);expect(result.map(r=>r.statusCode).sort()).toEqual([200,409]);expect((await call('GET','team/workspaces',undefined,other)).json().workspaces).toHaveLength(1);expect(await db.profile.count({where:{tenantId:tenant}})).toBe(0)
})
it('write implies read, unknown grants cannot be injected, tokens are bound to tenant and confirmed email',async()=>{
 for(const value of [{page:{read:false,write:true}},{admin:{read:true,write:true}}])expect((await call('POST','team/invitations',{email:other+'@fixture.test',grants:value,requestKey:randomUUID()})).statusCode).toBe(400)
 const token=await inviteWorkspace();expect((await call('POST','team/accept',{token},owner)).statusCode).toBe(403);expect((await call('POST','team/accept',{token},null)).statusCode).toBe(401);expect((await call('POST','team/accept',{token},foreignOwner,foreign,foreign)).statusCode).toBe(404);await db.userIdentifier.updateMany({where:{userId:other},data:{confirmedAt:null}});expect((await call('POST','team/accept',{token},other)).statusCode).toBe(403)
})
it('server enforces section grants for every request and audits actual collaborator',async()=>{
 const value=await save();await join();expect((await scoped('GET','me/profile')).json().draft.name).toBe(value.name);const changed=await scoped('PATCH','me/profile',{expectedVersion:1,content:{...value,bio:'Equipe global'}});expect(changed.statusCode,changed.body).toBe(200)
 expect(await db.auditLog.count({where:{tenantId:tenant,actorId:other,entityType:'Workspace',entityId:owner,action:'workspace.collaborator.changed'}})).toBe(1)
 for(const path of ['me/profile/export?revision=draft','me/profile/media-kit','me/redirects','links/mine','me/favorites','team','admin/users'])expect((await scoped('GET',path)).statusCode,path).toBe(403)
 expect((await scoped('POST','me/profile/campaigns',{})).statusCode).toBe(403);expect((await scoped('GET','me/profile/campaigns')).statusCode).toBe(200)
 expect((await scoped('POST','links/account/email',{email:'victim@example.com'})).statusCode).toBe(403)
})
it('readonly membership never saves, permission changes and revocation apply to an already open session',async()=>{
 const value=await save();await join({page:{read:true,write:false},campaigns:{read:true,write:false}})
 expect((await scoped('PATCH','me/profile',{expectedVersion:1,content:{...value,bio:'Denied'}})).statusCode).toBe(403)
 const m=(await call('GET','team')).json().members[0];expect((await call('PATCH','team/members/'+m.id,{grants,expectedVersion:m.version})).statusCode).toBe(200);expect((await scoped('PATCH','me/profile',{expectedVersion:1,content:{...value,bio:'Allowed'}})).statusCode).toBe(200)
 expect((await call('DELETE','team/members/'+m.id,{expectedVersion:m.version})).statusCode).toBe(409);expect((await call('DELETE','team/members/'+m.id,{expectedVersion:m.version+1})).statusCode).toBe(200)
 expect((await scoped('GET','me/profile')).statusCode).toBe(403);expect((await scoped('PATCH','me/profile',{expectedVersion:2,content:value})).statusCode).toBe(403)
})
it('revoking a member also blocks unused earlier invitations, including after email changes',async()=>{
 await join();const token=await inviteWorkspace();await db.userIdentifier.updateMany({where:{userId:other},data:{normalizedValue:'changed@fixture.test'}});const m=(await call('GET','team')).json().members[0];expect((await call('DELETE','team/members/'+m.id,{expectedVersion:m.version})).statusCode).toBe(200);await db.userIdentifier.updateMany({where:{userId:other},data:{normalizedValue:other+'@fixture.test'}});expect((await call('POST','team/accept',{token},other)).statusCode).toBe(409)
})
it('import validates format, preserves public version, tenant scope, slug and optimistic concurrency',async()=>{
 const value=await save();expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200);const backup=(await get()).json();backup.profile.name='Importado';const preview=await call('POST','me/profile/backup/preview',{backup});expect(preview.statusCode,preview.body).toBe(200);const input={backup,expectedVersion:preview.json().expectedVersion};const result=await call('POST','me/profile/backup/import',input);expect(result.statusCode,result.body).toBe(200);expect(result.json().draft.name).toBe('Importado');expect(result.json().publishedContent.name).toBe(value.name);expect(result.json().draft.slug).toBe(value.slug);expect(result.json().draft.items[0].id).not.toBe(value.items[0].id);expect((await call('POST','me/profile/backup/import',input)).statusCode).toBe(409)
 backup.profile.ownerId=other;expect((await call('POST','me/profile/backup/preview',{backup})).statusCode).toBe(400)
})
it('import rejects unsafe destinations and foreign catalog references without changing the draft',async()=>{
 await save();const backup=(await get()).json();backup.items[0].destination='https://127.0.0.1/private';expect((await call('POST','me/profile/backup/preview',{backup})).statusCode).toBe(422);backup.items[0].destination=randomUUID();backup.items[0].type='CATALOG';expect((await call('POST','me/profile/backup/import',{backup,expectedVersion:1})).statusCode).toBe(404);expect((await call('GET','me/profile')).json().draft.version).toBe(1)
})
it('selected workspace cannot be forged across tenant, with suspended owner or pending actor email',async()=>{
 await save();await join();expect((await call('GET','me/profile',undefined,foreignOwner,foreign,foreign,{cookie:'workspaceOwner='+owner})).statusCode).toBe(403)
 await db.userIdentifier.updateMany({where:{userId:other},data:{confirmedAt:null}});expect((await scoped('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(403);await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await scoped('GET','me/profile')).statusCode).toBe(403)
})

it('only an ADMIN can grant administrative sections; delegation never changes global role',async()=>{
 const denied=await call('POST','team/invitations',{email:other+'@fixture.test',grants:{adminBilling:{read:true,write:true}},requestKey:randomUUID()});expect(denied.statusCode).toBe(403)
 const created=await call('POST','team/invitations',{email:owner+'@fixture.test',grants:{adminBilling:{read:true,write:false}},requestKey:randomUUID()},other);expect(created.statusCode,created.body).toBe(200)
 expect((await call('POST','team/accept',{token:created.json().token},owner)).statusCode).toBe(200)
 const headers={cookie:'workspaceOwner='+other};const allowed=await call('GET','admin/profile-billing',undefined,owner,tenant,tenant,headers);expect(allowed.statusCode,allowed.body).toBe(200)
 expect((await call('POST','admin/profile-billing/events/'+randomUUID()+'/retry',{},owner,tenant,tenant,headers)).statusCode).toBe(403)
 expect((await call('GET','admin/office',undefined,owner,tenant,tenant,headers)).statusCode).toBe(403)
 expect((await db.user.findUniqueOrThrow({where:{id:owner}})).role).toBe('USER')
 expect((await call('GET','admin/profile-billing',undefined,owner)).statusCode).toBe(403)
 await db.user.update({where:{id:other},data:{role:'USER'}});expect((await call('GET','admin/profile-billing',undefined,owner,tenant,tenant,headers)).statusCode).toBe(403)
})

it('ordinary accounts cannot list, invite or add any administrative grant, even with an ADMIN token',async()=>{
 // The helper issues an ADMIN token for other; the database remains authoritative.
 await db.user.update({where:{id:other},data:{role:'USER'}})
 expect((await call('GET','team',undefined,other)).json().sections.some((row:{id:string})=>row.id.startsWith('admin'))).toBe(false)
 const invited=await call('POST','team/invitations',{email:owner+'@fixture.test',grants,requestKey:randomUUID()},other)
 expect(invited.statusCode,invited.body).toBe(200)
 expect((await call('POST','team/accept',{token:invited.json().token})).statusCode).toBe(200)
 const member=(await call('GET','team',undefined,other)).json().members[0]
 for(const section of permissionSections.filter(row=>row.id.startsWith('admin'))){
 for(const write of [false,true]){
 const elevated={[section.id]:{read:true,write}}
 expect((await call('POST','team/invitations',{email:owner+'@fixture.test',grants:elevated,requestKey:randomUUID()},other)).statusCode,section.id).toBe(403)
 expect((await call('PATCH','team/members/'+member.id,{grants:elevated,expectedVersion:member.version},other)).statusCode,section.id).toBe(403)
 }
 }
 expect((await call('GET','team',undefined,other)).json().members[0]).toMatchObject({version:member.version,grants})
 expect(await db.$queryRaw`SELECT id FROM workspace_invitations WHERE "tenantId"=${tenant}`).toHaveLength(1)
 expect((await db.user.findUniqueOrThrow({where:{id:owner}})).role).toBe('USER')
})

it('administrative invitations cannot be accepted after the owner loses ADMIN, and remain unused',async()=>{
 const created=await call('POST','team/invitations',{email:owner+'@fixture.test',grants:{adminSettings:{read:true,write:true}},requestKey:randomUUID()},other)
 expect(created.statusCode,created.body).toBe(200)
 await db.user.update({where:{id:other},data:{role:'USER'}})
 const accepted=await call('POST','team/accept',{token:created.json().token})
 expect(accepted.statusCode,accepted.body).toBe(403)
 expect(await db.$queryRaw`SELECT id FROM workspace_memberships WHERE "tenantId"=${tenant}`).toHaveLength(0)
 expect(await db.$queryRaw`SELECT "usedAt" FROM workspace_invitations WHERE "tenantId"=${tenant}`).toEqual([{usedAt:null}])
 expect(await db.auditLog.count({where:{tenantId:tenant,action:'workspace.accepted'}})).toBe(0)
})

it('explicit workspace selector remains authorized and cannot cross tenant or override a legacy profile scope',async()=>{
 await save();await join();const headers={cookie:'workspaceOwner='+foreignOwner,'x-workspace-owner':owner};const result=await call('GET','me/profile',undefined,other,tenant,tenant,headers);expect(result.statusCode,result.body).toBe(200)
 expect((await call('GET','me/profile',undefined,other,tenant,tenant,{cookie:'workspaceOwner='+owner,'x-workspace-owner':foreignOwner})).statusCode).toBe(403)
 expect((await call('GET','me/profile',undefined,other,tenant,tenant,{cookie:'workspaceOwner='+owner,'x-workspace-owner':'self'})).json().draft).toBeNull()
 expect((await call('GET','me/profile',undefined,other,tenant,tenant,{...headers,'x-profile-id':randomUUID()})).statusCode).toBe(403)
})
