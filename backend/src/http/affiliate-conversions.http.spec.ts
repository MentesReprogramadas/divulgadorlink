import Fastify from 'fastify'
import {beforeEach,describe,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({record:vi.fn(),tenant:vi.fn()}))
vi.mock('@/lib/prisma',()=>({prisma:{}}))
vi.mock('@/http/tenant',()=>({resolveTenant:mocks.tenant,normalizeTenantHost:(host:string)=>host}))
vi.mock('@/use-cases/affiliates/conversions',()=>({recordConversionIntent:mocks.record}))
import {affiliateConversionRoutes} from './controllers/@Integrations/affiliate-conversions'
beforeEach(()=>{vi.clearAllMocks();mocks.tenant.mockResolvedValue({id:'tenant',host:'example.test'});mocks.record.mockResolvedValue({joinUrl:'https://example.test/ofertas/entrar/pets',tracked:false})})
describe('public conversion intent receiver',()=>{
 it('forwards actual browser headers and host resolved tenant without returning personal data',async()=>{
  const app=Fastify();await app.register(affiliateConversionRoutes)
  const input={phone:'',marketingConsent:false,sourceUrl:'https://example.test/pets'}
  const response=await app.inject({method:'POST',url:'/public/affiliates/pets/conversion-intent',headers:{host:'example.test',origin:'https://example.test','user-agent':'real browser'},payload:input})
  expect(response.statusCode).toBe(200);expect(response.json()).toEqual({joinUrl:'https://example.test/ofertas/entrar/pets',tracked:false})
  expect(mocks.tenant).toHaveBeenCalledWith('example.test')
  expect(mocks.record).toHaveBeenCalledWith({}, {id:'tenant',host:'example.test'},'pets',input,'real browser','https://example.test')
  await app.close()
 })
 it('contains errors and never exposes raw submitted phone or error details',async()=>{
  const app=Fastify();await app.register(affiliateConversionRoutes)
  mocks.record.mockRejectedValue(new Error('5511999991234 secret'))
  const response=await app.inject({method:'POST',url:'/public/affiliates/pets/conversion-intent',payload:{}})
  expect(response.statusCode).toBe(503);expect(response.body).not.toMatch(/5511999991234|secret/)
  await app.close()
 })
})

describe('conversion intent serial rate boundary',()=>{
 it('returns retryable 429 after twenty serial attempts for the same IP tenant and slug',async()=>{
  const app=Fastify();await app.register(affiliateConversionRoutes)
  for(let index=0;index<20;index++)expect((await app.inject({method:'POST',url:'/public/affiliates/pets/conversion-intent',payload:{}})).statusCode).toBe(200)
  const rejected=await app.inject({method:'POST',url:'/public/affiliates/pets/conversion-intent',payload:{}})
  expect(rejected.statusCode).toBe(429);expect(rejected.headers['retry-after']).toBe('60');expect(mocks.record).toHaveBeenCalledTimes(20)
  expect((await app.inject({method:'POST',url:'/public/affiliates/other/conversion-intent',payload:{}})).statusCode).toBe(200)
  await app.close()
 })
})
