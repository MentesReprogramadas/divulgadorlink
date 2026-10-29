import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { openWebhookSecret, sealWebhookSecret } from '@/lib/webhook-secret'
import { affiliateCatalogAccessToken, configureAffiliateCatalog, connectAffiliateCatalog, finishAffiliateCatalogAuthorization } from './catalog'

const url = process.env.AFFILIATE_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('AFFILIATE_DATABASE_URL deve apontar para PostgreSQL local descartável')
const db = new PrismaClient({ datasourceUrl: url }), tenantId = `affiliate-catalog-${randomUUID()}`, actorId = `admin-${tenantId}`
const originalKey = env.WEBHOOK_ENCRYPTION_KEY, encryptionKey = Buffer.alloc(32, 19).toString('base64'), cipherContext = `affiliates:${tenantId}:MERCADO_LIVRE`

beforeAll(async () => {
  env.WEBHOOK_ENCRYPTION_KEY = encryptionKey
  await db.tenant.create({ data: { id: tenantId, host: `${tenantId}.test`, name: 'Disposable catalog fixture' } })
  await db.user.create({ data: { id: actorId, tenantId, name: 'Catalog admin', role: 'ADMIN', passwordHash: 'fixture-only' } })
})
afterEach(() => vi.unstubAllGlobals())
afterAll(async () => {
  env.WEBHOOK_ENCRYPTION_KEY = originalKey
  await db.auditLog.deleteMany({ where: { tenantId } })
  await db.affiliateConnection.deleteMany({ where: { tenantId } })
  await db.user.deleteMany({ where: { tenantId } })
  await db.tenant.deleteMany({ where: { id: tenantId } })
  await db.$disconnect()
})

it('serializes rotating refresh tokens across concurrent database transactions', async () => {
  await configureAffiliateCatalog(db, tenantId, actorId, { clientId: '123456', clientSecret: 'fixture-secret' })
  const credentials = sealWebhookSecret(JSON.stringify({ clientId: '123456', clientSecret: 'fixture-secret', accessToken: 'expired', refreshToken: 'refresh-once', expiresAt: Date.now() - 1 }), encryptionKey, cipherContext)
  await db.affiliateConnection.update({ where: { tenantId_provider: { tenantId, provider: 'MERCADO_LIVRE' } }, data: { credentials, status: 'CONNECTED' } })
  const fetcher = vi.fn(async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return Response.json({ access_token: 'token-new', refresh_token: 'refresh-rotated', expires_in: 21600 })
  })
  vi.stubGlobal('fetch', fetcher)
  const tokens = await Promise.all([affiliateCatalogAccessToken(db, tenantId), affiliateCatalogAccessToken(db, tenantId), affiliateCatalogAccessToken(db, tenantId)])
  expect(tokens).toEqual(['token-new', 'token-new', 'token-new'])
  expect(fetcher).toHaveBeenCalledOnce()
  const row = await db.affiliateConnection.findUniqueOrThrow({ where: { tenantId_provider: { tenantId, provider: 'MERCADO_LIVRE' } } })
  expect(JSON.parse(openWebhookSecret(row.credentials, encryptionKey, cipherContext)).refreshToken).toBe('refresh-rotated')
})

it('accepts only one concurrent callback for an OAuth state', async () => {
  await configureAffiliateCatalog(db, tenantId, actorId, { clientId: '123456', clientSecret: 'fixture-secret' })
  const authorization = await connectAffiliateCatalog(db, tenantId, actorId)
  const input = { state: new URL(authorization.url).searchParams.get('state')!, code: 'provider-once' }
  const fetcher = vi.fn(async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return Response.json({ access_token: 'oauth-access', refresh_token: 'oauth-refresh', expires_in: 21600 })
  })
  vi.stubGlobal('fetch', fetcher)
  const attempts = await Promise.allSettled([finishAffiliateCatalogAuthorization(db, tenantId, actorId, input), finishAffiliateCatalogAuthorization(db, tenantId, actorId, input)])
  expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(fetcher).toHaveBeenCalledOnce()
  const row = await db.affiliateConnection.findUniqueOrThrow({ where: { tenantId_provider: { tenantId, provider: 'MERCADO_LIVRE' } } })
  expect(row).toMatchObject({ status: 'CONNECTED', oauthState: null, oauthVerifier: null, oauthExpiresAt: null })
  expect(await db.auditLog.count({ where: { tenantId, action: 'affiliate.catalog.connect' } })).toBe(1)
})
