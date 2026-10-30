import Fastify from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({find:vi.fn(),record:vi.fn(),admin:vi.fn(),key:Buffer.alloc(32,42).toString('base64')}))
vi.mock('@/env',()=>({env:{WEBHOOK_ENCRYPTION_KEY:mocks.key}}))
vi.mock('@/lib/prisma',()=>({prisma:{affiliateInstance:{findUnique:mocks.find}}}))
vi.mock('@/use-cases/affiliates/membership',()=>({recordAffiliateMembership:mocks.record,baselineAffiliateMembership:vi.fn()}))
vi.mock('@/http/controllers/@Admin/affiliate-access',()=>({requireAffiliateAdmin:mocks.admin}))
import { affiliateMembershipRoutes } from './controllers/@Integrations/affiliate-membership'
import { membershipWebhookSecret } from '@/domain/affiliates/membership'
const body={event:'group-participants.update',instance:'one',date_time:'2026-10-29T15:00:00Z',data:{id:'123@g.us',participants:['456@lid'],action:'add'}}
beforeEach(()=>{vi.clearAllMocks();mocks.find.mockResolvedValue({id:'one-id',tenantId:'tenant',name:'one',enabled:true});mocks.record.mockResolvedValue('accepted');mocks.admin.mockImplementation(async(_q,r)=>{r.code(401).send({});return null})})
describe('membership receiver authentication',()=>{
  it('normalizes the authenticated provider offset and rejects invalid headers only after secret verification',async()=>{
    const app=Fastify();await app.register(affiliateMembershipRoutes)
    const send=(offset:string,secret=membershipWebhookSecret(mocks.key,'tenant','one-id'),payload:object=body)=>app.inject({method:'POST',url:'/integrations/evolution/affiliate-membership/one-id/webhook',headers:{'x-evolution-secret':secret,'x-evolution-clock-offset-minutes':offset},payload})
    expect((await send('180')).statusCode).toBe(200)
    expect(mocks.record).toHaveBeenLastCalledWith(expect.anything(),'tenant','one-id',expect.objectContaining({occurredAt:new Date('2026-10-29T18:00:00Z')}),mocks.key)
    mocks.record.mockClear()
    for(const offset of ['180.5','10','855','-855','abc','180,180','']) {
      const response=await send(offset)
      expect(response.statusCode).toBe(400);expect(response.json()).toEqual({accepted:false})
    }
    expect((await send('180',undefined,{...body,date_time:'2026-10-29T15:00:00-03:00'})).statusCode).toBe(400)
    expect((await send('bad',membershipWebhookSecret(mocks.key,'other-tenant','one-id'))).statusCode).toBe(401)
    expect(mocks.record).not.toHaveBeenCalled()
    await app.close()
  })
  it('requires instance scoped secret, rejects spoofed name, never counts bad auth',async()=>{
    const app=Fastify();await app.register(affiliateMembershipRoutes)
    const send=(secret?:string,payload:object=body)=>app.inject({method:'POST',url:'/integrations/evolution/affiliate-membership/one-id/webhook',headers:secret?{'x-evolution-secret':secret}:{},payload})
    expect((await send()).statusCode).toBe(401)
    expect((await send(membershipWebhookSecret(mocks.key,'other-tenant','one-id'))).statusCode).toBe(401)
    const secret=membershipWebhookSecret(mocks.key,'tenant','one-id')
    expect((await send(secret,{...body,instance:'spoofed'})).statusCode).toBe(400)
    expect(mocks.record).not.toHaveBeenCalled()
    expect((await send(secret)).json()).toEqual({accepted:true,result:'accepted'})
    expect(mocks.record).toHaveBeenCalledWith(expect.anything(),'tenant','one-id',expect.objectContaining({participants:['456@lid']}),mocks.key)
    await app.close()
  })
  it('returns retryable 503 with sanitized response when storage fails; admin routes require session',async()=>{
    const app=Fastify();await app.register(affiliateMembershipRoutes)
    mocks.record.mockRejectedValue(new Error('raw 5511999999999'))
    const response=await app.inject({method:'POST',url:'/integrations/evolution/affiliate-membership/one-id/webhook',headers:{'x-evolution-secret':membershipWebhookSecret(mocks.key,'tenant','one-id')},payload:body})
    expect(response.statusCode).toBe(503);expect(response.body).not.toContain('5511999999999');expect(response.headers['retry-after']).toBe('10')
    expect((await app.inject({url:'/admin/affiliates/membership'})).statusCode).toBe(401)
    expect((await app.inject({method:'POST',url:'/admin/affiliates/groups/one/membership/baseline',payload:{}})).statusCode).toBe(401)
    await app.close()
  })
  it('bounds concurrent authenticated work and returns retryable 429 without dropping acknowledged events',async()=>{
    const app=Fastify();await app.register(affiliateMembershipRoutes);await app.ready()
    let finish!:()=>void
    const pending=new Promise<void>(resolve=>{finish=resolve})
    mocks.record.mockImplementation(async()=>{await pending;return 'accepted'})
    const send=async()=>app.inject({method:'POST',url:'/integrations/evolution/affiliate-membership/one-id/webhook',headers:{'x-evolution-secret':membershipWebhookSecret(mocks.key,'tenant','one-id')},payload:body})
    const requests=Array.from({length:16},()=>send())
    await vi.waitFor(()=>expect(mocks.record).toHaveBeenCalledTimes(16))
    const response=await send()
    expect(response.statusCode).toBe(429);expect(response.headers['retry-after']).toBe('10')
    finish()
    expect((await Promise.all(requests)).every(row=>row.statusCode===200)).toBe(true)
    await app.close()
  })
})
