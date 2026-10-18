import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setProfilesForTest} from '@/http/controllers/@Profiles/routes'
import type {ProfileContent} from '@/domain/profiles/profile'
import {readProfileImport,signProfileImport} from '@/lib/profile-import-token'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,foreignOwner:string
const probe=vi.fn(async()=>200),judge=vi.fn(async()=>({pass:true,confidence:.99,reasons:[]}))
beforeAll(async()=>{setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID();foreignOwner=randomUUID();probe.mockClear();judge.mockClear()
 for(const id of [tenant,foreign]){await db.tenant.create({data:{id,host:id+'.test',name:'F17 fixture'}});await db.config.create({data:{tenantId:id,key:'MODERATION_AUTO_APPROVE_THRESHOLD',value:'.85'}})}
 for(const [id,tenantId] of [[owner,tenant],[other,tenant],[foreignOwner,foreign]])await db.user.create({data:{id,tenantId,name:'Pessoa real',passwordHash:'fixture',role:id===other?'ADMIN':'USER',identifiers:{create:{tenantId,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 setProfilesForTest(db,{probe,judge})
})
afterAll(async()=>{setProfilesForTest(null);await db.$disconnect()})
function call(route:string,body:unknown,actor:string|null=owner,actorTenant=tenant){return app.inject({method:'POST',url:'/api/v1/me/profile/import/'+route,headers:{'content-type':'application/json',host:tenant+'.test',...(actor?{authorization:'Bearer '+app.jwt.sign({sub:actor,tenantId:actorTenant,role:actor===other?'ADMIN':'USER',typ:'access'})}:{})},payload:JSON.stringify(body)})}
async function initial(){const group=randomUUID(),item=randomUUID(),content:ProfileContent={slug:'pagina-real',name:'Página real',bio:'Descrição real',avatarAssetId:null,requiresAge:false,primaryItemId:item,categories:[{id:group,name:'Meus links',visible:true}],items:[{id:item,categoryId:group,type:'URL',label:'Link real',destination:'https://example.org/antigo',visible:true}]};const headers={host:tenant+'.test',authorization:'Bearer '+app.jwt.sign({sub:owner,tenantId:tenant,role:'USER',typ:'access'})};expect((await app.inject({method:'PATCH',url:'/api/v1/me/profile',headers,payload:{content,expectedVersion:0}})).statusCode).toBe(200);expect((await app.inject({method:'POST',url:'/api/v1/me/profile/publish',headers,payload:{expectedVersion:1}})).statusCode).toBe(200);probe.mockClear();judge.mockClear();return content}
const stored=()=>db.profile.findFirstOrThrow({where:{tenantId:tenant,ownerId:owner},include:{categories:{orderBy:{position:'asc'}},items:{orderBy:{position:'asc'}}}})
async function preview(lines=['https://example.com/novo','javascript:alert(1)','https://example.com/novo']){const response=await call('preview',{lines,expectedVersion:1});expect(response.statusCode,response.body).toBe(200);return response.json()}
function confirmation(p:{previewId:string;expectedVersion:number;idempotencyKey:string},line=1){return{previewId:p.previewId,expectedVersion:p.expectedVersion,idempotencyKey:p.idempotencyKey,selectedItems:[{line,label:'Meu conteúdo importado',categoryId:null,newCategoryName:'Importados'}]}}
it('F17-T01/T02 preview has per-line URL/duplicate errors and private cache without modifying draft/publication or calling providers',async()=>{
 await initial();const before=await stored(),p=await preview();expect(p.items.map((i:{status:string})=>i.status)).toEqual(['READY','INVALID','DUPLICATE']);expect(p.expiresAt).toBeTruthy();expect(await stored()).toEqual(before);expect(probe).not.toHaveBeenCalled();expect(judge).not.toHaveBeenCalled();expect(await db.link.count({where:{tenantId:tenant}})).toBe(0)
 const r=await call('preview',{lines:['https://127.0.0.1/a'],expectedVersion:1});expect(r.headers['cache-control']).toContain('no-store');expect(r.json().items[0].status).toBe('INVALID')
})
it('F17-T03/T04/T05 atomic reviewed selection creates draft only, receipt handles retry after later edits without duplicates',async()=>{
 await initial();const before=await stored(),p=await preview(),body=confirmation(p),r=await call('confirm',body);expect(r.statusCode,r.body).toBe(200);expect(r.json().createdIds).toHaveLength(1);expect(r.json().profile.draft.items).toHaveLength(2);const after=await stored();expect(after.publication).toEqual(before.publication);expect(after.publishedVersion).toBe(1);expect(after.version).toBe(2);expect(after.items[0]).toEqual(before.items[0]);expect(await db.link.count({where:{tenantId:tenant}})).toBe(0);expect(await db.profileRevision.count({where:{tenantId:tenant}})).toBe(1)
 await db.profile.update({where:{id:after.id},data:{bio:'Edição posterior',version:{increment:1}}});const replay=await call('confirm',body);expect(replay.statusCode,replay.body).toBe(200);expect(replay.json()).toMatchObject({createdIds:r.json().createdIds,alreadyApplied:true});expect((await stored()).version).toBe(3);expect((await stored()).bio).toBe('Edição posterior');expect((await stored()).items).toHaveLength(2)
 const mismatch=await call('confirm',{...body,selectedItems:body.selectedItems.map(item=>({...item,label:'Outro título'}))});expect(mismatch.statusCode).toBe(409);const audit=await db.auditLog.findMany({where:{tenantId:tenant,action:'profile.import.confirmed'}});expect(audit).toHaveLength(1);expect(JSON.stringify(audit)).not.toContain('example.com');expect(JSON.stringify(audit)).not.toContain('Meu conteúdo importado')
})
it('F17-I02 owner, tenant, session and account state are enforced for preview and signed confirmation',async()=>{
 await initial();const p=await preview(),before=await stored()
 for(const route of ['preview','confirm']){const body=route==='preview'?{lines:['https://example.com'],expectedVersion:1}:confirmation(p);expect((await call(route,body,null)).statusCode).toBe(401);expect([404,422]).toContain((await call(route,body,other)).statusCode);expect((await call(route,body,foreignOwner,foreign)).statusCode).toBe(403);expect((await call(route,{...body,ownerId:owner})).statusCode).toBe(400)}
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await call('confirm',confirmation(p))).statusCode).toBe(403);expect(await stored()).toEqual(before)
})
it('F17-I03 expiration, tampering, stale version, invalid selection and unknown category leave the whole draft intact',async()=>{
 await initial();const p=await preview(),before=await stored(),body=confirmation(p),ticket=readProfileImport(p.previewId,{tenantId:tenant,ownerId:owner})
 expect((await call('confirm',{...body,previewId:signProfileImport({...ticket,expiresAt:Date.now()-1})})).statusCode).toBe(409)
 expect((await call('confirm',{...body,previewId:p.previewId+'x'})).statusCode).toBe(422)
 expect((await call('confirm',confirmation(p,2))).statusCode).toBe(422)
 expect((await call('confirm',{...body,selectedItems:[body.selectedItems[0],{...body.selectedItems[0],line:3}]})).statusCode).toBe(422)
 expect((await call('confirm',{...body,selectedItems:[{...body.selectedItems[0],categoryId:randomUUID(),newCategoryName:null}]})).statusCode).toBe(422)
 expect(await stored()).toEqual(before);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.import.confirmed'}})).toBe(0)
 await db.profile.update({where:{id:before.id},data:{version:{increment:1}}});expect((await call('confirm',body)).statusCode).toBe(409);expect((await stored()).items).toEqual(before.items)
})
it('F17-PG01 concurrent replay has one receipt and one set of items; failed write rolls back everything and allows retry',async()=>{
 await initial();const p=await preview(),body=confirmation(p),results=await Promise.all([call('confirm',body),call('confirm',body)]);expect(results.map(r=>r.statusCode)).toEqual([200,200]);expect(results[0].json().createdIds).toEqual(results[1].json().createdIds);expect((await stored()).items).toHaveLength(2);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.import.confirmed'}})).toBe(1)
 const next=await call('preview',{lines:['https://example.com/mais'],expectedVersion:2});expect(next.statusCode,next.body).toBe(200);const second=confirmation(next.json()),before=await stored(),name='f17_failure_'+tenant.replaceAll('-','')
 await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."tenantId"='${tenant}' THEN RAISE EXCEPTION 'F17 fixture write failure'; END IF; RETURN NEW; END; $$`);await db.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE INSERT ON profile_items FOR EACH ROW EXECUTE FUNCTION ${name}()`)
 try{expect((await call('confirm',second)).statusCode).toBe(500);expect(await stored()).toEqual(before);expect(await db.auditLog.count({where:{tenantId:tenant,action:'profile.import.confirmed'}})).toBe(1)}finally{await db.$executeRawUnsafe(`DROP TRIGGER ${name} ON profile_items`);await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`)}
 expect((await call('confirm',second)).statusCode).toBe(200);expect((await stored()).items).toHaveLength(3)
})
it('F17 inherited guards: old agenda/template marker survive append and imported content still requires the existing publication review',async()=>{
 const content=await initial(),before=await stored();await db.profileItem.updateMany({where:{profileId:before.id},data:{endsAt:new Date('2026-12-01Z'),timeZone:'UTC',paused:true}})
 await db.profileItem.create({data:{id:randomUUID(),profileId:before.id,tenantId:tenant,ownerId:owner,categoryId:content.categories[0].id,type:'URL',label:'Exemplo oculto',destination:'https://example.com/modelos/exemplo',visible:false,templateExample:true,position:1}})
 const p=await preview(['https://example.com/novo']),r=await call('confirm',confirmation(p));expect(r.statusCode,r.body).toBe(200);expect(r.json().profile.draft.items[0].schedule).toMatchObject({timeZone:'UTC',paused:true});expect(r.json().profile.draft.items[1].templateExample).toBe(true);expect(r.json().profile.draft.items[2].templateExample).not.toBe(true)
 judge.mockResolvedValueOnce({pass:false,confidence:.99,reasons:[]});const published=await app.inject({method:'POST',url:'/api/v1/me/profile/publish',headers:{host:tenant+'.test',authorization:'Bearer '+app.jwt.sign({sub:owner,tenantId:tenant,role:'USER',typ:'access'})},payload:{expectedVersion:2}})
 expect(published.statusCode,published.body).toBe(200);expect(published.json().review.status).toBe('PENDING');expect((await stored()).publication).toEqual(before.publication);expect((await stored()).publishedVersion).toBe(1);expect(JSON.stringify(judge.mock.calls)).not.toContain('/modelos/exemplo');expect(await db.operationalMessage.count({where:{tenantId:tenant,kind:'REVIEW_PROFILE'}})).toBe(1)
 expect((await call('preview',{lines:Array(51).fill('https://example.com/too-many'),expectedVersion:2})).statusCode).toBe(422)
})
