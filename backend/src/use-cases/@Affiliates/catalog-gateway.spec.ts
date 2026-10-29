import type { PrismaClient } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { sealWebhookSecret } from '@/lib/webhook-secret'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { affiliateCatalogStatus, configureAffiliateCatalog, disconnectAffiliateCatalog, generateCatalogAffiliate, searchAffiliateCatalog } from './catalog'

const gateway = vi.hoisted(() => ({ status: vi.fn(), request: vi.fn() }))
vi.mock('@/adapters/affiliates/catalog-gateway', async importOriginal => ({ ...await importOriginal<typeof import('@/adapters/affiliates/catalog-gateway')>(), affiliateCatalogGatewayStatus: gateway.status, affiliateCatalogGatewayRequest: gateway.request, affiliateCatalogGatewayRequests: (settings: unknown) => (paths: string[]) => Promise.allSettled(paths.map(path => gateway.request(settings, path))) }))
const previous = { ...env }

function fixture(host = 'operator.test') {
  const tenant = vi.fn().mockResolvedValue({ id: 'tenant', host }), native = vi.fn().mockResolvedValue(null), audit = vi.fn()
  return { tenant, native, audit, db: { tenant: { findUnique: tenant }, affiliateConnection: { findUnique: native }, auditLog: { create: audit } } as unknown as PrismaClient }
}

beforeEach(() => {
  env.TENANT_HOST = 'operator.test'
  env.AFFILIATE_CATALOG_GATEWAY_URL = 'http://127.0.0.1:4452'
  env.AFFILIATE_CATALOG_GATEWAY_KEY = 'local-only-key'
  gateway.status.mockReset().mockResolvedValue({ configured: true, connected: true, clientId: '123456', status: 'CONNECTED' })
  gateway.request.mockReset()
})
afterEach(() => Object.assign(env, previous))

