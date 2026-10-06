import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { signSurface } from '@/domain/analytics/surface-token'
import { resetImpressionLimitForTest } from '@/http/controllers/@Analytics/routes'
import { migrationNamesOnDisk } from '@/http/migration-names'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaAnalyticsRepository, setAnalyticsRepositoryForTest } from '@/repositories/analytics-repository'
import { PrismaLinksRepository, setLinksRepositoryForTest } from '@/repositories/links-repository'
import { analyticsDay, persistAnalyticsEvent } from '@/use-cases/@Analytics/persist-event'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url) {
  throw new Error('ANALYTICS_DATABASE_URL ausente')
}

const db = new PrismaClient({ datasources: { db: { url } } })
const HOST_A = 'temlinkaqui.com'
const HOST_B = 'outro.example'

async function countEvents(linkId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(*)::int AS n FROM analytics_events WHERE "linkId" = ${linkId}
  `
  return rows[0]?.n ?? 0
}

describe('analytics no PostgreSQL', () => {
  const ids = {
    tenantA: 'tenant-a',
    tenantB: 'tenant-b',
    owner: 'user-owner',
    other: 'user-other',
    admin: 'user-admin',
    ownerB: 'user-owner-b',
    network: 'net-a',
    niche: 'niche-a',
    networkB: 'net-b',
    nicheB: 'niche-b',
    published: 'link-publicado',
    second: 'link-segundo',
    pending: 'link-pendente',
    banned: 'link-banido',
    otherTenant: 'link-outro',
  }

  beforeAll(async () => {
    setTenantsRepositoryForTest({
      async findByHost(host: string) {
        const tenant = await db.tenant.findUnique({ where: { host } })
        return tenant ? { id: tenant.id, host: tenant.host, name: tenant.name } : null
      },
    })
    setLinksRepositoryForTest(new PrismaLinksRepository(db))
    setAnalyticsRepositoryForTest(new PrismaAnalyticsRepository(db))
    await app.ready()
    await db.$executeRawUnsafe('TRUNCATE TABLE analytics_events, links, niches, networks, users, tenants CASCADE')

    await db.tenant.create({ data: { id: ids.tenantA, host: HOST_A, name: 'A' } })
    await db.tenant.create({ data: { id: ids.tenantB, host: HOST_B, name: 'B' } })
    for (const user of [
      { id: ids.owner, tenantId: ids.tenantA, role: 'USER' as const },
      { id: ids.other, tenantId: ids.tenantA, role: 'USER' as const },
      { id: ids.admin, tenantId: ids.tenantA, role: 'ADMIN' as const },
      { id: ids.ownerB, tenantId: ids.tenantB, role: 'USER' as const },
    ]) {
      await db.user.create({
        data: { id: user.id, tenantId: user.tenantId, name: user.id, passwordHash: 'not-a-secret', role: user.role },
      })
    }
    await db.network.create({ data: { id: ids.network, tenantId: ids.tenantA, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.niche.create({ data: { id: ids.niche, tenantId: ids.tenantA, name: 'Jogos', slug: 'jogos' } })
    await db.network.create({ data: { id: ids.networkB, tenantId: ids.tenantB, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.niche.create({ data: { id: ids.nicheB, tenantId: ids.tenantB, name: 'Jogos', slug: 'jogos' } })
    const link = (id: string, tenantId: string, ownerId: string, status: 'PUBLISHED' | 'PENDING_MODERATION' | 'UNAVAILABLE', networkId: string, nicheId: string) =>
      db.link.create({
        data: {
          id,
          tenantId,
          ownerId,
          canonicalUrl: `https://t.me/${id}`,
          name: id,
          description: 'descricao',
          networkId,
          nicheId,
          status,
        },
      })
    await link(ids.published, ids.tenantA, ids.owner, 'PUBLISHED', ids.network, ids.niche)
    await link(ids.second, ids.tenantA, ids.owner, 'PUBLISHED', ids.network, ids.niche)
    await link(ids.pending, ids.tenantA, ids.owner, 'PENDING_MODERATION', ids.network, ids.niche)
    await link(ids.banned, ids.tenantA, ids.owner, 'UNAVAILABLE', ids.network, ids.niche)
    await link(ids.otherTenant, ids.tenantB, ids.ownerB, 'PUBLISHED', ids.networkB, ids.nicheB)
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('aplicou as migrations do repositório, pgvector, analytics e os índices parciais', async () => {
    const migrations = await db.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at
    `
    expect(migrations.map((row) => row.migration_name).sort()).toEqual(migrationNamesOnDisk())
    expect(migrations.map((row) => row.migration_name)).toContain('20261006120000_facet_summary')
    expect(migrations.map((row) => row.migration_name)).toContain('20261005193000_one_open_moderation_case')
    expect(migrations.map((row) => row.migration_name)).toContain('20261002140000_promotion_offers')
    expect(migrations.map((row) => row.migration_name)).toContain('20261002153000_adult_networks')
    expect(migrations.map((row) => row.migration_name)).toContain('20260929235000_analytics_events')
    expect(migrations.map((row) => row.migration_name)).toContain('20260930180000_analytics_link_totals_index')
    const vector = await db.$queryRaw<Array<{ extname: string }>>`SELECT extname FROM pg_extension WHERE extname = 'vector'`
    expect(vector).toHaveLength(1)
    const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE indexname IN ('promotions_one_active_surface', 'order_surfaces_one_pending', 'analytics_events_sessionId_linkId_surface_day_kind_key', 'analytics_events_tenantId_linkId_day_idx')
    `
    expect(indexes).toHaveLength(4)
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('tenants', 'users', 'links', 'moderation_cases', 'promotions', 'orders', 'payments', 'analytics_events')
    `
    expect(tables).toHaveLength(8)
  })

  it('grava impressão, deduplica no banco e ignora tenant, dono e preço do corpo', async () => {
    resetImpressionLimitForTest()
    const token = signSurface(ids.tenantA, ids.published, 'search', 'test-jwt-secret-min-16')
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_A },
      payload: { linkId: ids.published, surfaceToken: token },
    })
    expect(first.statusCode).toBe(201)
    expect(first.json()).toEqual({ counted: true })
    const cookie = String(first.headers['set-cookie'])
    const session = /analyticsSession=([^;]+)/.exec(cookie)?.[1]
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_A, cookie: `analyticsSession=${session}` },
      payload: { linkId: ids.published, surfaceToken: token, tenantId: ids.tenantB, ownerId: ids.other },
    })
    expect(second.statusCode).toBe(400)
    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_A, cookie: `analyticsSession=${session}` },
      payload: { linkId: ids.published, surfaceToken: token },
    })
    expect(replay.statusCode).toBe(200)
    expect(replay.json()).toEqual({ counted: false })
    expect(await countEvents(ids.published)).toBe(1)
    const row = await db.analyticsEvent.findFirst({ where: { linkId: ids.published } })
    expect(row?.tenantId).toBe(ids.tenantA)
    expect(row?.surface).toBe('SEARCH')
    expect(row?.kind).toBe('IMPRESSION')
  })

  it('duas impressões simultâneas deixam uma linha', async () => {
    resetImpressionLimitForTest()
    const token = signSurface(ids.tenantA, ids.second, 'home', 'test-jwt-secret-min-16')
    const headers = { host: HOST_A, cookie: 'analyticsSession=11111111-1111-1111-1111-111111111111' }
    const [left, right] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/analytics/impressions', headers, payload: { linkId: ids.second, surfaceToken: token } }),
      app.inject({ method: 'POST', url: '/api/v1/analytics/impressions', headers, payload: { linkId: ids.second, surfaceToken: token } }),
    ])
    expect([left.statusCode, right.statusCode].sort()).toEqual([200, 201])
    expect(await countEvents(ids.second)).toBe(1)
  })

  it('não grava link inexistente, pendente, banido, outro tenant, superfície forjada nem script', async () => {
    resetImpressionLimitForTest()
    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_A },
      payload: { linkId: 'link-nenhum', surfaceToken: signSurface(ids.tenantA, 'link-nenhum', 'search', 'test-jwt-secret-min-16') },
    })
    expect(missing.statusCode).toBe(404)
    for (const id of [ids.pending, ids.banned, ids.otherTenant]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/impressions',
        headers: { host: HOST_A },
        payload: { linkId: id, surfaceToken: signSurface(ids.tenantA, id, 'search', 'test-jwt-secret-min-16') },
      })
      expect(response.statusCode).toBe(404)
      expect(await countEvents(id)).toBe(0)
    }
    const forged = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_A },
      payload: { linkId: ids.published, surfaceToken: 'search.forjado' },
    })
    expect(forged.statusCode).toBe(400)
    const script = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_A },
      payload: { linkId: '<script>alert(1)</script>', surfaceToken: 'x' },
    })
    expect(script.statusCode).toBe(400)
    const stored = await db.analyticsEvent.findMany({ where: { linkId: { contains: 'script' } } })
    expect(stored).toHaveLength(0)
  })

  it('o 31º pedido de impressão responde 429 e o corpo grande responde 413', async () => {
    resetImpressionLimitForTest()
    const token = signSurface(ids.tenantA, ids.published, 'organic', 'test-jwt-secret-min-16')
    let last = 0
    for (let i = 0; i < 31; i += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/impressions',
        headers: { host: HOST_A, cookie: `analyticsSession=22222222-2222-2222-2222-222222222222` },
        payload: { linkId: ids.published, surfaceToken: token },
      })
      last = response.statusCode
    }
    expect(last).toBe(429)
    const huge = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_A },
      payload: { linkId: ids.published, surfaceToken: 'n'.repeat(2_000_000) },
    })
    expect(huge.statusCode).toBe(413)
  })

  it('clique grava, deduplica, redireciona para a URL gravada e não conta dono, admin nem link fechado', async () => {
    resetImpressionLimitForTest()
    const token = signSurface(ids.tenantA, ids.published, 'niche-home', 'test-jwt-secret-min-16')
    const first = await app.inject({
      method: 'GET',
      url: `/go/${ids.published}?to=https://evil.example&surfaceToken=${encodeURIComponent(token)}`,
      headers: { host: HOST_A },
    })
    expect(first.statusCode).toBe(302)
    expect(first.headers.location).toBe(`https://t.me/${ids.published}`)
    const session = /analyticsSession=([^;]+)/.exec(String(first.headers['set-cookie']))?.[1]
    const second = await app.inject({
      method: 'GET',
      url: `/go/${ids.published}?to=https://127.0.0.1&surfaceToken=${encodeURIComponent(token)}`,
      headers: { host: HOST_A, cookie: `analyticsSession=${session}` },
    })
    expect(second.statusCode).toBe(302)
    expect(second.headers.location).toBe(`https://t.me/${ids.published}`)
    const clicks = await db.analyticsEvent.count({ where: { linkId: ids.published, kind: 'CLICK', surface: 'NICHE' } })
    expect(clicks).toBe(1)

    const ownerToken = app.jwt.sign({ sub: ids.owner, role: 'USER', tenantId: ids.tenantA, typ: 'access' }, { expiresIn: '5m' })
    const owner = await app.inject({
      method: 'GET',
      url: `/go/${ids.second}`,
      headers: { host: HOST_A, authorization: `Bearer ${ownerToken}` },
    })
    expect(owner.statusCode).toBe(302)
    expect(await db.analyticsEvent.count({ where: { linkId: ids.second, kind: 'CLICK' } })).toBe(0)
    const ownerByCookie = await app.inject({
      method: 'GET',
      url: `/go/${ids.second}`,
      headers: { host: HOST_A, cookie: `accessToken=${ownerToken}; analyticsSession=55555555-5555-5555-5555-555555555555` },
    })
    expect(ownerByCookie.statusCode).toBe(302)
    expect(await db.analyticsEvent.count({ where: { linkId: ids.second, kind: 'CLICK' } })).toBe(0)

    const adminToken = app.jwt.sign({ sub: ids.admin, role: 'ADMIN', tenantId: ids.tenantA, typ: 'access' }, { expiresIn: '5m' })
    await app.inject({
      method: 'GET',
      url: `/go/${ids.published}?surfaceToken=${encodeURIComponent(signSurface(ids.tenantA, ids.published, 'home', 'test-jwt-secret-min-16'))}`,
      headers: { host: HOST_A, authorization: `Bearer ${adminToken}`, cookie: 'analyticsSession=33333333-3333-3333-3333-333333333333' },
    })
    expect(await db.analyticsEvent.count({ where: { linkId: ids.published, kind: 'CLICK', surface: 'HOME' } })).toBe(0)

    const closed = await app.inject({ method: 'GET', url: `/go/${ids.banned}`, headers: { host: HOST_A } })
    expect(closed.statusCode).toBe(404)
    expect(closed.headers.location).toBeUndefined()
    const foreign = await app.inject({ method: 'GET', url: `/go/${ids.otherTenant}`, headers: { host: HOST_A } })
    expect(foreign.statusCode).toBe(404)
    const tampered = await app.inject({
      method: 'GET',
      url: `/go/${ids.second}?surfaceToken=home.forjado`,
      headers: { host: HOST_A },
    })
    expect(tampered.statusCode).toBe(302)
    expect(await db.analyticsEvent.count({ where: { linkId: ids.second, kind: 'CLICK', surface: 'HOME' } })).toBe(0)
  })

  it('CTR sai das linhas e não mistura período, link nem tenant', async () => {
    resetImpressionLimitForTest()
    const yesterday = new Date('2026-09-28T12:00:00.000Z')
    await persistAnalyticsEvent({
      viewer: 'VISITOR',
      origin: 'organic',
      tenantId: ids.tenantA,
      linkId: ids.published,
      sessionId: '44444444-4444-4444-4444-444444444444',
      kind: 'CLICK',
      now: yesterday,
      requestId: 'req-ontem',
      repository: new PrismaAnalyticsRepository(db),
    })
    const ownerToken = app.jwt.sign({ sub: ids.owner, role: 'USER', tenantId: ids.tenantA, typ: 'access' }, { expiresIn: '5m' })
    const today = analyticsDay(new Date())
    const past = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/links/${ids.published}?from=2026-09-28&to=2026-09-28`,
      headers: { host: HOST_A, authorization: `Bearer ${ownerToken}` },
    })
    expect(past.statusCode).toBe(200)
    expect(past.json()).toMatchObject({ linkId: ids.published, tenantId: ids.tenantA, from: '2026-09-28', to: '2026-09-28', clicks: 1 })
    expect(JSON.stringify(past.json())).not.toMatch(/password|token|secret|script/i)
    const pastByCookie = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/links/${ids.published}?from=2026-09-28&to=2026-09-28`,
      headers: { host: HOST_A, cookie: `accessToken=${ownerToken}` },
    })
    expect(pastByCookie.statusCode).toBe(200)
    expect(pastByCookie.json()).toMatchObject({ clicks: 1 })

    const otherToken = app.jwt.sign({ sub: ids.other, role: 'USER', tenantId: ids.tenantA, typ: 'access' }, { expiresIn: '5m' })
    const idor = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/links/${ids.published}`,
      headers: { host: HOST_A, authorization: `Bearer ${otherToken}` },
    })
    expect(idor.statusCode).toBe(404)

    const cross = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/links/${ids.otherTenant}`,
      headers: { host: HOST_A, authorization: `Bearer ${ownerToken}` },
    })
    expect(cross.statusCode).toBe(404)

    const foreignJwt = app.jwt.sign({ sub: ids.ownerB, role: 'USER', tenantId: ids.tenantB, typ: 'access' }, { expiresIn: '5m' })
    const wrongHost = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/links/${ids.published}`,
      headers: { host: HOST_A, authorization: `Bearer ${foreignJwt}` },
    })
    expect(wrongHost.statusCode).toBe(403)

    const onB = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST_B },
      payload: { linkId: ids.otherTenant, surfaceToken: signSurface(ids.tenantB, ids.otherTenant, 'search', 'test-jwt-secret-min-16') },
    })
    expect(onB.statusCode).toBe(201)
    const statsB = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/links/${ids.otherTenant}?from=${today}&to=${today}`,
      headers: { host: HOST_B, authorization: `Bearer ${foreignJwt}` },
    })
    expect(statsB.json()).toMatchObject({ tenantId: ids.tenantB, impressions: 1, clicks: 0, ctr: 0 })
    const leaked = await db.analyticsEvent.count({ where: { linkId: ids.otherTenant, tenantId: ids.tenantA } })
    expect(leaked).toBe(0)
  })
})
