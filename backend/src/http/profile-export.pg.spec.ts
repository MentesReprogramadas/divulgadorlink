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
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F38 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F38-PRIVATE-NAME',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 setProfilesForTest(db,{probe,judge});setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set(BASE_PROFILE_CAPABILITIES)})
})
afterEach(async()=>{
 for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.auditLog.deleteMany({where});await db.link.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.config.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}
})
afterAll(async()=>{setProfilesForTest(null);setProfileBillingForTest(null,null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',path:string,body?:unknown,actor:string|null=owner,tokenTenant=tenant,requestTenant=tenant,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:requestTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...headers},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID();return{slug:'pagina-f38',name:'F38-PRIVATE-TITLE',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true}]}}
async function save(value=content(),expectedVersion=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion});expect(r.statusCode,r.body).toBe(200);return value}
const get=(revision='draft')=>call('GET','me/profile/export?revision='+revision)
it('F38-T01/I02 private export is scoped to session and tenant, including ADMIN',async()=>{
 await save();expect((await call('GET','me/profile/export?revision=draft',undefined,null)).statusCode).toBe(401)
 expect((await call('GET','me/profile/export?revision=draft',undefined,other)).statusCode).toBe(404)
 expect((await call('GET','me/profile/export?revision=draft&ownerId='+owner,undefined,other)).statusCode).toBe(400)
 expect((await call('GET','me/profile/export?revision=draft',undefined,owner,tenant,foreign)).statusCode).toBe(403)
 expect((await call('GET','me/profile/export?revision=draft',undefined,foreignOwner,foreign,foreign)).statusCode).toBe(404)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await get()).statusCode).toBe(403)
})
it('F38-T02/T03/T04/T05/PG01 export keeps authoring order without private database fields or automatic restoration',async()=>{
 const value=await save();const r=await get();expect(r.statusCode,r.body).toBe(200);expect(r.headers['cache-control']).toBe('private, no-store');expect(r.headers['content-disposition']).toContain('attachment; filename="minha-pagina-draft.json"')
 expect(r.json()).toMatchObject({schemaVersion:1,revision:'draft',profile:{name:value.name},categories:value.categories,items:value.items})
 expect(r.body).not.toMatch(/password|tenantId|ownerId|fixture.test|profileAsset|surfaceToken/);expect(r.json().omissions.join(' ')).toContain('não publica automaticamente')
 expect((await get('published')).statusCode).toBe(404)
 expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200)
 await save({...value,name:'Rascunho novo'},1)
 expect((await get('published')).json().profile.name).toBe(value.name);expect((await get()).json().profile.name).toBe('Rascunho novo')
})
it('F38-I03 repeated export is a pure read and missing versions are recoverable',async()=>{
 expect((await get()).statusCode).toBe(404);await save();const before=await db.profile.findFirstOrThrow({where:{tenantId:tenant}}),audits=await db.auditLog.count({where:{tenantId:tenant}})
 await get();await get();expect(await db.profile.findFirstOrThrow({where:{tenantId:tenant}})).toEqual(before);expect(await db.auditLog.count({where:{tenantId:tenant}})).toBe(audits)
 expect((await get('invalid')).statusCode).toBe(400)
})
