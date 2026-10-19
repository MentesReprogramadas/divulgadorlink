import { relatedShuffleKey } from '@/domain/catalog/related-links'
import { randomUUID } from 'node:crypto'
import { PrismaClient, type LinkStatus } from '@prisma/client'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { app } from '@/app'
import { setRelatedLinksDbForTest } from '@/http/controllers/@Catalog/related-links'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaLinksRepository, setLinksRepositoryForTest } from '@/repositories/links-repository'
import { PrismaAnalyticsRepository, setAnalyticsRepositoryForTest } from '@/repositories/analytics-repository'
import { signSurface, readSurface } from '@/domain/analytics/surface-token'
import { promotionPerformance } from '@/use-cases/@Analytics/promotion-performance'
import { PrismaPromotionPerformanceRepository } from '@/repositories/promotion-performance-repository'
import { analyticsDay } from '@/domain/analytics/day'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('F03 requires disposable local PostgreSQL')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, foreign: string, host: string, source: string
const secret = 'test-jwt-secret-min-16'
beforeAll(async () => {
  setRelatedLinksDbForTest(db, '0'.repeat(32))
  setLinksRepositoryForTest(new PrismaLinksRepository(db)); setAnalyticsRepositoryForTest(new PrismaAnalyticsRepository(db))
  setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } })
  await app.ready()
})
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); host = tenant + '.test'; source = 'source-' + tenant
  for (const id of [tenant, foreign]) {
    await db.tenant.create({ data: { id, host: id + '.test', name: 'F03' } })
    await db.user.create({ data: { id: 'u-' + id, tenantId: id, name: 'Owner', passwordHash: 'fixture' } })
    for (const suffix of ['', '-other']) {
      await db.niche.create({ data: { id: 'n' + suffix + id, tenantId: id, name: 'Tema' + suffix, slug: 'tema' + suffix } })
      await db.network.create({ data: { id: 'r' + suffix + id, tenantId: id, name: 'Rede' + suffix, slug: 'rede' + suffix, knownHosts: [] } })
    }
    await db.niche.create({ data: { id: 'adult' + id, tenantId: id, name: 'Adulto', slug: 'adulto', requiresAge: true } })
  }
  await seed(source)
})
afterAll(async () => { setRelatedLinksDbForTest(null); await db.$disconnect() })
async function seed(id: string, overrides: { tenantId?: string; nicheId?: string; networkId?: string; ownerId?: string; canonicalUrl?: string; status?: LinkStatus } = {}) {
  const t = overrides.tenantId ?? tenant
  return db.link.create({ data: { id, tenantId: t, ownerId: 'u-' + t, nicheId: 'n' + t, networkId: 'r' + t, canonicalUrl: 'https://example.com/' + id, name: id, description: 'Public description', status: 'PUBLISHED', ...overrides } })
}
function get(id = source, cursor?: string, age?: string, requestHost = host) {
  return app.inject({ method: 'GET', url: '/api/v1/links/' + id + '/related' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), headers: { host: requestHost, ...(age ? { cookie: 'age=' + age } : {}) } })
}
it('F03-I01/PG01/T01 eligibility, stable keysets and canonical URL deduplication before pagination', async () => {
  const ids = Array.from({ length: 9 }, (_, i) => 'a' + i + tenant)
  for (const id of ids) await seed(id)
  await seed('duplicate' + tenant, { canonicalUrl: 'https://example.com/' + ids[0] })
  await seed('same-source' + tenant, { canonicalUrl: 'https://example.com/' + source })
  for (const status of ['PENDING_MODERATION', 'UNAVAILABLE', 'PRE_REJECTED'] as const) await seed(status + tenant, { status })
  await seed('foreign' + tenant, { tenantId: foreign })
  await seed('corrupt-niche' + tenant, { nicheId: 'n' + foreign })
  await seed('corrupt-network' + tenant, { networkId: 'r' + foreign })
  await seed('corrupt-owner' + tenant, { ownerId: 'u-' + foreign })
  await seed('unrelated' + tenant, { nicheId: 'n-other' + tenant, networkId: 'r-other' + tenant })
  ids.sort((a,b) => relatedShuffleKey(a, '0'.repeat(32)).localeCompare(relatedShuffleKey(b, '0'.repeat(32))))
  const first = await get(); expect(first.statusCode).toBe(200); expect(first.headers['cache-control']).toBe('private, no-store')
  const a = first.json(); expect(a.items.map((r: { id: string }) => r.id)).toEqual(ids.slice(0, 6)); expect(a.nextCursor).toBeTruthy()
  expect((await get()).json()).toEqual(a)
  await db.link.update({ where: { id: ids[5] }, data: { status: 'UNAVAILABLE' } })
  const b = (await get(source, a.nextCursor)).json(); expect(b.items.map((r: { id: string }) => r.id)).toEqual(ids.slice(6)); expect(b.nextCursor).toBeNull()
  expect(Object.keys(a.items[0]).sort()).toEqual(['description', 'discovery', 'id', 'impressions', 'name', 'network', 'niche', 'sponsored', 'surfaceToken'].sort())
  expect(await db.analyticsEvent.count({ where: { tenantId: tenant } })).toBe(0)
  expect(await db.promotion.count({ where: { tenantId: tenant } })).toBe(0)
})
it('F03-PG02/T01 priority, current owner status, source visibility and tenant boundary', async () => {
  await db.user.create({ data: { id: 'banned-' + tenant, tenantId: tenant, name: 'Banned', passwordHash: 'fixture', status: 'BANNED' } })
  await seed('banned-candidate-' + tenant, { ownerId: 'banned-' + tenant })
  await seed('z-both' + tenant)
  await seed('a-niche' + tenant, { networkId: 'r-other' + tenant })
  await seed('a-network' + tenant, { nicheId: 'n-other' + tenant })
  expect((await get()).json().items.map((r: { id: string }) => r.id)).toEqual(['z-both', 'a-niche', 'a-network'].map(x => x + tenant))
  expect((await get(source, undefined, undefined, foreign + '.test')).statusCode).toBe(404)
  await db.user.update({ where: { id: 'u-' + tenant }, data: { status: 'BANNED' } })
  expect((await get()).statusCode).toBe(404)
  await db.user.update({ where: { id: 'u-' + tenant }, data: { status: 'ACTIVE' } })
  await db.link.update({ where: { id: source }, data: { status: 'UNAVAILABLE' } })
  expect((await get()).statusCode).toBe(404)
})
it('F03-PG03/T01 cursor rejects tampering, source, tenant and age swaps; adult content stays gated', async () => {
  for (let i = 0; i < 8; i++) await seed('candidate' + i + tenant)
  const adult = 'adult-' + tenant; await seed(adult, { nicheId: 'adult' + tenant })
  const cursor = (await get()).json().nextCursor
  expect((await get(source, cursor + 'x')).statusCode).toBe(400)
  expect((await get(source, 'x'.repeat(2049))).statusCode).toBe(400)
  expect((await get(source, cursor, 'yes')).statusCode).toBe(400)
  expect((await get('candidate0' + tenant, cursor)).statusCode).toBe(400)
  expect((await get(adult)).json().items).toEqual([])
  expect((await get(adult, undefined, 'no')).json().items).toEqual([])
  expect((await get(adult, undefined, 'yes')).json().items.length).toBe(6)
  expect((await get(source, cursor)).json().items.map((r: { id: string }) => r.id)).not.toContain(adult)
  const accepted = (await get(source, undefined, 'yes')).json()
  expect((await get(source, accepted.nextCursor, 'yes')).json().items.map((r: { id: string }) => r.id)).toContain(adult)
})
it('F03-PG04/T02 paid placement elsewhere does not sponsor RELATED; hidden counters stay absent', async () => {
  const id = 'paid-' + tenant; await seed(id)
  await db.promotion.create({ data: { tenantId: tenant, linkId: id, surface: 'SEARCH', status: 'ACTIVE', activatedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) } })
  await db.config.create({ data: { tenantId: tenant, key: 'SHOW_IMPRESSIONS', value: '0' } })
  const body = (await get()).json(); expect(body.showImpressions).toBe(false)
  expect(body.items).toHaveLength(1); expect(body.items[0].sponsored).toBe(false); expect(body.items[0]).not.toHaveProperty('impressions')
})
it('F03-PG06/T01 adult network also gates both source and suggestions independently of niche', async () => {
  await db.network.update({ where: { id: 'r-other' + tenant }, data: { requiresAge: true } })
  const id = 'adult-network-' + tenant
  await seed(id, { networkId: 'r-other' + tenant })
  expect((await get()).json().items).toEqual([])
  expect((await get(source, undefined, 'yes')).json().items.map((r: { id: string }) => r.id)).toEqual([id])
  expect((await get(id)).json().items).toEqual([])
  expect((await get(id, undefined, 'yes')).json().items.map((r: { id: string }) => r.id)).toEqual([source])
})
it('F03-PG07 fresh openings use different seeds and the signed cursor retains one shuffle', async () => {
  for (let i = 0; i < 12; i++) await seed('shuffle-' + i + tenant)
  setRelatedLinksDbForTest(db)
  try {
    const a = (await get()).json(), b = (await get()).json()
    const seedOf = (cursor: string) => JSON.parse(Buffer.from(cursor.split('.')[0]!, 'base64url').toString()).seed
    expect(seedOf(a.nextCursor)).not.toBe(seedOf(b.nextCursor))
    const next = (await get(source, a.nextCursor)).json()
    expect((await get(source, a.nextCursor)).json()).toEqual(next)
    expect(new Set([...a.items, ...next.items].map((row: { id: string }) => row.id)).size).toBe(12)
  } finally { setRelatedLinksDbForTest(db, '0'.repeat(32)) }
})
it('F03-I01/PG05/T04 related impression and exit are separate, deduplicated, signed and revalidated', async () => {
  const id = 'visit-' + tenant; await seed(id)
  const token = (await get()).json().items[0].surfaceToken
  expect(readSurface(tenant, id, token, secret)).toBe('related')
  for (const role of ['USER', 'ADMIN'] as const) {
    const authorization = 'Bearer ' + app.jwt.sign({ sub: 'u-' + tenant, tenantId: tenant, role, typ: 'access' })
    const response = await app.inject({ method: 'POST', url: '/api/v1/analytics/impressions', headers: { host, authorization }, payload: { linkId: id, surfaceToken: token } })
    expect(response.json().counted).toBe(false)
  }
  expect(await db.analyticsEvent.count({ where: { tenantId: tenant } })).toBe(0)
  const cookie = 'analyticsSession=' + randomUUID()
  const impression = (surfaceToken = token, linkId = id) => app.inject({ method: 'POST', url: '/api/v1/analytics/impressions', headers: { host, cookie }, payload: { linkId, surfaceToken } })
  expect((await impression()).statusCode).toBe(201); expect((await impression()).json().counted).toBe(false)
  expect((await impression(token, source)).statusCode).toBe(400)
  expect((await impression(token + 'x')).statusCode).toBe(400)
  expect((await impression(signSurface(foreign, id, 'related', secret))).statusCode).toBe(400)
  const go = await app.inject({ method: 'GET', url: '/go/' + id + '?surfaceToken=' + token, headers: { host, cookie } })
  expect(go.statusCode).toBe(302); expect(go.headers.location).toBe('https://example.com/' + id)
  expect(await db.analyticsEvent.findMany({ where: { tenantId: tenant }, select: { surface: true, kind: true }, orderBy: { kind: 'asc' } })).toEqual([{ surface: 'RELATED', kind: 'CLICK' }, { surface: 'RELATED', kind: 'IMPRESSION' }])
  expect((await impression(signSurface(tenant, id, 'organic', secret))).statusCode).toBe(201)
  expect(await db.analyticsEvent.count({ where: { tenantId: tenant, surface: 'ORGANIC' } })).toBe(1)
  await db.promotion.create({ data: { tenantId: tenant, linkId: id, surface: 'SEARCH', status: 'ACTIVE', activatedAt: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() + 86400000) } })
  const day = analyticsDay(new Date())
  const report = await promotionPerformance({ tenantId: tenant, linkId: id, actorId: 'u-' + tenant, from: day, to: day }, new PrismaPromotionPerformanceRepository(db))
  expect(report?.surfaces.find(row => row.surface === 'RELATED')).toMatchObject({ impressions: 1, clicks: 1 })
  expect(report?.surfaces.find(row => row.surface === 'ORGANIC')).toMatchObject({ impressions: 1, clicks: 0 })
  expect(report?.totals.paidClicks).toBe(0)
  await db.link.update({ where: { id }, data: { status: 'UNAVAILABLE' } })
  expect((await impression()).statusCode).toBe(404)
})

it('F03-PG08 shows only declared discovery metadata on the detail and recommended cards',async()=>{
 const id='declared-'+tenant;await seed(id)
 await db.link.updateMany({where:{id:{in:[source,id]}},data:{cityId:'3550308',languageTag:'pt',modality:'ONLINE'}})
 const expected={city:{id:'3550308',name:'São Paulo',state:'SP'},languageTag:'pt',modality:'ONLINE'}
 const detail=await app.inject({method:'GET',url:'/api/v1/links/'+source,headers:{host}})
 expect(detail.statusCode).toBe(200);expect(detail.json().discovery).toEqual(expected)
 expect((await get()).json().items[0].discovery).toEqual(expected)
 await db.link.update({where:{id:source},data:{status:'UNAVAILABLE'}})
 const hidden=await app.inject({method:'GET',url:'/api/v1/links/'+source,headers:{host}})
 expect(hidden.json().available).toBe(false);expect(hidden.json()).not.toHaveProperty('discovery')
 expect(hidden.body).not.toContain('São Paulo')
})
