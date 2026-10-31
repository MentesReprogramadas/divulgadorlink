import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { registerAffiliateDayPlanRoutes } from './controllers/@Admin/affiliate-day-plans'
const fixture=vi.hoisted(()=>({user:vi.fn(),tenant:vi.fn(),create:vi.fn(),build:vi.fn(),read:vi.fn(),approve:vi.fn(),cancel:vi.fn()}))
vi.mock('@/lib/prisma',()=>({prisma:{user:{findFirst:fixture.user}}}))
vi.mock('@/http/tenant',()=>({normalizeTenantHost:(host:string)=>host,resolveTenant:fixture.tenant}))
vi.mock('@/use-cases/affiliates/day-plans',()=>({createAffiliateDayPlan:fixture.create,buildAffiliateDayPlan:fixture.build,readAffiliateDayPlan:fixture.read,approveAffiliateDayPlan:fixture.approve,cancelAffiliateDayPlan:fixture.cancel}))
const app=Fastify(),tenantId='planner-tenant',actorId='planner-admin',base='/api/v1/admin/affiliates/segments/segment/day-plans'
beforeAll(async()=>{await app.register(cookie);await app.register(jwt,{secret:'fixture-day-plan-secret'});await app.register(registerAffiliateDayPlanRoutes,{prefix:'/api/v1'});await app.ready()})
afterAll(()=>app.close())
beforeEach(()=>{for(const mock of Object.values(fixture))mock.mockReset();fixture.user.mockResolvedValue({id:actorId});fixture.tenant.mockResolvedValue({id:tenantId});fixture.create.mockResolvedValue({id:'batch',status:'BUILDING'});fixture.build.mockResolvedValue(1);fixture.approve.mockResolvedValue({id:'batch',status:'APPROVED'});fixture.read.mockResolvedValue({id:'batch',status:'DRAFT'})})
const token=(claims:Record<string,unknown>={})=>app.jwt.sign({sub:actorId,tenantId,role:'ADMIN',typ:'access',...claims})
const headers=()=>({host:'tenant.test',authorization:'Bearer '+token()})
const input=()=>({idempotencyKey:crypto.randomUUID(),day:'2026-11-01',count:12})
it('nega anônimos, tenant trocado e administrador revogado antes de preparar',async()=>{
  for(const authorization of [undefined,'Bearer '+token({tenantId:'other'}),'Bearer '+token({typ:'refresh'})])expect([401,403]).toContain((await app.inject({method:'POST',url:base,headers:{host:'tenant.test',...(authorization?{authorization}:{})},payload:input()})).statusCode)
  fixture.user.mockResolvedValue(null);expect((await app.inject({method:'POST',url:base,headers:headers(),payload:input()})).statusCode).toBe(403)
  expect(fixture.create).not.toHaveBeenCalled()
})
it('prepara em segundo plano sem aprovar e rejeita payload injetado ou seleção duplicada',async()=>{
  for(const body of [{...input(),priceCents:1},{...input(),count:25},{...input(),itemIds:['MLB123','MLB123']}])expect((await app.inject({method:'POST',url:base,headers:headers(),payload:body})).statusCode).toBe(400)
  const result=await app.inject({method:'POST',url:base,headers:headers(),payload:input()})
  expect(result.statusCode).toBe(202);expect(result.headers['cache-control']).toBe('private, no-store')
  expect(fixture.build).toHaveBeenCalledWith(expect.anything(),{tenantId,id:'batch'})
  expect(fixture.approve).not.toHaveBeenCalled()
})
it('aceitar e cancelar exigem confirmação explícita; consulta não agenda',async()=>{
  expect((await app.inject({method:'GET',url:base+'/batch',headers:headers()})).statusCode).toBe(200)
  for(const action of ['approve','cancel']){
    for(const payload of [{},{confirm:false},{confirm:true,message:'injected'}])expect((await app.inject({method:'POST',url:base+'/batch/'+action,headers:headers(),payload})).statusCode).toBe(400)
    expect((await app.inject({method:'POST',url:base+'/batch/'+action,headers:headers(),payload:{confirm:true}})).statusCode).toBe(200)
  }
  expect(fixture.approve).toHaveBeenCalledExactlyOnceWith(expect.anything(),tenantId,actorId,'segment','batch')
  expect(fixture.cancel).toHaveBeenCalledExactlyOnceWith(expect.anything(),tenantId,actorId,'segment','batch')
})
