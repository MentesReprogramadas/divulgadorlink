import { favoritesOperation } from '@/repositories/favorites-repository'
import { publicCollection } from '@/repositories/public-collections'
import {randomUUID} from 'node:crypto'
import sharp from 'sharp'
import {PrismaClient} from '@prisma/client'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {app} from '@/app'
import {setTenantsRepositoryForTest} from '@/http/tenant'
import {setWorkspaceDbForTest} from '@/http/workspace-access'
import {PrismaLinksRepository,setLinksRepositoryForTest} from '@/repositories/links-repository'
import {setLinkMediaDbForTest} from '@/repositories/link-media'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Disposable local PG required')
const db=new PrismaClient({datasources:{db:{url}}})
const tenant=randomUUID(),foreignTenant=randomUUID(),owner=randomUUID(),other=randomUUID(),admin=randomUUID(),link=randomUUID(),network=randomUUID(),niche=randomUUID()
const image={base64:'',alt:'Comunidade reunida'}
beforeAll(async()=>{ image.base64=(await sharp({create:{width:1600,height:900,channels:3,background:'navy'}}).png().toBuffer()).toString('base64')
 setLinkMediaDbForTest(db);setWorkspaceDbForTest(db);setLinksRepositoryForTest(new PrismaLinksRepository(db))
 setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}})
 await db.tenant.create({data:{id:tenant,host:tenant+'.test',name:'Media HTTP'}}) await db.tenant.create({data:{id:foreignTenant,host:foreignTenant+'.test',name:'Other media tenant'}})
 for(const id of [owner,other,admin])await db.user.create({data:{id,tenantId:tenant,name:id,passwordHash:'fixture',role:id===admin?'ADMIN':'USER',identifiers:{create:{tenantId:tenant,kind:'EMAIL',normalizedValue:id+'@fixture.test',confirmedAt:new Date()}}}})
 await db.network.create({data:{id:network,tenantId:tenant,name:'Site',slug:network}})
 await db.niche.create({data:{id:niche,tenantId:tenant,name:'Tema',slug:niche}})
 await db.link.create({data:{id:link,tenantId:tenant,ownerId:owner,networkId:network,nicheId:niche,name:'Link real',description:'Sobre real',canonicalUrl:'https://example.com/'+link,status:'PUBLISHED'}})
 await app.ready()
})
afterAll(async()=>{setLinkMediaDbForTest(null);setWorkspaceDbForTest(null);await db.auditLog.deleteMany({where:{tenantId:tenant}});await db.workspaceMembership.deleteMany({where:{tenantId:tenant}});await db.collection.deleteMany({where:{tenantId:tenant}});await db.favorite.deleteMany({where:{tenantId:tenant}});await db.link.deleteMany({where:{tenantId:tenant}});await db.network.delete({where:{id:network}});await db.niche.delete({where:{id:niche}});await db.userIdentifier.deleteMany({where:{tenantId:tenant}});await db.user.deleteMany({where:{tenantId:tenant}});await db.tenant.deleteMany({where:{id:{in:[tenant,foreignTenant]}}});await db.$disconnect()})
function token(id:string=owner,tenantId:string=tenant){return app.jwt.sign({sub:id,tenantId,role:id===admin?'ADMIN':'USER',typ:'access'})}
function call(method:'GET'|'PUT'|'DELETE'|'POST',path:string,body?:unknown,id:string|null=owner,headers:Record<string,string>={}){return app.inject({method,url:'/api/v1/'+path,headers:{host:tenant+'.test',...(id?{authorization:'Bearer '+token(id)}:{}),...headers},...(body?{payload:body}:{})})}
it('authorizes private slots and human review; public bytes obey age, tenant, publication, suspension and no-store',async()=>{
 expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:0},other)).statusCode).toBe(404)
 expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:0},null)).statusCode).toBe(401)
 expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:0},owner,{authorization:'Bearer '+token(owner,'foreign')})).statusCode).toBe(403)
 expect((await call('PUT',`links/${link}/media/icon`,{...image,expectedVersion:0})).statusCode).toBe(400)
 const put=await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:0});expect(put.statusCode,put.body).toBe(200)
 const state=(await call('GET',`links/${link}/media`)).json();expect(state.version).toBe(1);expect(state.assets[0].status).toBe('PENDING');expect(state.assets[0]).not.toHaveProperty('bytes')
 const asset=state.assets[0].id,publicPath=`links/${link}/media/${asset}`
 for(const path of [publicPath,publicPath+'?width=320'])expect((await call('GET',path,undefined,null)).statusCode).toBe(404)
 expect((await call('GET',`links/${link}/media/private/${asset}`,undefined,other)).statusCode).toBe(404)
 expect((await call('GET',`links/${link}/media/private/${asset}`)).statusCode).toBe(200)
 expect((await call('GET','admin/moderation/media',undefined,owner)).statusCode).toBe(403)
 const queue=await call('GET','admin/moderation/media',undefined,admin);expect(queue.statusCode,queue.body).toBe(200);expect(queue.json().assets[0]).toMatchObject({id:asset,version:1})
 expect((await call('POST',`admin/moderation/media/${asset}`,{expectedVersion:1,decision:'REJECT'},admin)).statusCode).toBe(400)
 expect((await call('POST',`admin/moderation/media/${asset}`,{expectedVersion:1,decision:'APPROVE'},owner)).statusCode).toBe(403)
 expect((await call('POST',`admin/moderation/media/${asset}`,{expectedVersion:1,decision:'APPROVE'},admin)).statusCode).toBe(200)
 const bytes=await call('GET',publicPath,undefined,null);expect(bytes.statusCode,bytes.body).toBe(200);expect(bytes.headers['content-type']).toBe('image/webp');expect(bytes.headers['x-content-type-options']).toBe('nosniff');expect(bytes.headers['cache-control']).toContain('no-store') expect(await sharp(bytes.rawPayload).metadata()).toMatchObject({width:1600,height:900}) for(const width of [64,128,320,640,960,1280,1600]){  const variant=await call('GET',publicPath+'?width='+width,undefined,null)  expect(variant.statusCode,variant.body).toBe(200)  expect(variant.headers['content-type']).toBe('image/webp')  expect(variant.headers['x-content-type-options']).toBe('nosniff')  expect(variant.headers['cache-control']).toBe('private, no-store')  expect(await sharp(variant.rawPayload).metadata()).toMatchObject({width,height:width*9/16}) } for(const query of ['width=','width=0','width=-1','width=321','width=640.5','width=1601','width=320&width=640']){  const invalid=await call('GET',publicPath+'?'+query,undefined,null)  expect(invalid.statusCode).toBe(400)  expect(invalid.headers['cache-control']).toContain('no-store') } for(const path of [publicPath,publicPath+'?width=320']){  const foreign=await call('GET',path,undefined,null,{host:foreignTenant+'.test'})  expect(foreign.statusCode).toBe(404)  expect(foreign.headers['cache-control']).toContain('no-store') }
 const favoriteId=randomUUID(), collectionId=randomUUID()
 await db.favorite.create({data:{id:favoriteId,tenantId:tenant,userId:other,linkId:link}})
 await db.collection.create({data:{id:collectionId,tenantId:tenant,userId:other,name:'Curadoria',visibility:'PUBLIC',slug:'curadoria',publishedRevision:1,publication:{title:'Curadoria',description:'Seleção',curator:'Pessoa',requiresAge:false,favoriteIds:[favoriteId]}}})
 await db.collectionItem.create({data:{collectionId,tenantId:tenant,userId:other,favoriteId,position:0}})
 const favorites=await favoritesOperation(db,{tenantId:tenant,userId:other,age:false},{kind:'list-favorites'})
 expect('items' in favorites&&favorites.items?.[0]).toMatchObject({imageUrl:expect.stringContaining(asset),imageAlt:image.alt})
 const collection=await publicCollection(db,tenant,'curadoria',false)
 expect(!collection.restricted&&collection.items[0]).toMatchObject({imageUrl:expect.stringContaining(asset),imageAlt:image.alt})
 const detail=await call('GET',`links/${link}`,undefined,null);expect(detail.json().imageUrl).toContain(asset);expect(detail.json().imageAlt).toBe(image.alt)
 await db.niche.update({where:{id:niche},data:{requiresAge:true}})
 for(const path of [publicPath,publicPath+'?width=320'])expect((await call('GET',path,undefined,null)).statusCode).toBe(404)
 for(const path of [publicPath,publicPath+'?width=320'])expect((await call('GET',path,undefined,null,{cookie:'age=yes'})).statusCode).toBe(200)
 await db.niche.update({where:{id:niche},data:{requiresAge:false}}) await db.network.update({where:{id:network},data:{requiresAge:true}}) for(const path of [publicPath,publicPath+'?width=320']){  expect((await call('GET',path,undefined,null)).statusCode).toBe(404)  expect((await call('GET',path,undefined,null,{cookie:'age=yes'})).statusCode).toBe(200) } await db.network.update({where:{id:network},data:{requiresAge:false}})
 await db.user.update({where:{id:owner},data:{status:'BANNED'}})
 for(const path of [publicPath,publicPath+'?width=320'])expect((await call('GET',path,undefined,null)).statusCode).toBe(404)
 expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:2})).statusCode).toBe(403)
 await db.user.update({where:{id:owner},data:{status:'ACTIVE'}})
 await db.link.update({where:{id:link},data:{status:'UNAVAILABLE'}})
 for(const path of [publicPath,publicPath+'?width=320'])expect((await call('GET',path,undefined,null)).statusCode).toBe(404)
 await db.link.update({where:{id:link},data:{status:'PUBLISHED'}})
 const csrf=await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:2},null,{cookie:'accessToken='+token()+'; csrf=valid'});expect(csrf.statusCode).toBe(403)
 await db.userIdentifier.updateMany({where:{userId:owner},data:{confirmedAt:null}})
 expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:2})).statusCode).toBe(403)
 await db.userIdentifier.updateMany({where:{userId:owner},data:{confirmedAt:new Date()}})
 await db.workspaceMembership.create({data:{id:randomUUID(),tenantId:tenant,ownerId:owner,userId:other,grants:{links:{read:true,write:false}}}})
 expect((await call('GET',`links/${link}/media`,undefined,other,{'x-workspace-owner':owner})).statusCode).toBe(200)
 expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:2},other,{'x-workspace-owner':owner})).statusCode).toBe(403)
 await db.workspaceMembership.updateMany({where:{userId:other,ownerId:owner},data:{grants:{links:{read:true,write:true}}}})
 expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:2},other,{'x-workspace-owner':owner})).statusCode).toBe(200)
 expect((await db.auditLog.findFirstOrThrow({where:{tenantId:tenant,action:'link.media.propose'},orderBy:{createdAt:'desc'}})).actorId).toBe(other) const currentPending=await db.linkMediaAsset.findFirstOrThrow({where:{linkId:link,status:'PENDING'}}) const older=Array.from({length:101},(_,i)=>({id:randomUUID(),tenantId:tenant,ownerId:owner,networkId:network,nicheId:niche,name:'Older '+i,description:'Fixture',canonicalUrl:'https://example.com/older-'+i,status:'PUBLISHED' as const})) await db.link.createMany({data:older}) await db.linkMediaAsset.createMany({data:older.map(row=>({id:randomUUID(),tenantId:tenant,linkId:row.id,kind:'IMAGE',status:'PENDING',alt:'Older',bytes:currentPending.bytes,revision:1,createdAt:new Date('2020-01-01Z')}))}) const firstHundred=(await call('GET','admin/moderation/media',undefined,admin)).json().assets expect(firstHundred).toHaveLength(100);expect(firstHundred.some((row:{linkId:string})=>row.linkId===link)).toBe(false) expect((await call('GET','admin/moderation/media?linkId='+link,undefined,admin)).json().assets).toHaveLength(1) expect((await call('GET','admin/moderation/media?linkId='+link,undefined,admin)).json().assets[0]).toMatchObject({name:'Link real',network:{name:'Site'},niche:{name:'Tema'},ownerName:owner}) expect((await call('POST',`admin/moderation/media/${currentPending.id}`,{expectedVersion:3,decision:'REJECT',reason:'Imagem inadequada'},admin)).statusCode).toBe(200) const rejected=(await call('GET',`links/${link}/media`)).json() expect(rejected.reviews).toContainEqual(expect.objectContaining({kind:'IMAGE',reason:'Imagem inadequada'})) expect(rejected.assets.some((row:{status:string})=>row.status==='PENDING')).toBe(false) expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:4})).statusCode).toBe(200) expect((await call('GET',`links/${link}/media`)).json().reviews).toEqual([]) const closedPending=await db.linkMediaAsset.findFirstOrThrow({where:{linkId:link,status:'PENDING'}}) await db.link.update({where:{id:link},data:{status:'UNAVAILABLE'}});await db.user.update({where:{id:owner},data:{status:'BANNED'}}) expect((await call('GET','admin/moderation/media?linkId='+link,undefined,admin)).json().assets[0].canApprove).toBe(false) expect((await call('POST',`admin/moderation/media/${closedPending.id}`,{expectedVersion:5,decision:'APPROVE'},admin)).statusCode).toBe(403) expect((await call('POST',`admin/moderation/media/${closedPending.id}`,{expectedVersion:5,decision:'REJECT',reason:'Link retirado'},admin)).statusCode).toBe(200) expect((await call('GET','admin/moderation/media?linkId='+link,undefined,admin)).json().assets).toEqual([]) await db.link.update({where:{id:link},data:{status:'PUBLISHED'}});await db.user.update({where:{id:owner},data:{status:'ACTIVE'}}) expect((await call('PUT',`links/${link}/media/image`,{...image,expectedVersion:6})).statusCode).toBe(200) const replacement=(await call('GET',`links/${link}/media`)).json().assets.find((row:{status:string})=>row.status==='PENDING') expect((await call('POST',`admin/moderation/media/${replacement.id}`,{expectedVersion:7,decision:'APPROVE'},admin)).statusCode).toBe(200) for(const path of [publicPath,publicPath+'?width=320'])expect((await call('GET',path,undefined,null)).statusCode).toBe(404) const replacementPath=`links/${link}/media/${replacement.id}?width=320` expect((await call('GET',replacementPath,undefined,null)).statusCode).toBe(200) expect((await call('DELETE',`links/${link}/media/image`,{expectedVersion:8})).statusCode).toBe(200) expect((await call('GET',replacementPath,undefined,null)).statusCode).toBe(404)
})
