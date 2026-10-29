import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAffiliateProductRoutes } from './controllers/@Admin/affiliate-products'

const fixture=vi.hoisted(()=>({user:vi.fn(),tenant:vi.fn(),preview:vi.fn(),title:vi.fn(),send:vi.fn(),decide:vi.fn(),history:vi.fn(),status:vi.fn(),drain:vi.fn()}))
vi.mock('@/lib/prisma',()=>({prisma:{user:{findFirst:fixture.user}}}))
vi.mock('@/http/tenant',()=>({normalizeTenantHost:(host:string)=>host.split(':')[0],resolveTenant:fixture.tenant}))
vi.mock('@/use-cases/affiliates/product-review',()=>({previewAffiliateProduct:fixture.preview,regenerateAffiliateProductTitle:fixture.title,sendAffiliateProduct:fixture.send,decideAffiliateProduct:fixture.decide}))
vi.mock('@/use-cases/affiliates/broadcast-history',()=>({affiliateBroadcastHistory:fixture.history,affiliateBroadcastStatus:fixture.status}))
vi.mock('@/use-cases/affiliates/deliveries',()=>({requestAffiliateDeliveryDrain:fixture.drain}))
const app=Fastify(),tenantId='products-http-tenant',actorId='products-http-admin'
beforeAll(async()=>{await app.register(cookie);await app.register(jwt,{secret:'test-only-affiliate-products-secret'});await app.register(registerAffiliateProductRoutes,{prefix:'/api/v1'});await app.ready()})
afterAll(()=>app.close())
beforeEach(()=>{
  for(const mock of Object.values(fixture))mock.mockReset()
  fixture.user.mockResolvedValue({id:actorId});fixture.tenant.mockResolvedValue({id:tenantId,host:'tenant.test'})
  fixture.preview.mockResolvedValue({message:'Prévia sem envio',previewToken:'opaque-token'})
  fixture.send.mockResolvedValue({broadcastId:'broadcast-1',offerId:'offer-1',groups:2});fixture.drain.mockResolvedValue(1)
  fixture.decide.mockResolvedValue({saved:true});fixture.history.mockResolvedValue({broadcasts:[],nextCursor:null,totalCount:0})
})
const token=(claims:Record<string,unknown>={})=>app.jwt.sign({sub:actorId,tenantId,role:'ADMIN',typ:'access',...claims})
const headers=()=>({host:'tenant.test',authorization:'Bearer '+token()})
const base='/api/v1/admin/affiliates'
describe('prévia e envio administrativo',()=>{
  it('regenera somente título autenticado e rejeita conteúdo arbitrário',async()=>{
    fixture.title.mockResolvedValue({previewToken:'new-token',title:'Outro título',titleSource:'OPENAI',message:'Nova mensagem',expiresAt:'2026-10-28T12:00:00.000Z'})
    const url=base+'/segments/segment/products/preview/title'
    expect((await app.inject({method:'POST',url,headers:{host:'tenant.test'},payload:{previewToken:'signed'}})).statusCode).toBe(401)
    expect((await app.inject({method:'POST',url,headers:headers(),payload:{previewToken:'signed',title:'Texto arbitrário'}})).statusCode).toBe(400)
    const result=await app.inject({method:'POST',url,headers:headers(),payload:{previewToken:'signed'}})
    expect(result.statusCode).toBe(200);expect(result.json()).toMatchObject({previewToken:'new-token',titleSource:'OPENAI'})
    expect(fixture.title).toHaveBeenCalledExactlyOnceWith(expect.anything(),tenantId,actorId,'segment','signed')
    expect(fixture.send).not.toHaveBeenCalled();expect(fixture.drain).not.toHaveBeenCalled()
  })
  it('bloqueia ausência de sessão, refresh token, tenant diferente e papel revogado antes da operação',async()=>{
    for(const authorization of [undefined,'Bearer '+token({typ:'refresh'}),'Bearer '+token({tenantId:'other'})]){
      const result=await app.inject({method:'POST',url:base+'/segments/segment/products/preview',headers:{host:'tenant.test',...(authorization?{authorization}:{})},payload:{itemId:'MLB123'}})
      expect([401,403]).toContain(result.statusCode)
    }
    fixture.user.mockResolvedValue(null)
    expect((await app.inject({method:'GET',url:base+'/broadcasts',headers:headers()})).statusCode).toBe(403)
    expect(fixture.preview).not.toHaveBeenCalled();expect(fixture.history).not.toHaveBeenCalled()
  })
  it('prévia não dispara processamento; enviar exige confirmação e inicia apenas a distribuição aprovada',async()=>{
    const preview=await app.inject({method:'POST',url:base+'/segments/segment/products/preview',headers:headers(),payload:{itemId:'MLB123'}})
    expect(preview.statusCode).toBe(200);expect(preview.headers['cache-control']).toBe('private, no-store')
    expect(fixture.send).not.toHaveBeenCalled();expect(fixture.drain).not.toHaveBeenCalled()
    for(const payload of [{previewToken:'private-preview'},{previewToken:'private-preview',confirm:false},{previewToken:'private-preview',confirm:true,priceCents:1}]){
      const denied=await app.inject({method:'POST',url:base+'/segments/segment/products/send',headers:headers(),payload})
      expect(denied.statusCode).toBe(400);expect(denied.body).not.toContain('private-preview')
    }
    expect(fixture.send).not.toHaveBeenCalled()
    const sent=await app.inject({method:'POST',url:base+'/segments/segment/products/send',headers:headers(),payload:{previewToken:'private-preview',confirm:true}})
    expect(sent.statusCode).toBe(202);expect(fixture.send).toHaveBeenCalledWith(expect.anything(),tenantId,actorId,'segment','private-preview')
    expect(fixture.drain).toHaveBeenCalledWith(expect.anything(),{tenantId,broadcastId:'broadcast-1'})
  })
  it('descarte e restauração não chamam envio e paginação rejeita parâmetros inválidos',async()=>{
    for(const action of ['discard','restore']){
      expect((await app.inject({method:'POST',url:base+'/segments/segment/products/'+action,headers:headers(),payload:{itemId:'MLB123'}})).statusCode).toBe(200)
    }
    expect(fixture.drain).not.toHaveBeenCalled();expect(fixture.send).not.toHaveBeenCalled()
    expect((await app.inject({url:base+'/broadcasts?limit=51',headers:headers()})).statusCode).toBe(400)
    expect((await app.inject({url:base+'/broadcasts?limit=12&segmentId=segment',headers:headers()})).statusCode).toBe(200)
    expect(fixture.history).toHaveBeenCalledWith(expect.anything(),tenantId,{limit:12,segmentId:'segment'})
  })
})
