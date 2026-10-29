import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAffiliateDiscoveryRoutes } from './controllers/@Admin/affiliate-discovery'

const fixture=vi.hoisted(()=>({user:vi.fn(),tenant:vi.fn(),state:vi.fn(),config:vi.fn(),queue:vi.fn(),collect:vi.fn()}))
vi.mock('@/lib/prisma',()=>({prisma:{user:{findFirst:fixture.user}}}))
vi.mock('@/http/tenant',()=>({normalizeTenantHost:(host:string)=>host.split(':')[0],resolveTenant:fixture.tenant}))
vi.mock('@/use-cases/affiliates/discovery',async original=>({...(await original<typeof import('@/use-cases/affiliates/discovery')>()),affiliateDiscoveryState:fixture.state,configureAffiliateDiscovery:fixture.config,queueAffiliateDiscovery:fixture.queue,runAffiliateDiscovery:fixture.collect}))
const app=Fastify(),tenantId='discovery-http-tenant',actorId='discovery-admin'
beforeAll(async()=>{
  await app.register(cookie);await app.register(jwt,{secret:'discovery-http-only-test-secret'})
  await app.register(registerAffiliateDiscoveryRoutes,{prefix:'/api/v1'});await app.ready()
})
afterAll(()=>app.close())
beforeEach(()=>{
  vi.clearAllMocks();fixture.user.mockResolvedValue({id:actorId});fixture.tenant.mockResolvedValue({id:tenantId});fixture.state.mockResolvedValue({status:'QUEUED',enabled:true,terms:['Natal'],products:[]});fixture.config.mockResolvedValue({enabled:false,status:'PAUSED'});fixture.queue.mockResolvedValue({enabled:true,status:'QUEUED'});fixture.collect.mockResolvedValue(0)
})
const token=(claims:Record<string,unknown>={})=>app.jwt.sign({sub:actorId,tenantId,role:'ADMIN',typ:'access',...claims})
const base='/api/v1/admin/affiliates/segments/segment/discovery'
const headers=()=>({host:'tenant.test',authorization:`Bearer ${token()}`})
describe('admin discovery routes',()=>{
  it('requires active own-tenant admin and rejects refresh tokens',async()=>{
    for(const authorization of [undefined,`Bearer ${token({typ:'refresh'})}`,`Bearer ${token({tenantId:'other'})}`]) {
      const response=await app.inject({url:base,headers:{host:'tenant.test',...(authorization?{authorization}:{})}})
      expect([401,403]).toContain(response.statusCode);expect(response.headers['cache-control']).toBe('private, no-store')
    }
    fixture.user.mockResolvedValue(null)
    expect((await app.inject({url:base,headers:headers()})).statusCode).toBe(403)
    expect(fixture.state).not.toHaveBeenCalled()
  })
  it('GET passes tenant scope without triggering collector',async()=>{
    const response=await app.inject({url:base,headers:headers()})
    expect(response.statusCode).toBe(200);expect(fixture.state).toHaveBeenCalledWith(expect.anything(),tenantId,'segment',{view:'ALL'});expect(fixture.collect).not.toHaveBeenCalled()
  })
  it('rejects unexpected writes and malformed terms',async()=>{
    for(const [suffix,payload] of [['refresh',{tenantId:'other'}],['config',{enabled:true,terms:['x']}],['config',{enabled:true,terms:[],unexpected:true}]] as const) expect((await app.inject({method:'POST',url:`${base}/${suffix}`,headers:headers(),payload})).statusCode).toBe(400)
    expect(fixture.queue).not.toHaveBeenCalled();expect(fixture.config).not.toHaveBeenCalled()
  })
  it('queues refresh with 202 and starts collector without awaiting provider',async()=>{
    fixture.collect.mockImplementation(()=>new Promise(()=>{}))
    const response=await app.inject({method:'POST',url:`${base}/refresh`,headers:headers(),payload:{}})
    expect(response.statusCode).toBe(202);expect(response.json()).toMatchObject({status:'QUEUED'})
    expect(fixture.queue).toHaveBeenCalledWith(expect.anything(),tenantId,actorId,'segment',{});expect(fixture.collect).toHaveBeenCalledOnce()
  })
  it('saves paused configuration without triggering collector',async()=>{
    expect((await app.inject({method:'POST',url:`${base}/config`,headers:headers(),payload:{enabled:false,terms:[]}})).statusCode).toBe(200)
    expect(fixture.config).toHaveBeenCalledWith(expect.anything(),tenantId,actorId,'segment',{enabled:false,terms:[]});expect(fixture.collect).not.toHaveBeenCalled()
  })
})
