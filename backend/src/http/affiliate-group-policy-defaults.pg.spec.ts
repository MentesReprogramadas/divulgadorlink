import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { sealWebhookSecret } from '@/lib/webhook-secret'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { InMemoryTenantsRepository } from '@/repositories/tenants-repository'
import { registerAffiliateRoutes } from './controllers/@Admin/affiliates'
import { prisma as db } from '@/lib/prisma'
import { AFFILIATE_GROUP_POLICY_DEFAULTS_KEY, saveAffiliateGroupPolicyDefaults } from '@/use-cases/affiliates/group-policy-defaults'

vi.mock('@/lib/prisma',async()=>{
  const {PrismaClient}=await import('@prisma/client'),url=process.env.AFFILIATE_DATABASE_URL
  if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||!new URL(url).pathname.includes('regression'))throw new Error('Disposable regression AFFILIATE_DATABASE_URL required')
  return {prisma:new PrismaClient({datasourceUrl:url})}
})
const app=Fastify(),tenantA=randomUUID(),tenantB=randomUUID(),actorA=randomUUID(),actorB=randomUUID(),oldKey=env.WEBHOOK_ENCRYPTION_KEY
const policy={enabled:true,disappearingSeconds:86400 as const,joinApproval:true,autoApproveDelaySeconds:10}
const legacy={groupPolicyEnabled:false,groupDisappearingSeconds:604800,groupJoinApproval:true,groupAutoApproveDelaySeconds:10}
const instances=new Map<string,string>(),base='/api/v1/admin/affiliates'
const headers=(tenantId:string=tenantA,actorId:string=tenantId===tenantA?actorA:actorB)=>({host:tenantId+'.test',authorization:'Bearer '+app.jwt.sign({sub:actorId,tenantId,typ:'access',role:'ADMIN'})})
async function createSegment(tenantId:string,slug:string){return app.inject({method:'POST',url:base+'/segments',headers:headers(tenantId),payload:{name:'Segmento '+slug,slug,instanceId:instances.get(tenantId),enabled:false}})}
beforeAll(async()=>{
  env.WEBHOOK_ENCRYPTION_KEY=Buffer.alloc(32,24).toString('base64')
  env.AFFILIATE_EVOLUTION_BASE_URL='https://evolution.test'
  await db.tenant.createMany({data:[{id:tenantA,host:tenantA+'.test',name:'Defaults A'},{id:tenantB,host:tenantB+'.test',name:'Defaults B'}]})
  await db.user.createMany({data:[{id:actorA,tenantId:tenantA,name:'Admin A',role:'ADMIN',passwordHash:'fixture'},{id:actorB,tenantId:tenantB,name:'Admin B',role:'ADMIN',passwordHash:'fixture'}]})
  for(const tenantId of [tenantA,tenantB]){
    const name='defaults-'+tenantId
    const row=await db.affiliateInstance.create({data:{tenantId,name,secret:sealWebhookSecret('test-only-instance-secret',env.WEBHOOK_ENCRYPTION_KEY,`affiliate-instance:${tenantId}:${name}`)}})
    instances.set(tenantId,row.id)
  }
  setTenantsRepositoryForTest(new InMemoryTenantsRepository([{id:tenantA,host:tenantA+'.test',name:'A'},{id:tenantB,host:tenantB+'.test',name:'B'}]))
  await app.register(cookie);await app.register(jwt,{secret:'test-group-defaults-secret'});await app.register(registerAffiliateRoutes,{prefix:'/api/v1'});await app.ready()
  vi.stubGlobal('fetch',vi.fn(async(input:URL)=>{
    if(input.pathname.includes('connectionState'))return Response.json({instance:{state:'open'}})
    throw new Error('No group/provider action is authorized by this fixture')
  }))
})
afterAll(async()=>{
  vi.unstubAllGlobals();env.WEBHOOK_ENCRYPTION_KEY=oldKey
  await db.affiliateSegment.deleteMany({where:{tenantId:{in:[tenantA,tenantB]}}})
  await db.affiliateInstance.deleteMany({where:{tenantId:{in:[tenantA,tenantB]}}})
  await db.config.deleteMany({where:{tenantId:{in:[tenantA,tenantB]}}})
  await db.auditLog.deleteMany({where:{tenantId:{in:[tenantA,tenantB]}}})
  await db.user.deleteMany({where:{tenantId:{in:[tenantA,tenantB]}}})
  await db.tenant.deleteMany({where:{id:{in:[tenantA,tenantB]}}})
  await app.close();await db.$disconnect();setTenantsRepositoryForTest(new InMemoryTenantsRepository([]))
})

