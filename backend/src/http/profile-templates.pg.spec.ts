import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import {setContentReviewsForTest} from '@/http/controllers/@Moderation/content-reviews'
import type {ProfileContent} from '@/domain/profiles/profile'
import type {ProfileValidationPorts} from '@/use-cases/@Profiles/validate-profile'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,foreignOwner:string,ports:ProfileValidationPorts
const probe=vi.fn<ProfileValidationPorts['probe']>(async()=>200),judge=vi.fn<ProfileValidationPorts['judge']>(async()=>({pass:true,confidence:.99,reasons:[]}))
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
  tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();probe.mockClear();judge.mockReset();judge.mockResolvedValue({pass:true,confidence:.99,reasons:[]})
  for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F16 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
  for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'Pessoa real',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
  ports={probe,judge};setProfilesForTest(db,ports);setContentReviewsForTest(db,ports)
})
afterAll(async()=>{setProfilesForTest(null);setContentReviewsForTest(null);await db.$disconnect()})
function call(method:'GET'|'POST'|'PATCH',route:string,body?:unknown,actor:string|null=owner,actorTenant=tenant){return app.inject({method,url:'/api/v1/'+route,headers:{host:tenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:actorTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{})},...(body?{payload:body}:{})})}
function content():ProfileContent{const g=randomUUID(),i=randomUUID();return{slug:'pagina-real',name:'Página real',bio:'Descrição real',avatarAssetId:null,requiresAge:false,primaryItemId:i,categories:[{id:g,name:'Conteúdo real',visible:true}],items:[{id:i,categoryId:g,type:'URL',label:'Link real',destination:'https://example.org/real',visible:true}]}}
async function save(value:ProfileContent,version:number){const r=await call('PATCH','me/profile',{content:value,expectedVersion:version});expect(r.statusCode,r.body).toBe(200);return r.json() as {draft:ProfileContent&{version:number};publishedVersion:number|null}}
async function initial(){const value=content();await save(value,0);const r=await call('POST','me/profile/publish',{expectedVersion:1});expect(r.statusCode,r.body).toBe(200);return value}
const apply=(expectedVersion:number,preserveContent=false,confirmedReplacement=true,templateVersionId='creator-v1',actor:string|null=owner,actorTenant=tenant)=>call('POST','me/profile/apply-template',{templateVersionId,preserveContent,confirmedReplacement,expectedVersion},actor,actorTenant)
const stored=()=>db.profile.findFirstOrThrow({where:{tenantId:tenant,ownerId:owner},include:{categories:{orderBy:{position:'asc'}},items:{orderBy:{position:'asc'}}}})
it('F16-PG01 catalog is public fictitious configuration and never exposes profile or tenant data',async()=>{
  const r=await call('GET','profile-templates',undefined,null);expect(r.statusCode).toBe(200);expect(r.json().templates).toHaveLength(5);expect(r.body).not.toMatch(/ownerId|tenantId|password|Página real/)
  expect(r.json().templates.flatMap((t:{groups:Array<{links:Array<{destination:string}>}>})=>t.groups.flatMap(g=>g.links)).every((i:{destination:string})=>i.destination.startsWith('https://example.com/modelos/'))).toBe(true)
})
it('F16-I01 preserve keeps identity, real content and F14 agenda without publishing or creating history',async()=>{
  const original=await initial(),avatar='a'.repeat(64);await db.profileAsset.create({data:{id:avatar,tenantId:tenant,ownerId:owner,bytes:Buffer.from('existing-fixture-avatar')}});await db.profile.updateMany({where:{tenantId:tenant},data:{avatarAssetId:avatar}});await db.profileItem.updateMany({where:{tenantId:tenant},data:{endsAt:new Date('2026-12-01Z'),timeZone:'UTC',paused:true}})
  const before=await stored(),r=await apply(1,true,false,'shop-v1');expect(r.statusCode,r.body).toBe(200)
  expect(r.json().draft).toMatchObject({name:original.name,bio:original.bio,slug:original.slug,version:2,items:[{id:original.items[0].id,schedule:{timeZone:'UTC',paused:true}}]})
  expect(r.json().draft.avatarAssetId).toBe(avatar)
  const after=await stored();expect(after.publication).toEqual(before.publication);expect(after.publishedVersion).toBe(1);expect(after.items).toEqual(before.items);expect(after.categories).toEqual(before.categories)
  expect(await db.profileRevision.count({where:{tenantId:tenant}})).toBe(1);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.template.applied'}})).toBe(1)
})
it('F16-T04 configured replacement requires confirmation, is versioned and cannot duplicate structure on retry',async()=>{
  const original=await initial(),before=await stored();expect((await apply(1,false,false)).statusCode).toBe(409);expect(await stored()).toEqual(before)
  const r=await apply(1);expect(r.statusCode,r.body).toBe(200);expect(r.json().draft).toMatchObject({name:original.name,bio:original.bio,slug:original.slug,primaryItemId:null,version:2});expect(r.json().draft.items).toHaveLength(3);expect(r.json().draft.categories).toHaveLength(2)
  expect(r.json().draft.items.every((item:{visible:boolean;templateExample:boolean})=>!item.visible&&item.templateExample)).toBe(true)
  expect((await apply(1)).statusCode).toBe(409);expect((await apply(2,true,false)).json().draft.version).toBe(2)
  const row=await stored();expect(row.publication).toEqual(before.publication);expect(row.items).toHaveLength(3);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.template.applied'}})).toBe(1)
})
it('F16-T03 changing a flag/label/visibility cannot publish examples; configuring a destination restores the normal moderation path',async()=>{
  await initial();const r=await apply(1);const sample=r.json().draft as ProfileContent&{version:number};const {version:ignored,...base}=sample;void ignored
  const forged={...base,items:base.items.map((item,index)=>index?item:{...item,templateExample:false,visible:true,label:'Título editado'})};const saved=await save(forged,2);expect(saved.draft.items[0].templateExample).toBe(true)
  expect((await call('POST','me/profile/publish',{expectedVersion:3})).statusCode).toBe(422)
  expect((await call('GET','profiles/pagina-real',undefined,null)).body).not.toContain('/modelos/')
  const configured={...forged,items:forged.items.map((item,index)=>index?item:{...item,destination:'https://example.org/configurado'})};const next=await save(configured,3);expect(next.draft.items[0].templateExample).not.toBe(true)
  probe.mockClear();judge.mockClear();const published=await call('POST','me/profile/publish',{expectedVersion:4});expect(published.statusCode,published.body).toBe(200)
  expect(probe.mock.calls.map(call=>call[0])).toEqual(['https://example.org/configurado']);expect(JSON.stringify(judge.mock.calls)).not.toContain('/modelos/')
  const publicResult=await call('GET','profiles/pagina-real',undefined,null);expect(publicResult.json().items).toHaveLength(1);expect(publicResult.body).not.toMatch(/templateExample|\/modelos\//)
  expect(JSON.stringify((await stored()).publishedDraft)).toContain('templateExample')
})
it('F16-I02 session, owner and tenant are server-enforced; tokens or body owner IDs cannot target another page',async()=>{
  await initial();const before=await stored();expect((await apply(1,false,true,'shop-v1',null)).statusCode).toBe(401);expect((await apply(1,false,true,'shop-v1',other)).statusCode).toBe(404);expect((await apply(1,false,true,'shop-v1',foreignOwner,foreign)).statusCode).toBe(403)
  expect((await call('POST','me/profile/apply-template',{templateVersionId:'shop-v1',preserveContent:false,expectedVersion:1,confirmedReplacement:true,ownerId:owner},other)).statusCode).toBe(400)
  expect((await apply(1,false,true,'unknown-v1')).statusCode).toBe(404);expect(await stored()).toEqual(before)
})
it('F16-I03/PG02 simultaneous applications serialize and a real write failure rolls back deleted groups/items/version/audit',async()=>{
  await initial();const replies=await Promise.all([apply(1,false,true,'shop-v1'),apply(1,false,true,'event-v1')]);expect(replies.map(r=>r.statusCode).sort()).toEqual([200,409]);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.template.applied'}})).toBe(1)
  const before=await stored(),name='f16_failure_'+tenant.replaceAll('-','')
  await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."tenantId"='${tenant}' THEN RAISE EXCEPTION 'F16 fixture write failure'; END IF; RETURN NEW; END; $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE INSERT ON profile_items FOR EACH ROW EXECUTE FUNCTION ${name}()`)
  try{expect((await apply(2,false,true,'professional-v1')).statusCode).toBe(500);expect(await stored()).toEqual(before);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.template.applied'}})).toBe(1)}finally{await db.$executeRawUnsafe(`DROP TRIGGER ${name} ON profile_items`);await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`)}
})
it('F16 security: a new arbitrary URL cannot forge a trusted example to bypass URL safety or editorial review',async()=>{
  const original=await initial(),bad={...original,items:[{...original.items[0],id:randomUUID(),destination:'http://127.0.0.1/private',visible:true,templateExample:true}],primaryItemId:null}
  const result=await save(bad,1);expect(result.draft.items[0].templateExample).not.toBe(true);probe.mockClear();const rejected=await call('POST','me/profile/publish',{expectedVersion:2});expect(rejected.statusCode).toBe(422);expect(rejected.body).toContain('HTTPS públicos');expect(probe).not.toHaveBeenCalled()
})
it('F16-H01 automatic and human publication preserve private examples/history while public output and review alerts contain only real buttons',async()=>{
  await initial();const r=await apply(1);const {version:ignored,...sample}=r.json().draft as ProfileContent&{version:number};void ignored
  const configured={...sample,items:sample.items.map((item,index)=>index?item:{...item,destination:'https://example.org/validado',visible:true})};await save(configured,2);judge.mockResolvedValue({pass:false,confidence:.99,reasons:[]})
  const submitted=await call('POST','me/profile/publish',{expectedVersion:3});expect(submitted.statusCode,submitted.body).toBe(200);const id=submitted.json().review.id
  const notice=await db.operationalMessage.findFirstOrThrow({where:{tenantId:tenant,resourceId:id,kind:'REVIEW_PROFILE'}});expect(JSON.stringify(notice.payload)).not.toContain('/modelos/')
  const approved=await call('POST','admin/content-reviews/'+id+'/decision',{decision:'APPROVE'},other);expect(approved.statusCode,approved.body).toBe(200)
  const row=await stored();expect(row.publishedVersion).toBe(3);expect(JSON.stringify(row.publishedDraft)).toContain('templateExample');expect(JSON.stringify(row.publication)).not.toContain('/modelos/')
  const current=await db.profileRevision.findFirstOrThrow({where:{tenantId:tenant,version:3}});expect(JSON.stringify(current.snapshot)).toContain('templateExample')
  const {version,...draft}=(await call('GET','me/profile')).json().draft as ProfileContent&{version:number};await save({...draft,bio:'Alteração não publicada'},version)
  const restored=await call('POST','me/profile/revisions/'+current.id+'/restore',{expectedVersion:version+1});expect(restored.statusCode,restored.body).toBe(200);expect(restored.json().draft.items.filter((item:{templateExample?:boolean})=>item.templateExample)).toHaveLength(2);expect((await stored()).publication).toEqual(row.publication);expect((await stored()).publishedVersion).toBe(3)
})
