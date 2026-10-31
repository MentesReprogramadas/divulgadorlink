import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { configureShopee, shopeeStatus } from './shopee'
import { affiliateDiscoveryState, configureAffiliateDiscovery, runAffiliateDiscovery } from './discovery'
import { previewAffiliateProduct, sendAffiliateProduct } from './product-review'

vi.mock('@/adapters/affiliates/openai-intelligence', () => ({ expandAffiliateTerms: vi.fn(async (term: string) => [term]), generateAffiliateTitle: vi.fn(async (_db: unknown, _tenant: string, product: { title: string }) => ({ title: product.title, source: 'ORIGINAL' })) }))
const url = process.env.AFFILIATE_DATABASE_URL
if (!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname) || !new URL(url).pathname.includes('regression')) throw new Error('Disposable regression AFFILIATE_DATABASE_URL required')
const db = new PrismaClient({ datasourceUrl: url }), tenantId = randomUUID(), actorId = randomUUID(), otherTenant = randomUUID(), oldKey = env.WEBHOOK_ENCRYPTION_KEY
let segmentId: string
beforeAll(async () => {
  env.WEBHOOK_ENCRYPTION_KEY = Buffer.alloc(32, 6).toString('base64')
  await db.tenant.createMany({ data: [{ id: tenantId, host: tenantId + '.test', name: 'Shopee integration fixture' }, { id: otherTenant, host: otherTenant + '.test', name: 'Other tenant' }] })
  await db.user.create({ data: { id: actorId, tenantId, name: 'Admin', role: 'ADMIN', passwordHash: 'fixture' } })
  const instance = await db.affiliateInstance.create({ data: { tenantId, name: 'Fixture' } })
  const segment = await db.affiliateSegment.create({ data: { tenantId, name: 'Pets', slug: 'pets', instanceId: instance.id } })
  segmentId = segment.id
  await db.affiliateSegmentInstance.create({ data: { tenantId, segmentId, instanceId: instance.id } })
  await db.affiliateGroup.create({ data: { tenantId, segmentId, instanceId: instance.id, jid: '123456@g.us', name: 'Pets #1', sequence: 1 } })
})
afterAll(async () => {
  vi.unstubAllGlobals()
  env.WEBHOOK_ENCRYPTION_KEY = oldKey
  await db.affiliateDelivery.deleteMany({where:{tenantId}})
  await db.affiliateBroadcast.deleteMany({where:{tenantId}})
  await db.affiliateOffer.deleteMany({where:{tenantId}})
  await db.affiliateGroup.deleteMany({where:{tenantId}})
  await db.affiliateSegment.deleteMany({where:{tenantId}})
  await db.affiliateInstance.deleteMany({where:{tenantId}})
  await db.auditLog.deleteMany({where:{tenantId}})
  await db.user.deleteMany({where:{tenantId}})
  await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}})
  await db.$disconnect()
})

it('collects Shopee, revalidates exact price, signs preview and queues one approved broadcast without real sends', async () => {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (target: string, init: RequestInit) => {
    expect(target).toBe('https://open-api.affiliate.shopee.com.br/graphql')
    const body = JSON.parse(String(init.body)) as { query: string }
    requests.push(body.query)
    if (body.query.includes('generateShortLink')) return Response.json({ data: { generateShortLink: { shortLink: 'https://s.shopee.com.br/test' } } })
    return Response.json({ data: { productOfferV2: { nodes: [{ itemId: 456, shopId: 123, productName: 'Brinquedo para gatos', productLink: 'https://shopee.com.br/product/123/456', priceMin: '21.30', priceMax: '21.30', priceDiscountRate:39, imageUrl: 'https://down-br.img.susercontent.com/file/test' }], pageInfo: { page: 1, limit: 20, hasNextPage: false } } } })
  }))
  await configureShopee(db, tenantId, actorId, { appId: '123456', secret: 'test-only-shopee-secret', accountLabel: 'Fixture', subIds: ['pets'] })
  expect(await shopeeStatus(db, otherTenant)).toMatchObject({ configured: false })
  await configureAffiliateDiscovery(db, tenantId, actorId, segmentId, { enabled: true, terms: ['Pets'], provider: 'SHOPEE' })
  expect(await runAffiliateDiscovery(db, undefined, new Date(), { tenantId, segmentId })).toBe(1)
  const discovery = await affiliateDiscoveryState(db, tenantId, segmentId, { view: 'ALL', mode: 'MIXED' })
  expect(discovery.products).toEqual([expect.objectContaining({ id: 'SHP123_456', provider: 'SHOPEE', priceCents: 2130, oldPriceCents:3492, oldPriceEstimated:true })])
  const preview = await previewAffiliateProduct(db, tenantId, actorId, segmentId, 'SHP123_456')
  expect(preview.affiliateUrl).toBe('https://s.shopee.com.br/test')
  expect(preview.message).toContain('De: ~R$ 34,92~')
  expect(preview.message).toContain('*39% OFF* · Economize *R$ 13,62*')
  const sent = await sendAffiliateProduct(db, tenantId, actorId, segmentId, preview.previewToken)
  expect(await sendAffiliateProduct(db, tenantId, actorId, segmentId, preview.previewToken)).toEqual(sent)
  expect(await db.affiliateDelivery.count({where:{tenantId,broadcastId:sent.broadcastId,state:'PENDING'}})).toBe(1)
  expect((await db.affiliateBroadcast.findUniqueOrThrow({where:{id:sent.broadcastId}})).message).toBe(preview.message)
  expect(await db.affiliateOffer.findUniqueOrThrow({where:{id:sent.offerId}})).toMatchObject({reportedDiscountPercent:39,oldPriceCents:3492,oldPriceEstimated:true})
  expect((await db.affiliateBroadcast.findUniqueOrThrow({where:{id:sent.broadcastId}})).productSnapshot).toMatchObject({reportedDiscountPercent:39,oldPriceEstimated:true})
  expect(await db.affiliateConnection.count({where:{tenantId,provider:'MERCADO_LIVRE_SESSION'}})).toBe(0)
  expect(requests).toHaveLength(3)
})