it('aplica defaults do tenant somente a novas segmentações e preserva outro tenant e segmentos existentes',async()=>{
  const oldA=await createSegment(tenantA,'legado-a')
  expect(oldA.statusCode).toBe(200);expect(oldA.json()).toMatchObject(legacy)
  const saved=await app.inject({method:'PUT',url:base+'/group-policy-defaults',headers:headers(),payload:policy})
  expect(saved.statusCode).toBe(200)
  const newA=await createSegment(tenantA,'novo-a'),newB=await createSegment(tenantB,'novo-b')
  expect(newA.statusCode).toBe(200);expect(newB.statusCode).toBe(200)
  expect(newA.json()).toMatchObject({groupPolicyEnabled:true,groupDisappearingSeconds:86400,groupJoinApproval:true,groupAutoApproveDelaySeconds:10})
  expect(newB.json()).toMatchObject(legacy)
  expect(await db.affiliateSegment.findUniqueOrThrow({where:{id:oldA.json().id}})).toMatchObject(legacy)
  expect((await app.inject({url:base+'/group-policy-defaults',headers:headers()})).json()).toEqual({configured:true,policy})
  expect((await app.inject({url:base+'/group-policy-defaults',headers:headers(tenantB)})).json()).toEqual({configured:false,policy:null})
  expect(await db.auditLog.count({where:{tenantId:tenantA,actorId:actorA,action:'affiliate.group_policy_defaults.updated'}})).toBe(1)
})
it('nega anônimo, conta cruzada e admin revogado; rejeita defaults inválidos',async()=>{
  const path=base+'/group-policy-defaults'
  expect((await app.inject({url:path,headers:{host:tenantA+'.test'}})).statusCode).toBe(401)
  expect((await app.inject({method:'PUT',url:path,headers:{...headers(tenantA),host:tenantB+'.test'},payload:policy})).statusCode).toBe(403)
  await db.user.update({where:{id:actorA},data:{role:'USER'}})
  try {expect((await app.inject({method:'PUT',url:path,headers:headers(),payload:policy})).statusCode).toBe(403)}
  finally {await db.user.update({where:{id:actorA},data:{role:'ADMIN'}})}
  for(const patch of [{autoApproveDelaySeconds:9},{disappearingSeconds:3600},{tenantId:tenantB}])expect((await app.inject({method:'PUT',url:path,headers:headers(),payload:{...policy,...patch}})).statusCode).toBe(400)
})
it('serviço de configuração também nega ator de outro tenant e conta bloqueada',async()=>{
  await expect(saveAffiliateGroupPolicyDefaults(db,tenantB,actorA,policy)).rejects.toMatchObject({status:403})
  await db.user.update({where:{id:actorA},data:{status:'BANNED'}})
  try {await expect(saveAffiliateGroupPolicyDefaults(db,tenantA,actorA,policy)).rejects.toMatchObject({status:403})}
  finally {await db.user.update({where:{id:actorA},data:{status:'ACTIVE'}})}
  expect(await db.config.count({where:{tenantId:tenantB,key:AFFILIATE_GROUP_POLICY_DEFAULTS_KEY}})).toBe(0)
})
it('não cria segmento com configuração corrompida nem desativa aprovação silenciosamente; permite reparo explícito',async()=>{
  await db.config.upsert({where:{tenantId_key:{tenantId:tenantA,key:AFFILIATE_GROUP_POLICY_DEFAULTS_KEY}},create:{tenantId:tenantA,key:AFFILIATE_GROUP_POLICY_DEFAULTS_KEY,value:'{}'},update:{value:'{}'}})
  const blocked=await createSegment(tenantA,'corrompido')
  expect(blocked.statusCode).toBe(503)
  expect(await db.affiliateSegment.count({where:{tenantId:tenantA,slug:'corrompido'}})).toBe(0)
  await saveAffiliateGroupPolicyDefaults(db,tenantA,actorA,policy)
  expect((await createSegment(tenantA,'reparado')).json()).toMatchObject({groupPolicyEnabled:true,groupDisappearingSeconds:86400})
})
