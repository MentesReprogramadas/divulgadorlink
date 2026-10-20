import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {setContactDbForTest} from '@/http/controllers/@Profiles/contact-routes'
import {setWorkspaceDbForTest} from '@/http/workspace-access'
import {purgeContacts} from '@/repositories/contact-forms'
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
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F22 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'F22-PRIVATE-NAME',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 setProfilesForTest(db,{probe,judge});setContactDbForTest(db);setWorkspaceDbForTest(db);setProfileBillingForTest(db,{enabled:false,production:false,gateway:null,webhookReady:false,delivered:new Set(BASE_PROFILE_CAPABILITIES)})
})
afterEach(async()=>{
 for(const tenantId of [tenant,foreign]){const where={tenantId};await db.operationalMessage.deleteMany({where});await db.contentReview.deleteMany({where});await db.profile.deleteMany({where});await db.auditLog.deleteMany({where});await db.link.deleteMany({where});await db.niche.deleteMany({where});await db.network.deleteMany({where});await db.config.deleteMany({where});await db.userIdentifier.deleteMany({where});await db.user.deleteMany({where});await db.tenant.deleteMany({where:{id:tenantId}})}
})
afterAll(async()=>{setProfilesForTest(null);setContactDbForTest(null);setWorkspaceDbForTest(null);setProfileBillingForTest(null,null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH'|'PUT'|'DELETE',path:string,body?:unknown,actor:string|null=owner,tokenTenant=tenant,requestTenant=tenant,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:requestTenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:tokenTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{}),...headers},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID();return{slug:'pagina-f22',name:'F22-PRIVATE-TITLE',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:g,name:'Projetos',visible:true}],items:[{id:randomUUID(),categoryId:g,type:'URL',label:'Meu projeto',destination:'https://example.com/projeto',visible:true}]}}
async function save(value=content(),expectedVersion=0){const r=await call('PATCH','me/profile',{content:value,expectedVersion});expect(r.statusCode,r.body).toBe(200);return value}

const definition={enabled:true,purpose:'contact',marketingAllowed:true,fields:[{key:'name',required:false},{key:'email',required:true},{key:'message',required:false}]}
async function prepare(){await save();expect((await call('POST','me/profile/publish',{expectedVersion:1})).statusCode).toBe(200);const result=await call('PUT','me/forms',{definition,expectedVersion:0});expect(result.statusCode,result.body).toBe(200);return(await call('GET','profiles/pagina-f22/contact-form',undefined,null)).json().form as {revisionId:string}}
const submit=(revisionId:string,answers:unknown={email:'private@example.com',message:'PRIVATE-SENTINEL'},requestKey=randomUUID(),extras={})=>call('POST','profiles/pagina-f22/contact-form/submissions',{revisionId,answers,requestKey,marketingOptIn:false,website:'',...extras},null)
it('F22-T01/I02 respostas privadas exigem sessão, tenant e permissão global própria; revogação é imediata',async()=>{
 const form=await prepare();await submit(form.revisionId)
 expect((await call('GET','me/forms/submissions',undefined,null)).statusCode).toBe(401)
 expect((await call('GET','me/forms/submissions',undefined,other)).statusCode).toBe(404)
 expect((await call('GET','me/forms/submissions',undefined,owner,tenant,foreign)).statusCode).toBe(403)
 await db.$executeRaw`INSERT INTO workspace_memberships(id,"tenantId","ownerId","userId",grants) VALUES(${randomUUID()},${tenant},${owner},${other},${JSON.stringify({contacts:{read:true,write:false}})}::jsonb)`
 const headers={'x-workspace-owner':owner};const read=await call('GET','me/forms/submissions',undefined,other,tenant,tenant,headers);expect(read.statusCode,read.body).toBe(200);expect(read.body).toContain('PRIVATE-SENTINEL')
 expect((await call('DELETE','me/forms/submissions/'+read.json().items[0].id,undefined,other,tenant,tenant,headers)).statusCode).toBe(403)
 await db.$executeRaw`UPDATE workspace_memberships SET grants=${JSON.stringify({contacts:{read:true,write:true}})}::jsonb WHERE "tenantId"=${tenant}`;expect((await call('PUT','me/forms',{definition,expectedVersion:1},other,tenant,tenant,headers)).statusCode).toBe(200);expect((await db.auditLog.findFirst({where:{tenantId:tenant,action:'contact.form.configured'},orderBy:{createdAt:'desc'}}))?.actorId).toBe(other)
 await db.$executeRaw`UPDATE workspace_memberships SET "revokedAt"=CURRENT_TIMESTAMP WHERE "tenantId"=${tenant}`
 expect((await call('GET','me/forms/submissions',undefined,other,tenant,tenant,headers)).statusCode).toBe(403)
})
it('F22-T02/I01 antispam persistente e reenvio concorrente sem duplicar; payload alterado não reaproveita chave',async()=>{
 const {revisionId}=await prepare(),key=randomUUID(),results=await Promise.all(Array.from({length:3},()=>submit(revisionId,{email:'private@example.com'},key)))
 expect(results.map(r=>r.statusCode)).toEqual([200,200,200]);expect(new Set(results.map(r=>r.json().id)).size).toBe(1)
 expect((await submit(revisionId,{email:'changed@example.com'},key)).statusCode).toBe(409)
 for(let i=0;i<4;i++)expect((await submit(revisionId)).statusCode).toBe(200)
 expect((await submit(revisionId)).statusCode).toBe(429)
 expect((await submit(revisionId,{email:'another-visitor@example.com'})).statusCode).toBe(200)
 expect((await submit(revisionId,{email:'private@example.com'},key)).statusCode).toBe(200)
 expect((await call('GET','me/forms/submissions')).json().items).toHaveLength(6)
 const bucket=await db.$queryRaw<{key:string}[]>`SELECT key FROM contact_rate_buckets`;expect(bucket.some(r=>r.key.includes('127.0.0.1'))).toBe(false)
})
it('F22-T03 envio inválido e antirrobô não anunciam sucesso ou persistem; preferência de novidades é separada',async()=>{
 const {revisionId}=await prepare();expect((await submit(revisionId,{email:''})).statusCode).toBe(400);expect((await submit(revisionId,{email:'invalid'})).statusCode).toBe(400);expect((await submit(revisionId,{email:'x@example.com',privateNote:'injected'})).statusCode).toBe(400)
 expect((await submit(revisionId,undefined,randomUUID(),{website:'robot'})).statusCode).toBe(429)
 expect((await call('GET','me/forms/submissions')).json().items).toHaveLength(0)
 const result=await submit(revisionId);expect(result.statusCode).toBe(200);expect(result.body).not.toContain('PRIVATE-SENTINEL');const item=(await call('GET','me/forms/submissions')).json().items[0];expect(item.marketingOptIn).toBe(false)
})
it('F22-T04 retenção e exclusão removem contatos e preferência; CSV escapa fórmulas e não inclui chaves internas',async()=>{
 const {revisionId}=await prepare();await submit(revisionId,{email:'private@example.com',message:'=HYPERLINK("unsafe")'});const page=(await call('GET','me/forms/submissions')).json();const csv=(await call('GET','me/forms/submissions/export')).json().csv;expect(csv).toContain(String.fromCharCode(34,39)+'=HYPERLINK');expect(csv).not.toMatch(/tenantId|fingerprint|requestKey|ownerId/)
 expect((await call('DELETE','me/forms/submissions/'+page.items[0].id)).statusCode).toBe(200);expect((await call('GET','me/forms/submissions')).json().items).toHaveLength(0)
 await submit(revisionId);await db.$executeRaw`UPDATE contact_submissions SET "expiresAt"=CURRENT_TIMESTAMP-INTERVAL '1 second'`;await purgeContacts(db);expect((await call('GET','me/forms/submissions')).json().items).toHaveLength(0)
})
it('F22-T05 configuração pública é allowlist sem contatos; configuração concorrente, rascunho, idade e suspensão são preservados',async()=>{
 const {revisionId}=await prepare();await submit(revisionId)
 const publicResponse=await call('GET','profiles/pagina-f22/items',undefined,null);expect(publicResponse.statusCode,publicResponse.body).toBe(200);expect(publicResponse.body).not.toMatch(/PRIVATE-SENTINEL|private@example.com|marketingOptIn|fingerprint/)
 expect((await call('PUT','me/forms',{definition,expectedVersion:0})).statusCode).toBe(409)
 expect((await call('PUT','me/forms',{definition:{...definition,fields:[{key:'email',required:false}]},expectedVersion:1})).statusCode).toBe(400)
 await call('PUT','me/forms',{definition:{...definition,enabled:false},expectedVersion:1});expect((await submit(revisionId)).statusCode).toBe(409)
 await call('POST','me/profile/unpublish',{expectedVersion:1});expect((await call('GET','profiles/pagina-f22/contact-form',undefined,null)).statusCode).toBe(404)
})