describe('Central catalog tenant boundary', () => {
  it('uses safe central status without reading/copying native OAuth credentials', async () => {
    const state = fixture()
    const status = await affiliateCatalogStatus(state.db, 'tenant')
    expect(status).toMatchObject({ mode: 'CENTRAL', configured: true, connected: true, clientId: '123456' })
    expect(JSON.stringify(status)).not.toContain('local-only-key')
    expect(state.native).toHaveBeenCalled()
    expect(gateway.status).toHaveBeenCalledWith({ url: 'http://127.0.0.1:4452', key: 'local-only-key' })
  })

  it('never exposes or requests the central account for a different tenant', async () => {
    const state = fixture('other.test')
    expect(await affiliateCatalogStatus(state.db, 'tenant')).toMatchObject({ configured: false, connected: false, affiliateConfigured: false, affiliateTag: '', affiliateProfile: '' })
    expect(gateway.status).not.toHaveBeenCalled()
    await expect(searchAffiliateCatalog(state.db, 'tenant', 'Natal')).rejects.toMatchObject({ status: 403 })
    await expect(generateCatalogAffiliate(state.db, 'tenant', 'admin', 'https://meli.la/item')).rejects.toMatchObject({ status: 403 })
    expect(gateway.request).not.toHaveBeenCalled()
  })

  it('searches central sellers with the same product/price rules and no native token refresh', async () => {
    const state = fixture()
    gateway.request.mockImplementation(async (_settings, path: string) => path.startsWith('/products/search') ? { results: [{ id: 'MLB123', name: 'Natal presente' }] } : { results: [{ item_id: 'MLB456', price: 39.9, currency_id: 'BRL', condition: 'new' }], paging: { total: 1 } })
    const result = await searchAffiliateCatalog(state.db, 'tenant', 'Natal')
    expect(result.products).toMatchObject([{ id: 'MLB456', priceCents: 3990 }])
    expect(state.native).toHaveBeenCalled()
  })

  it('keeps central authorization and size errors actionable during seller comparison', async () => {
    const state = fixture()
    for (const status of [409, 413]) {
      gateway.request.mockResolvedValueOnce({ results: [{ id: 'MLB123', name: 'Natal presente' }] }).mockRejectedValueOnce(new AffiliateCatalogError(status, 'Confira a operação central.'))
      await expect(searchAffiliateCatalog(state.db, 'tenant', 'Natal')).rejects.toMatchObject({ status })
    }
    expect(state.native).toHaveBeenCalled()
  })

  it('keeps independent session controls available when the central catalog is unavailable', async () => {
    const state = fixture()
    gateway.status.mockRejectedValueOnce(new AffiliateCatalogError(502, 'Central indisponível.'))
    expect(await affiliateCatalogStatus(state.db, 'tenant')).toMatchObject({ mode: 'CENTRAL', connected: false, status: 'UNAVAILABLE', catalogError: 'Central indisponível.', session: { mode: 'CENTRAL' } })
  })

  it('preserves a verified own session when the independent central catalog fails', async () => {
    const state = fixture()
    env.WEBHOOK_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    const session = { cookie: 'ssid=private-own-cookie', csrf: 'private-own-csrf', tag: 'mytag', profile: 'myprofile', accountLabel: 'Minha conta' }
    const encrypted = sealWebhookSecret(JSON.stringify(session), env.WEBHOOK_ENCRYPTION_KEY, 'affiliates:tenant:MERCADO_LIVRE_SESSION')
    state.native.mockImplementation(async (input: { where: { tenantId_provider: { provider: string } } }) => input.where.tenantId_provider.provider === 'MERCADO_LIVRE_SESSION' ? { tenantId: 'tenant', provider: 'MERCADO_LIVRE_SESSION', credentials: encrypted, status: 'CONNECTED', updatedAt: new Date('2026-10-28T00:00:00Z') } : null)
    gateway.status.mockRejectedValueOnce(new AffiliateCatalogError(502, 'Central indisponível.'))
    const status = await affiliateCatalogStatus(state.db, 'tenant')
    expect(status).toMatchObject({ mode: 'CENTRAL', connected: false, status: 'UNAVAILABLE', catalogError: 'Central indisponível.', affiliateConfigured: true, affiliateTag: session.tag, affiliateProfile: session.profile, session: { mode: 'OWN', configured: true, verified: true, status: 'CONNECTED', accountLabel: session.accountLabel, tag: session.tag, profile: session.profile } })
    expect(JSON.stringify(status)).not.toMatch(/private-own-cookie|private-own-csrf|cookie|csrf|credentials/)
  })

  it('allows own OAuth configuration without changing the central account', async () => {
    const state = fixture()
    const upsert = vi.fn(), audit = vi.fn()
    const tx = { affiliateConnection: { upsert }, auditLog: { create: audit }, $queryRaw: vi.fn() }
    Object.assign(state.db, { $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx) })
    const key = env.WEBHOOK_ENCRYPTION_KEY
    env.WEBHOOK_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    try { await configureAffiliateCatalog(state.db, 'tenant', 'admin', { clientId: '123456', clientSecret: 'secret123' }) } finally { env.WEBHOOK_ENCRYPTION_KEY = key }
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ tenantId: 'tenant', provider: 'MERCADO_LIVRE', status: 'CONFIGURED' }) }))
    expect(gateway.request).not.toHaveBeenCalled()
  })

  it('audits local central disconnection and locks before creating the no-fallback marker', async () => {
    const state = fixture(), create = vi.fn(), audit = vi.fn(), lock = vi.fn()
    const tx = { affiliateConnection: { findUnique: state.native, create }, auditLog: { create: audit }, $queryRaw: lock }
    Object.assign(state.db, { $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx) })
    const key = env.WEBHOOK_ENCRYPTION_KEY
    env.WEBHOOK_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    try { await disconnectAffiliateCatalog(state.db, 'tenant', 'admin') } finally { env.WEBHOOK_ENCRYPTION_KEY = key }
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]!)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant', status: 'CONFIGURED' }) }))
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant', actorId: 'admin', action: 'affiliate.catalog.disconnect', after: { provider: 'MERCADO_LIVRE' } }) }))
    expect(gateway.request).not.toHaveBeenCalled()
  })
})
