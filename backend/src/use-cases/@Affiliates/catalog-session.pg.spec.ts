import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { openWebhookSecret } from '@/lib/webhook-secret'
import { affiliateCatalogStatus, configureAffiliateCatalog, configureAffiliateSession, disconnectAffiliateCatalog, disconnectAffiliateSession, generateCatalogAffiliate, searchAffiliateCatalog, SESSION_PROVIDER } from './catalog'

const url = process.env.AFFILIATE_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local disposable PostgreSQL required')
const db = new PrismaClient({ datasourceUrl: url }), tenantId = `session-${randomUUID()}`, actorId = `admin-${tenantId}`
const key = Buffer.alloc(32, 17).toString('base64'), previous = { ...env }
const session = { cookie: 'ssid=test-session-secret', csrf: 'test-csrf-secret', tag: 'tag', profile: 'profile', accountLabel: 'Minha conta' }
const product = 'https://www.mercadolivre.com.br/p/MLB123?wid=MLB456&pdp_filters=item_id:MLB456'
const envelope = { status: 200, total_items: 1, total_success: 1, total_error: 0, urls: [{ origin_url: 'https://produto.mercadolivre.com.br/MLB-456-_JM', tag: 'tag', type_url: 'SOCIAL_PROFILE_ENCRYPTED', short_url: 'https://meli.la/test', long_url: 'https://www.mercadolivre.com.br/social/profile?matt_word=tag&matt_tool=1&ref=x' }] }
const where = { tenantId_provider: { tenantId, provider: SESSION_PROVIDER } }

beforeAll(async () => {
  env.WEBHOOK_ENCRYPTION_KEY = key
  env.AFFILIATE_CATALOG_GATEWAY_URL = 'http://127.0.0.1:4452'
  env.AFFILIATE_CATALOG_GATEWAY_KEY = 'unused-test-key'
  await db.tenant.create({ data: { id: tenantId, host: `${tenantId}.test`, name: 'Disposable session fixture' } })
  await db.user.create({ data: { id: actorId, tenantId, name: 'Admin', role: 'ADMIN', passwordHash: 'fixture-only' } })
})
afterEach(() => vi.unstubAllGlobals())
afterAll(async () => {
  Object.assign(env, previous)
  await db.auditLog.deleteMany({ where: { tenantId } })
  await db.affiliateConnection.deleteMany({ where: { tenantId } })
  await db.user.deleteMany({ where: { tenantId } })
  await db.tenant.deleteMany({ where: { id: tenantId } })
  await db.$disconnect()
})

it('uses own native configuration over central and preserves disconnected override', async () => {
  await configureAffiliateCatalog(db, tenantId, actorId, { clientId: '123456', clientSecret: 'test-secret' })
  expect(await affiliateCatalogStatus(db, tenantId)).toMatchObject({ mode: 'NATIVE', configured: true, connected: false })
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await expect(searchAffiliateCatalog(db, tenantId, 'Natal')).rejects.toMatchObject({ status: 409 })
  await disconnectAffiliateCatalog(db, tenantId, actorId)
  expect(await affiliateCatalogStatus(db, tenantId)).toMatchObject({ mode: 'NATIVE', status: 'CONFIGURED' })
  expect(fetcher).not.toHaveBeenCalled()
})

it('encrypts own secrets, redacts status/audit, validates exact seller and records verification only after success', async () => {
  expect(await configureAffiliateSession(db, tenantId, actorId, session)).toEqual({ saved: true, verified: false })
  const row = await db.affiliateConnection.findUniqueOrThrow({ where })
  expect(row.credentials).not.toContain(session.cookie)
  expect(JSON.parse(openWebhookSecret(row.credentials, key, `affiliates:${tenantId}:${SESSION_PROVIDER}`))).toEqual(session)
  expect(() => openWebhookSecret(row.credentials, key, `affiliates:other:${SESSION_PROVIDER}`)).toThrow()
  const status = await affiliateCatalogStatus(db, tenantId)
  expect(status.session).toMatchObject({ mode: 'OWN', configured: true, verified: false, accountLabel: session.accountLabel })
  expect(JSON.stringify(status)).not.toMatch(/test-session-secret|test-csrf-secret|cookie|csrf/)
  const fetcher = vi.fn(async () => Response.json(envelope))
  vi.stubGlobal('fetch', fetcher)
  expect(await generateCatalogAffiliate(db, tenantId, actorId, product)).toMatchObject({ url: 'https://meli.la/test' })
  expect(fetcher).toHaveBeenCalledWith('https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink', expect.objectContaining({ redirect: 'error', headers: expect.objectContaining({ Cookie: session.cookie, 'x-csrf-token': session.csrf }), body: JSON.stringify({ urls: [envelope.urls[0].origin_url], tag: session.tag }) }))
  expect((await affiliateCatalogStatus(db, tenantId)).session.verified).toBe(true)
  const audit = await db.auditLog.findMany({ where: { tenantId } })
  expect(JSON.stringify(audit)).not.toMatch(/test-session-secret|test-csrf-secret|cookie|csrf/)
})

it('discards generation if the session changes, and never falls back after disconnect', async () => {
  for (const change of [() => configureAffiliateSession(db, tenantId, actorId, { ...session, accountLabel: 'Outra conta' }), () => disconnectAffiliateSession(db, tenantId, actorId)]) {
    await configureAffiliateSession(db, tenantId, actorId, session)
    const before = await db.auditLog.count({ where: { tenantId, action: 'affiliate.link.generate' } })
    vi.stubGlobal('fetch', vi.fn(async () => { await change(); return Response.json(envelope) }))
    await expect(generateCatalogAffiliate(db, tenantId, actorId, product)).rejects.toMatchObject({ status: 409 })
    expect(await db.auditLog.count({ where: { tenantId, action: 'affiliate.link.generate' } })).toBe(before)
  }
  expect((await db.affiliateConnection.findUniqueOrThrow({ where })).credentials).toBe('')
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await expect(generateCatalogAffiliate(db, tenantId, actorId, product)).rejects.toMatchObject({ status: 409 })
  expect(fetcher).not.toHaveBeenCalled()
  expect((await affiliateCatalogStatus(db, tenantId)).session).toMatchObject({ mode: 'DISCONNECTED', configured: false, verified: false })
})

it('persists reconnect only for the same session after provider rejection', async () => {
  await configureAffiliateSession(db, tenantId, actorId, session)
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })))
  await expect(generateCatalogAffiliate(db, tenantId, actorId, product)).rejects.toMatchObject({ status: 409 })
  expect((await affiliateCatalogStatus(db, tenantId)).session).toMatchObject({ status: 'RECONNECT', verified: false })
  await configureAffiliateSession(db, tenantId, actorId, session)
  vi.stubGlobal('fetch', vi.fn(async () => { await configureAffiliateSession(db, tenantId, actorId, session); return new Response('', { status: 401 }) }))
  await expect(generateCatalogAffiliate(db, tenantId, actorId, product)).rejects.toMatchObject({ status: 409 })
  expect((await affiliateCatalogStatus(db, tenantId)).session.status).toBe('CONFIGURED')
})
