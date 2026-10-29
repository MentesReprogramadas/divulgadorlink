import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import sharp from 'sharp'
import { afterAll,beforeAll,expect,it,vi } from 'vitest'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { InMemoryTenantsRepository } from '@/repositories/tenants-repository'
import { registerAffiliateImageRoutes } from './controllers/@Admin/affiliate-images'
import { prisma as db } from '@/lib/prisma'

vi.mock('@/lib/prisma',async()=>{
  const {PrismaClient}=await import('@prisma/client'),url=process.env.AFFILIATE_DATABASE_URL
  if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Disposable AFFILIATE_DATABASE_URL required')
  return {prisma:new PrismaClient({datasourceUrl:url})}
})
const app=Fastify(),tenantId=randomUUID(),actorId=randomUUID(),otherTenant=randomUUID(),otherAdmin=randomUUID(),host=tenantId+'.test',otherHost=otherTenant+'.test'
beforeAll(async()=>{
  await db.tenant.createMany({data:[{id:tenantId,host,name:'Imagens fixture'},{id:otherTenant,host:otherHost,name:'Outro tenant fixture'}]})
  await db.user.createMany({data:[{id:actorId,tenantId,name:'Admin',role:'ADMIN',passwordHash:'fixture'},{id:otherAdmin,tenantId:otherTenant,name:'Outro admin',role:'ADMIN',passwordHash:'fixture'}]})
  setTenantsRepositoryForTest(new InMemoryTenantsRepository([{id:tenantId,host,name:'Imagens fixture'},{id:otherTenant,host:otherHost,name:'Outro tenant fixture'}]))
  await app.register(cookie);await app.register(jwt,{secret:'affiliate-images-http-fixture-secret'});await app.register(registerAffiliateImageRoutes,{prefix:'/api/v1'});await app.ready()
})
afterAll(async()=>{
  await db.affiliateImage.deleteMany({where:{tenantId:{in:[tenantId,otherTenant]}}});await db.auditLog.deleteMany({where:{tenantId:{in:[tenantId,otherTenant]}}});await db.user.deleteMany({where:{tenantId:{in:[tenantId,otherTenant]}}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await app.close();await db.$disconnect()
})
const headers=(other=false)=>({host:other?otherHost:host,authorization:'Bearer '+app.jwt.sign({sub:other?otherAdmin:actorId,tenantId:other?otherTenant:tenantId,typ:'access',role:'ADMIN'})})
it('valida imagem real, normaliza WebP e isola preview autenticado por tenant',async()=>{
  const bytes=await sharp({create:{width:32,height:32,channels:4,background:'#3058a0'}}).png().toBuffer(),path='/api/v1/admin/affiliates/images'
  expect((await app.inject({method:'POST',url:path,headers:{host},payload:{base64:bytes.toString('base64')}})).statusCode).toBe(401)
  const upload=await app.inject({method:'POST',url:path,headers:headers(),payload:{base64:bytes.toString('base64')}})
  expect(upload.statusCode,upload.body).toBe(200)
  const id=upload.json().url.slice('affiliate-image:'.length),preview=await app.inject({url:path+'/'+id,headers:headers()})
  expect(preview.statusCode).toBe(200);expect(preview.headers['content-type']).toBe('image/webp');expect((await sharp(preview.rawPayload).metadata()).format).toBe('webp')
  expect(preview.headers['cache-control']).toContain('no-store')
  expect((await app.inject({url:path+'/'+id,headers:headers(true)})).statusCode).toBe(404)
  expect((await app.inject({url:path+'/'+id,headers:{host}})).statusCode).toBe(401)
  expect((await app.inject({method:'POST',url:path,headers:headers(),payload:{base64:Buffer.from('<svg onload=evil()>').toString('base64')}})).statusCode).toBe(400)
  expect(await db.affiliateImage.count({where:{tenantId}})).toBe(1)
})
