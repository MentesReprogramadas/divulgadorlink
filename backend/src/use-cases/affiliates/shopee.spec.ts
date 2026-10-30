import type { AffiliateConnection, PrismaClient } from '@prisma/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { openWebhookSecret, sealWebhookSecret } from '@/lib/webhook-secret'
import { configureShopee, disconnectShopee, generateTenantShopeeAffiliate, shopeeConnection, shopeeStatus, verifyShopee } from './shopee'

const remote = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/adapters/affiliates/shopee', async original => ({ ...await original<typeof import('@/adapters/affiliates/shopee')>(), shopeeRequest: remote.request }))
const tenantId = 'shopee-tenant', actorId = 'admin', key = Buffer.alloc(32, 7).toString('base64'), oldKey = env.WEBHOOK_ENCRYPTION_KEY
const input = { appId: '123456', secret: 'test-only-secret', accountLabel: 'Conta teste', subIds: ['pets'] }
function fixture() {
  let row: AffiliateConnection | null = null
  const findUnique = vi.fn(async (args: { where: { tenantId_provider: { tenantId: string; provider: string } } }) => row && args.where.tenantId_provider.tenantId === row.tenantId && args.where.tenantId_provider.provider === row.provider ? { ...row } : null)
  const upsert = vi.fn(async (args: { create: Partial<AffiliateConnection>; update: Partial<AffiliateConnection> }) => {
    row = { id: 'connection', oauthState: null, oauthExpiresAt: null, oauthVerifier: null, ...row, ...(row ? args.update : args.create), updatedAt: new Date() } as AffiliateConnection
    return row
  })
  const updateMany = vi.fn(async (args: { where: Record<string, unknown>; data: Partial<AffiliateConnection> }) => {
    if (!row || Object.entries(args.where).some(([name, value]) => row?.[name as keyof AffiliateConnection] !== value && !(value instanceof Date && (row?.[name as keyof AffiliateConnection] as Date)?.getTime() === value.getTime()))) return { count: 0 }
    row = { ...row, ...args.data, updatedAt: new Date() }
    return { count: 1 }
  })
  const audit = vi.fn(async () => ({})), tx = { affiliateConnection: { findUnique, upsert, updateMany }, $queryRaw: vi.fn(async () => []), auditLog: { create: audit } }
  const db = { ...tx, $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx) } as unknown as PrismaClient
  return { db, audit, findUnique, updateMany, row: () => row!, replace: (value: AffiliateConnection) => { row = value } }
}
beforeEach(() => { env.WEBHOOK_ENCRYPTION_KEY = key; remote.request.mockReset() })
afterEach(() => { env.WEBHOOK_ENCRYPTION_KEY = oldKey })

it('encrypts per tenant/provider and never exposes credentials through status or audits', async () => {
  const state = fixture()
  await configureShopee(state.db, tenantId, actorId, input)
  expect(state.row().credentials).not.toContain(input.secret)
  expect(JSON.parse(openWebhookSecret(state.row().credentials, key, `affiliates:${tenantId}:SHOPEE`))).toEqual(input)
  expect(() => openWebhookSecret(state.row().credentials, key, 'affiliates:other:SHOPEE')).toThrow()
  const status = await shopeeStatus(state.db, tenantId)
  expect(status).toMatchObject({ configured: true, connected: false, accountLabel: input.accountLabel })
  expect(JSON.stringify(status)).not.toMatch(/test-only-secret|123456|credentials/)
  expect(JSON.stringify(state.audit.mock.calls)).not.toMatch(/test-only-secret|123456|credentials/)
  expect(await shopeeStatus(state.db, 'other')).toMatchObject({ configured: false })
})
it('does not promote saved credentials to connected until the provider accepts a request', async () => {
  const state = fixture()
  await configureShopee(state.db, tenantId, actorId, input)
  remote.request.mockResolvedValue({ productOfferV2: { nodes: [], pageInfo: { page: 1, limit: 20, hasNextPage: false } } })
  await expect(verifyShopee(state.db, tenantId, actorId)).resolves.toEqual({ connected: true })
  expect((await shopeeStatus(state.db, tenantId)).connected).toBe(true)
  expect(state.findUnique).toHaveBeenLastCalledWith({ where: { tenantId_provider: { tenantId, provider: 'SHOPEE' } } })
})
it('rejects concurrent credential rotation and removes credentials on disconnect', async () => {
  const state = fixture()
  await configureShopee(state.db, tenantId, actorId, input)
  remote.request.mockImplementation(async () => {
    state.replace({ ...state.row(), credentials: 'rotated' })
    return { generateShortLink: { shortLink: 'https://s.shopee.com.br/test' } }
  })
  await expect(generateTenantShopeeAffiliate(state.db, tenantId, actorId, 'https://shopee.com.br/product/123/456')).rejects.toMatchObject({ status: 409 })
  await disconnectShopee(state.db, tenantId, actorId)
  expect(state.row().credentials).toBe('')
  expect(await shopeeStatus(state.db, tenantId)).toMatchObject({ configured: false, connected: false, status: 'DISCONNECTED' })
  await expect(shopeeConnection(state.db, tenantId)).rejects.toMatchObject({ status: 409 })
})
it('rejects encrypted credentials copied from another tenant context', async () => {
  const state = fixture()
  await configureShopee(state.db, tenantId, actorId, input)
  state.replace({ ...state.row(), credentials: sealWebhookSecret(JSON.stringify(input), key, 'affiliates:other:SHOPEE') })
  await expect(shopeeConnection(state.db, tenantId)).rejects.toMatchObject({ status: 503 })
  expect(remote.request).not.toHaveBeenCalled()
})
