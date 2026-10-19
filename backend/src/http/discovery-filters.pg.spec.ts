import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {PrismaLinksRepository,setLinksRepositoryForTest} from '@/repositories/links-repository'
import {PrismaConfigsRepository,setConfigsRepositoryForTest} from '@/repositories/configs-repository'
import {setDiscoveryDbForTest} from '@/http/controllers/@Catalog/discovery'
import {composeSearchForTest,sqlCandidateSource,resetSearchCandidatesForTest} from '@/http/controllers/@Search/routes'
import {queryCatalogPage} from '@/http/catalog-query'
import {decodeCursor} from '@/http/catalog-page'
import {parseDiscovery} from '@/domain/catalog/discovery-metadata'
import {editDiscoveryMetadata} from '@/use-cases/@Links/edit-discovery-metadata'
import {homePageSql} from '@/http/catalog-page'
const url=process.env.CHECKOUT_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Disposable local database required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,other:string,network:string,niche:string,configured:string,legacy:string
beforeAll(async()=>{
 setDiscoveryDbForTest(db);setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}})
 setLinksRepositoryForTest(new PrismaLinksRepository(db));setConfigsRepositoryForTest(new PrismaConfigsRepository(db));await app.ready()
})
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();other=randomUUID()
 for(const id of [tenant,foreign])await db.tenant.create({data:{id,host:id+'.test',name:'F27 fixture'}})
 for(const tenantId of [tenant,foreign])await db.config.createMany({data:[{tenantId,key:'SEARCH_RELEVANCE_THRESHOLD',value:'0.35'},{tenantId,key:'SEARCH_TEXT_WEIGHT',value:'0.4'},{tenantId,key:'SEARCH_SEMANTIC_WEIGHT',value:'0.6'}]})
 for(const id of [owner,other]){
  await db.user.create({data:{id,tenantId:tenant,name:'Fixture',role:id===other?'ADMIN':'USER',passwordHash:'fixture'}})
  await db.userIdentifier.create({data:{tenantId:tenant,userId:id,kind:'EMAIL',normalizedValue:id+'@example.test',confirmedAt:new Date()}})
 }
 network=(await db.network.create({data:{tenantId:tenant,name:'Telegram',slug:'telegram',knownHosts:['t.me']}})).id
 niche=(await db.niche.create({data:{tenantId:tenant,name:'Estudos',slug:'estudos'}})).id
 legacy=(await db.link.create({data:{tenantId:tenant,ownerId:owner,networkId:network,nicheId:niche,canonicalUrl:'https://t.me/'+randomUUID(),name:'Aulas F27 antigo',description:'Legado',status:'PUBLISHED'}})).id
 configured=(await db.link.create({data:{tenantId:tenant,ownerId:owner,networkId:network,nicheId:niche,canonicalUrl:'https://t.me/'+randomUUID(),name:'Aulas F27 local',description:'Público',status:'PUBLISHED',cityId:'3550308',languageTag:'pt',modality:'ONLINE'}})).id
 composeSearchForTest({embedding:()=>({embed:async()=>[1,...Array(1535).fill(0)]}),candidates:sqlCandidateSource(db)})
})
afterAll(async()=>{setDiscoveryDbForTest(null);resetSearchCandidatesForTest();await db.$disconnect()})
const auth=(user=owner,tenantId=tenant)=>({host:tenant+'.test',authorization:'Bearer '+app.jwt.sign({sub:user,tenantId,role:user===other?'ADMIN':'USER',typ:'access'})})
const patch=(body:Record<string,unknown>,user=owner,id=legacy)=>app.inject({method:'PATCH',url:'/api/v1/links/'+id+'/discovery',headers:auth(user),payload:body})
const publicSearch=(query='')=>app.inject({method:'GET',url:'/api/v1/search?q=aulas'+query,headers:{host:tenant+'.test','x-analytics-test':'1'}})
const page=(filters={},cursor:string|null=null)=>queryCatalogPage(db,{tenantId:tenant,age:'no',surface:'HOME',nicheSlug:null,networkSlug:null,limit:2,cursor:decodeCursor(cursor),filters:parseDiscovery(filters)})
it('F27-PG02/I03 audit failure rolls back metadata/version and preserves retry; private reads reject other owners',async()=>{
 const route='/api/v1/links/'+legacy+'/discovery'
 expect((await app.inject({method:'GET',url:route,headers:auth(other)})).statusCode).toBe(404)
 const read=await app.inject({method:'GET',url:route,headers:auth()});expect(read.statusCode).toBe(200);expect(read.headers['cache-control']).toContain('no-store');expect(read.json()).toEqual({metadata:parseDiscovery({}),version:0})
 await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION f27_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."entityId"='${legacy}' AND NEW.action='link.discovery.updated' THEN RAISE EXCEPTION 'F27 audit unavailable'; END IF; RETURN NEW; END $$`)
 await db.$executeRawUnsafe('CREATE TRIGGER f27_audit_failure_trigger BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION f27_audit_failure()')
 try{await expect(editDiscoveryMetadata(db,{tenantId:tenant,ownerId:owner},legacy,parseDiscovery({cityId:'3550308'}),0,'f27-fault')).rejects.toThrow('F27 audit unavailable');expect(await db.link.findUnique({where:{id:legacy}})).toMatchObject({cityId:null,discoveryVersion:0});expect(await db.auditLog.count({where:{entityId:legacy}})).toBe(0)}finally{await db.$executeRawUnsafe('DROP TRIGGER f27_audit_failure_trigger ON audit_logs');await db.$executeRawUnsafe('DROP FUNCTION f27_audit_failure()')}
 expect((await patch({cityId:'3550308',expectedVersion:0})).statusCode).toBe(200)
 const plan=await db.$queryRawUnsafe(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${homePageSql('HOME').organic}`,tenant,'no',null,null,null,25,'a'.repeat(32),'3550308',null,null)
 expect(JSON.stringify(plan)).toContain('links')
 await db.userIdentifier.updateMany({where:{userId:owner},data:{confirmedAt:null}});expect((await patch({expectedVersion:1})).statusCode).toBe(403)
})
it('F27-T01/T04 legacy nulls stay visible without filters; AND filters and real search SQL preserve public/tenant scope',async()=>{
 const all=await page();expect(all.rows.map(row=>row.id).sort()).toEqual([legacy,configured].sort())
 expect((await page({cityId:'3550308',languageTag:'pt-BR',modality:'online'})).rows.map(row=>row.id)).toEqual([configured])
 const hidden=await db.link.create({data:{tenantId:tenant,ownerId:owner,networkId:network,nicheId:niche,canonicalUrl:'https://t.me/'+randomUUID(),name:'F27-PRIVATE-SECRET Aulas',description:'private',status:'PENDING_MODERATION',cityId:'3550308',languageTag:'pt',modality:'ONLINE'}})
 const result=await publicSearch('&cityId=3550308&languageTag=pt&modality=ONLINE');expect(result.statusCode,result.body).toBe(200)
 expect(result.json().organic.map((row:{id:string})=>row.id)).toEqual([configured]);expect(result.body).not.toContain(hidden.id);expect(result.body).not.toMatch(/F27-PRIVATE|ownerId|passwordHash/)
 const foreignResult=await app.inject({method:'GET',url:'/api/v1/search?q=aulas&cityId=3550308',headers:{host:foreign+'.test'}});expect(foreignResult.statusCode,foreignResult.body).toBe(200);expect(foreignResult.body).not.toContain(configured)
})
it('F27-T02/T05 rejects invalid filters without broadening; standardized options and clear empty result are tenant-safe',async()=>{
 for(const filter of ['&cityId=9999999','&languageTag=zz','&modality=HYBRID','&cityId=3550308&cityId=3543402'])expect((await publicSearch(filter)).statusCode).toBe(400)
 const empty=await publicSearch('&cityId=3543402');expect(empty.statusCode).toBe(200);expect(empty.json()).toMatchObject({sponsored:[],organic:[]})
 const options=await app.inject({method:'GET',url:'/api/v1/catalog/discovery-options?q=sao%20paulo&cityId=3550308',headers:{host:tenant+'.test'}})
 expect(options.statusCode).toBe(200);expect(options.json().selectedCity).toEqual({id:'3550308',name:'São Paulo',state:'SP'});expect(options.json().languages).toContainEqual({code:'pt',name:'português'})
 expect(options.body).not.toMatch(/ownerId|tenantId|canonicalUrl/)
})
it('F27-I02 private edits require verified active owner and tenant; version conflicts preserve data, even for another ADMIN',async()=>{
 const body={cityId:'3550308',languageTag:'pt-BR',modality:'online',expectedVersion:0}
 expect((await app.inject({method:'PATCH',url:'/api/v1/links/'+legacy+'/discovery',headers:{host:tenant+'.test'},payload:body})).statusCode).toBe(401)
 expect((await patch(body,other)).statusCode).toBe(404)
 expect((await app.inject({method:'PATCH',url:'/api/v1/links/'+legacy+'/discovery',headers:{...auth(),host:foreign+'.test'},payload:body})).statusCode).toBe(403)
 expect((await patch({...body,ownerId:other})).statusCode).toBe(400)
 const first=await patch(body);expect(first.statusCode,first.body).toBe(200);expect(first.json()).toMatchObject({version:1,metadata:{cityId:'3550308',languageTag:'pt',modality:'ONLINE'}})
 const mine=await app.inject({method:'GET',url:'/api/v1/links/mine',headers:auth()});expect(mine.statusCode,mine.body).toBe(200);expect(mine.json().links.find((row:{id:string})=>row.id===legacy).discovery).toMatchObject({city:{name:'São Paulo',state:'SP'},languageTag:'pt',modality:'ONLINE',version:1})
 expect((await patch({...body,cityId:'3543402'})).statusCode).toBe(409)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}});expect((await patch({...body,expectedVersion:1})).statusCode).toBe(403)
 expect(await db.link.findUnique({where:{id:legacy}})).toMatchObject({cityId:'3550308',discoveryVersion:1,status:'PUBLISHED'})
})
it('F27-I03 matching retry is idempotent; concurrent edits produce one winner and a stale-version conflict',async()=>{
 const input={cityId:'3550308',expectedVersion:0},first=await patch(input);expect(first.statusCode).toBe(200)
 expect((await patch(input)).json()).toEqual(first.json());expect(await db.auditLog.count({where:{entityId:legacy,action:'link.discovery.updated'}})).toBe(1)
 const answers=await Promise.all([patch({cityId:'3543402',expectedVersion:1}),patch({languageTag:'en',expectedVersion:1})]);expect(answers.map(row=>row.statusCode).sort()).toEqual([200,409])
 expect(await db.auditLog.count({where:{entityId:legacy,action:'link.discovery.updated'}})).toBe(2)
})
it('F27-PG01/T04 filtered cursor covers every eligible item once, rejects a changed filter, and preserves sponsor/age rules',async()=>{
 await db.promotion.create({data:{tenantId:tenant,linkId:configured,status:'ACTIVE',surface:'HOME',activatedAt:new Date(),administrative:true}})
 for(let index=0;index<7;index++)await db.link.create({data:{tenantId:tenant,networkId:network,nicheId:niche,canonicalUrl:'https://t.me/'+randomUUID(),name:'Aulas '+index,description:'d',status:'PUBLISHED',languageTag:'pt',cityId:'3550308',modality:'ONLINE'}})
 const ids:string[]=[];let cursor:string|null=null
 do{const result=await page({cityId:'3550308'},cursor);ids.push(...result.rows.map(row=>row.id));cursor=result.nextCursor}while(cursor)
 expect(ids).toHaveLength(8);expect(new Set(ids).size).toBe(8);expect(ids).not.toContain(legacy)
 const first=await page({cityId:'3550308'});await expect(page({cityId:'3543402'},first.nextCursor)).rejects.toThrow()
 expect(first.rows[0].id).toBe(configured);expect(first.rows[0].homeActivatedAt).not.toBeNull()
 await db.niche.update({where:{id:niche},data:{requiresAge:true}});expect((await page({cityId:'3550308'})).rows).toEqual([])
 await expect(db.link.update({where:{id:legacy},data:{modality:'HYBRID'}})).rejects.toThrow()
})
it('F27-T03 creation uses only explicit metadata and default nulls despite IP/language headers; existing quota/moderation stay intact',async()=>{
 const input={url:'https://t.me/'+randomUUID(),name:'Comunidade F27',description:'Aulas e estudos',networkId:network,nicheId:niche}
 const created=await app.inject({method:'POST',url:'/api/v1/links',headers:{...auth(),'accept-language':'en-US','x-forwarded-for':'203.0.113.1'},payload:input});expect(created.statusCode,created.body).toBe(201)
 expect(await db.link.findUnique({where:{id:created.json().id}})).toMatchObject({cityId:null,languageTag:null,modality:null})
 const explicit=await app.inject({method:'POST',url:'/api/v1/links',headers:auth(),payload:{...input,url:'https://t.me/'+randomUUID(),cityId:'3550308',languageTag:'PT_br',modality:'online'}});expect(explicit.statusCode,explicit.body).toBe(201)
 expect(await db.link.findUnique({where:{id:explicit.json().id}})).toMatchObject({cityId:'3550308',languageTag:'pt',modality:'ONLINE'})
})
