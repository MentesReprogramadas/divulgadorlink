import { randomUUID } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { app } from '@/app'
import { setProfilesForTest } from '@/http/controllers/@Profiles/routes'
import { setTenantsRepositoryForTest } from '@/http/tenant'
const url=process.env.ANALYTICS_DATABASE_URL
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Disposable local database required')
const db=new PrismaClient({datasources:{db:{url}}})
let tenant:string,foreign:string,owner:string,follower:string,profile:string,niche:string
beforeAll(async()=>{setProfilesForTest(db);setTenantsRepositoryForTest({async findByHost(host){return db.tenant.findUnique({where:{host}})}});await app.ready()})
beforeEach(async()=>{
 tenant=randomUUID();foreign=randomUUID();owner=randomUUID();follower=randomUUID();profile=randomUUID();niche=randomUUID()
 for(const id of [tenant,foreign])await db.tenant.create({data:{id,host:id+'.test',name:'F24'}})
 for(const [id,tenantId] of [[owner,tenant],[follower,tenant],[randomUUID(),foreign]])await db.user.create({data:{id,tenantId,name:'Pessoa privada sentinela',passwordHash:'fixture'}})
 await db.niche.create({data:{id:niche,tenantId:tenant,name:'Educação',slug:'educacao'}})
 const group=randomUUID(),content={slug:'pagina-publica',name:'Ana pública',bio:'Conteúdo aprovado',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[{id:group,name:'Público',visible:true}],items:[{id:randomUUID(),categoryId:group,type:'URL',label:'Site',destination:'https://example.com',visible:true}]}
 await db.profile.create({data:{id:profile,tenantId:tenant,ownerId:owner,slug:content.slug,name:'RASCUNHO_SENTINELA',bio:'SEGREDO_SENTINELA',publication:content,publishedVersion:1,version:2}})
})
afterAll(async()=>{setProfilesForTest(null);await db.$disconnect()})
function call(method:'GET'|'PATCH'|'PUT'|'DELETE',path:string,body?:unknown,user:string|null=owner,tokenTenant=tenant,hostTenant=tenant,cookie?:string){return app.inject({method,url:'/api/v1/'+path,headers:{host:hostTenant+'.test',...(user?{authorization:'Bearer '+app.jwt.sign({sub:user,tenantId:tokenTenant,role:'USER',typ:'access'})}:{}),...(cookie?{cookie}:{})},...(body?{payload:body}:{})})}
async function enable(enabled=true,expectedVersion=0){const response=await call('PATCH','me/profile/discovery',{enabled,nicheId:niche,expectedVersion});expect(response.statusCode,response.body).toBe(200)}
it('F24-T01/AC01/I01 apenas opt-in publicado e ativo; usa snapshot, nunca rascunho; desligar tem efeito imediato',async()=>{
 expect((await call('GET','profiles')).json().profiles).toHaveLength(0)
 await enable();const response=await call('GET','profiles?q=Ana');expect(response.statusCode).toBe(200);expect(response.json().profiles).toHaveLength(1);expect(response.body).not.toMatch(/SENTINELA|ownerId|passwordHash|publication/)
 expect((await call('GET','profiles?q=RASCUNHO')).json().profiles).toHaveLength(0)
 await enable(false,1);expect((await call('GET','profiles')).json().profiles).toHaveLength(0)
 await enable(true,2);await db.profile.update({where:{id:profile},data:{publishedVersion:null,publication:Prisma.DbNull}})
 expect((await call('GET','profiles')).json().profiles).toHaveLength(0)
})
it('F24-T02/AC02/I02 tenant, nicho, restrição etária e conta suspensa são verificados no servidor',async()=>{
 await enable();expect((await call('GET','profiles',undefined,null,foreign,foreign)).json().profiles).toHaveLength(0)
 expect((await call('PATCH','me/profile/discovery',{enabled:true,nicheId:niche,expectedVersion:1},null)).statusCode).toBe(401)
 expect((await call('PATCH','me/profile/discovery',{enabled:true,nicheId:niche,expectedVersion:1},owner,tenant,foreign)).statusCode).toBe(403)
 expect((await call('PATCH','me/profile/discovery',{enabled:true,nicheId:niche,expectedVersion:1},follower)).statusCode).toBe(409)
 const external=await db.niche.create({data:{tenantId:foreign,name:'Outro',slug:'outro'}})
 expect((await call('PATCH','me/profile/discovery',{enabled:true,nicheId:external.id,expectedVersion:1})).statusCode).toBe(400)
 await db.niche.update({where:{id:niche},data:{requiresAge:true}})
 expect((await call('GET','profiles')).json().profiles).toHaveLength(0)
 expect((await call('GET','profiles',undefined,null,tenant,tenant,'age=yes')).json().profiles).toHaveLength(1)
 expect((await call('PUT','me/followed-profiles/'+profile,undefined,follower)).statusCode).toBe(404)
 await db.user.update({where:{id:owner},data:{status:'BANNED'}})
 expect((await call('GET','profiles',undefined,null,tenant,tenant,'age=yes')).json().profiles).toHaveLength(0)
})
it('F24-U02/U04/T04/AC04/I03 seguir é idempotente e deixar de seguir funciona após opt-out',async()=>{
 await enable();for(let i=0;i<2;i++)expect((await call('PUT','me/followed-profiles/'+profile,undefined,follower)).json()).toEqual({following:true})
 expect((await db.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) FROM profile_follows WHERE "tenantId"=${tenant}`)[0].count).toBe(1n)
 expect((await call('GET','profiles?followed=true',undefined,follower)).json().profiles[0].following).toBe(true)
 await enable(false,1);const hidden=(await call('GET','profiles?followed=true',undefined,follower)).json().profiles[0];expect(hidden.name).toBe('Página indisponível');expect(hidden.slug).toBe(null);expect(JSON.stringify(hidden)).not.toContain('Ana');expect((await call('PUT','me/followed-profiles/'+profile,undefined,follower)).statusCode).toBe(404)
 for(let i=0;i<2;i++)expect((await call('DELETE','me/followed-profiles/'+profile,undefined,follower)).json()).toEqual({following:false})
 expect((await db.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) FROM profile_follows WHERE "tenantId"=${tenant}`)[0].count).toBe(0n)
})
it('F24-T03/AC03 não simula destaque pago; filtro por nicho e entrada estrita',async()=>{
 await enable();const response=(await call('GET','profiles?nicheId='+niche)).json();expect(response.profiles[0].sponsored).toBe(false)
 expect((await call('GET','profiles?nicheId=inexistente')).json().profiles).toHaveLength(0)
 expect((await call('GET','profiles?cursor=inválido')).statusCode).toBe(400)
 expect((await call('GET','profiles?followed=true',undefined,null)).statusCode).toBe(401)
})
it('F24-PG01 constraints rejeitam relações entre tenants; conflito não sobrescreve configuração',async()=>{
 await enable();expect((await call('PATCH','me/profile/discovery',{enabled:false,nicheId:null,expectedVersion:0})).statusCode).toBe(409)
 expect((await call('GET','me/profile/discovery')).json().enabled).toBe(true)
 await expect(db.$executeRaw`INSERT INTO profile_follows ("tenantId","userId","profileId","profileOwnerId") VALUES (${foreign},${follower},${profile},${owner})`).rejects.toThrow()
 expect((await db.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) FROM profile_follows WHERE "profileId"=${profile}`)[0].count).toBe(0n)
})
