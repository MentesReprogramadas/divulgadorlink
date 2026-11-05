import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaLinksRepository, setLinksRepositoryForTest } from '@/repositories/links-repository'
import { PrismaAnalyticsRepository, setAnalyticsRepositoryForTest } from '@/repositories/analytics-repository'
import { setLinkMediaDbForTest, readApprovedLinkMedia } from '@/repositories/link-media'
import { setRelatedLinksDbForTest } from '@/http/controllers/@Catalog/related-links'
import { queryCatalogPage } from '@/http/catalog-query'
import { sqlCandidateSource } from '@/http/controllers/@Search/routes'
import { favoritesOperation } from '@/repositories/favorites-repository'
import { publicCollection } from '@/repositories/public-collections'
import { publicProfile } from '@/repositories/profiles-repository'
import { PrismaCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'
import { signSurface } from '@/domain/analytics/surface-token'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local PostgreSQL required')
const db = new PrismaClient({ datasources: { db: { url } } })
const repo = new PrismaLinksRepository(db)
let tenant: string, foreign: string, owner: string, other: string, link: string, source: string, host: string
const secret = 'test-jwt-secret-min-16'
beforeAll(async () => {
  setTenantsRepositoryForTest({ async findByHost(host) { return db.tenant.findUnique({ where: { host } }) } })
  setLinksRepositoryForTest(repo); setAnalyticsRepositoryForTest(new PrismaAnalyticsRepository(db))
  setLinkMediaDbForTest(db); setRelatedLinksDbForTest(db)
  await app.ready()
})
beforeEach(async () => {
  tenant = randomUUID(); foreign = randomUUID(); owner = 'u-' + tenant; other = 'o-' + tenant; link = 'l-' + tenant; source = 's-' + tenant; host = tenant + '.test'
  for (const id of [tenant, foreign]) {
    await db.tenant.create({ data: { id, host: id + '.test', name: 'Visibility fixture' } })
    await db.niche.create({ data: { id: 'n-' + id, tenantId: id, name: 'Estudos', slug: 'estudos', isPublicFacet: true } })
    await db.network.create({ data: { id: 'r-' + id, tenantId: id, name: 'Site', slug: 'site', isPublicFacet: true } })
  }
  for (const id of [owner, other]) await db.user.create({ data: { id, tenantId: tenant, name: id, passwordHash: 'fixture', role: id === other ? 'ADMIN' : 'USER', identifiers: { create: { tenantId: tenant, kind: 'EMAIL', normalizedValue: id + '@fixture.test', confirmedAt: new Date() } } } })
  for (const id of [link, source]) await db.link.create({ data: { id, tenantId: tenant, ownerId: owner, nicheId: 'n-' + tenant, networkId: 'r-' + tenant, canonicalUrl: 'https://example.com/' + id, name: id === link ? 'Sentinela oculta estudos' : 'Fonte estudos', description: 'Descrição substancial sobre estudos e comunidades. '.repeat(4), status: 'PUBLISHED', everPublished: true, approvedName: 'Aprovado' } })
})
afterAll(async () => { setRelatedLinksDbForTest(null); setLinkMediaDbForTest(null); await db.$disconnect() })
function token(user = owner, tokenTenant = tenant) { return app.jwt.sign({ sub: user, tenantId: tokenTenant, role: user === other ? 'ADMIN' : 'USER', typ: 'access' }) }
function patch(hidden: unknown, user: string | null = owner, tokenTenant = tenant, body: unknown = { hidden }) {
  return app.inject({ method: 'PATCH', url: '/api/v1/links/' + link + '/visibility', headers: { host, ...(user ? { authorization: 'Bearer ' + token(user, tokenTenant) } : {}) }, payload: body as object })
}
function get(path: string) { return app.inject({ method: 'GET', url: '/api/v1/' + path, headers: { host } }) }
it('owner-only, verified, active, tenant-scoped; strict boolean payload, CSRF and support restrictions remain', async () => {
  expect((await patch(true, null)).statusCode).toBe(401)
  expect((await patch(true, other)).statusCode).toBe(404)
  expect((await patch(true, owner, foreign)).statusCode).toBe(403)
  for (const body of [{}, { hidden: 'true' }, { hidden: true, status: 'PUBLISHED' }, { hidden: 1 }, { hidden: null }]) expect((await patch(true, owner, tenant, body)).statusCode).toBe(400)
  const cookieRequest = { method: 'PATCH' as const, url: '/api/v1/links/' + link + '/visibility', headers: { host }, cookies: { accessToken: token() }, payload: { hidden: true } }
  expect((await app.inject(cookieRequest)).statusCode).toBe(403)
  expect((await app.inject({ ...cookieRequest, cookies: { ...cookieRequest.cookies, supportSession: 'stale-support' } })).statusCode).toBe(401)
  await db.userIdentifier.updateMany({ where: { userId: owner }, data: { confirmedAt: null } })
  expect((await patch(true)).statusCode).toBe(403)
  await db.userIdentifier.updateMany({ where: { userId: owner }, data: { confirmedAt: new Date() } })
  await db.user.update({ where: { id: owner }, data: { status: 'BANNED' } })
  expect((await patch(false)).statusCode).toBe(403)
  expect((await db.link.findUniqueOrThrow({ where: { id: link } })).ownerHidden).toBe(false)
})
it('toggle replays are idempotent and preserve moderation, quota, destination and paid deadlines', async () => {
  const expiresAt = new Date(Date.now() + 86400000), activatedAt = new Date()
  const promo = await db.promotion.create({ data: { tenantId: tenant, linkId: link, surface: 'HOME', status: 'ACTIVE', administrative: true, activatedAt, expiresAt } })
  const before = await db.link.findUniqueOrThrow({ where: { id: link } })
  expect((await patch(true)).json()).toEqual({ id: link, ownerHidden: true })
  expect((await patch(true)).statusCode).toBe(200)
  expect(await db.auditLog.count({ where: { tenantId: tenant, action: 'link.visibility.updated' } })).toBe(1)
  const hidden = await db.link.findUniqueOrThrow({ where: { id: link } })
  expect({ ...hidden, ownerHidden: before.ownerHidden, updatedAt: before.updatedAt }).toEqual(before)
  expect(await db.promotion.findUnique({ where: { id: promo.id } })).toEqual(promo)
  const mine = await app.inject({ method: 'GET', url: '/api/v1/links/mine', headers: { host, authorization: 'Bearer ' + token() } })
  expect(mine.json().links.find((row: { id: string }) => row.id === link)).toMatchObject({ ownerHidden: true, canonicalUrl: before.canonicalUrl })
  expect(mine.json().slotsUsed).toBe(2)
  expect((await patch(false)).json()).toEqual({ id: link, ownerHidden: false })
  expect((await get('links/' + link)).json().available).toBe(true)
  for (const status of ['PRE_REJECTED', 'PENDING_MODERATION', 'UNAVAILABLE'] as const) {
    await db.link.update({ where: { id: link }, data: { status } })
    await patch(true); await patch(false)
    expect((await db.link.findUniqueOrThrow({ where: { id: link } })).status).toBe(status)
    expect((await get('links/' + link)).json().available).toBe(false)
  }
})
it('hidden links disappear from public detail, redirects/tokens, impressions, media, catalog/search, related, sitemap, favorites, collections and profiles', async () => {
  const surfaceToken = signSurface(tenant, link, 'organic', secret)
  const asset = await db.linkMediaAsset.create({ data: { tenantId: tenant, linkId: link, kind: 'IMAGE', status: 'APPROVED', bytes: Buffer.from('fixture'), alt: 'Sentinela anexo', revision: 1 } })
  const favorite = await db.favorite.create({ data: { tenantId: tenant, userId: other, linkId: link } })
  const collection = await db.collection.create({ data: { id: randomUUID(), tenantId: tenant, userId: other, name: 'Curadoria', visibility: 'PUBLIC', slug: 'colecao', publishedRevision: 1, publication: { title: 'Curadoria', description: '', curator: 'Equipe', requiresAge: false, favoriteIds: [favorite.id] } } })
  await db.collectionItem.create({ data: { collectionId: collection.id, favoriteId: favorite.id, tenantId: tenant, userId: other, position: 0 } })
  const categoryId = randomUUID(), itemId = randomUUID()
  const content = { slug: 'pagina', name: 'Página', bio: '', avatarAssetId: null, requiresAge: false, primaryItemId: itemId, categories: [{ id: categoryId, name: 'Comunidades', visible: true }], items: [{ id: itemId, categoryId, type: 'CATALOG', label: 'Sentinela publicada', destination: link, visible: true }] }
  await db.profile.create({ data: { tenantId: tenant, ownerId: owner, slug: 'pagina', name: 'Página', publication: content, version: 1, publishedVersion: 1 } })
  expect(await publicProfile(db, tenant, 'pagina', true)).toMatchObject({ items: [expect.objectContaining({ destination: link })] })
  expect((await publicCollection(db, tenant, collection.slug!, true)).restricted).toBe(false)
  expect((await app.inject({ method: 'GET', url: '/go/' + link, headers: { host } })).statusCode).toBe(302)
  await patch(true)
  const detail = await get('links/' + link)
  expect(detail.json()).toMatchObject({ available: false, seo: { robots: 'noindex,nofollow' } })
  expect(detail.body).not.toMatch(/Sentinela|example.com/)
  const blockedGo = await app.inject({ method: 'GET', url: '/go/' + link + '?surfaceToken=' + encodeURIComponent(surfaceToken), headers: { host } })
  expect(blockedGo.statusCode).toBe(404)
  expect(blockedGo.headers['cache-control']).toBe('private, no-store')
  const impression = await app.inject({ method: 'POST', url: '/api/v1/analytics/impressions', headers: { host }, payload: { linkId: link, surfaceToken } })
  expect(impression.statusCode).toBe(404)
  expect((await get('links/' + link + '/media/' + asset.id)).statusCode).toBe(404)
  expect(await readApprovedLinkMedia(db, tenant, [link])).toEqual(new Map())
  const catalog = await queryCatalogPage(db, { tenantId: tenant, age: 'yes', surface: 'HOME', nicheSlug: null, networkSlug: null, limit: 12, cursor: null })
  expect(catalog.rows.map(row => row.id)).not.toContain(link)
  const search = await sqlCandidateSource(db)({ tenantId: tenant, query: 'estudos', vector: null, age: 'yes', textWeight: 1, semanticWeight: 0, threshold: 0 })
  expect(search.map(row => row.id)).not.toContain(link)
  expect((await get('links/' + source + '/related')).body).not.toContain(link)
  expect((await get('links/' + link + '/related')).statusCode).toBe(404)
  expect((await repo.listPublicSitemapLinks(tenant)).map(row => row.id)).not.toContain(link)
  expect((await repo.listSeoLinks(tenant)).map(row => row.id)).not.toContain(link)
  const favorites = await favoritesOperation(db, { tenantId: tenant, userId: other, age: true }, { kind: 'list-favorites' })
  expect(JSON.stringify(favorites)).not.toMatch(/Sentinela|example.com/)
  expect((await publicCollection(db, tenant, 'colecao', true))).toMatchObject({ items: [] })
  expect(await publicProfile(db, tenant, 'pagina', true)).toMatchObject({ items: [] })
  await patch(false)
  expect((await get('links/' + link)).json().available).toBe(true)
  expect(await publicProfile(db, tenant, 'pagina', true)).toMatchObject({ items: [expect.objectContaining({ destination: link })] })
  expect((await publicCollection(db, tenant, 'colecao', true))).toMatchObject({ items: [{ id: link }] })
})
it('checkout rechecks hidden under its lock and suspension serializes with visibility writes', async () => {
  await patch(true)
  const store = new PrismaCheckoutStore(db)
  await expect(store.createPending({ tenantId: tenant, userId: owner, linkId: link, method: 'PIX', surfaces: ['SEARCH'], durationDays: 7, productCode: 'SEARCH', amountCents: 100, savingsCents: 0, idempotencyKey: randomUUID(), renewal: false, pixExpiresAt: new Date(Date.now() + 60000) })).rejects.toThrow('link')
  expect(await db.order.count({ where: { linkId: link } })).toBe(0)
  let release!: () => void, acquired!: () => void
  const locked = new Promise<void>(resolve => { acquired = resolve }), unblock = new Promise<void>(resolve => { release = resolve })
  const suspension = db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${owner} FOR UPDATE`
    await tx.user.update({ where: { id: owner }, data: { status: 'BANNED' } })
    acquired(); await unblock
  })
  await locked
  const toggle = patch(false)
  release(); await suspension
  expect((await toggle).statusCode).toBe(403)
  expect((await db.link.findUniqueOrThrow({ where: { id: link } })).ownerHidden).toBe(true)
})

it('already-created paid orders activate while hidden without pausing, then restore remaining paid visibility', async () => {
  const store = new PrismaCheckoutStore(db), now = new Date()
  const order = await store.createPending({ tenantId: tenant, userId: owner, linkId: link, method: 'PIX', surfaces: ['HOME'], durationDays: 7, productCode: 'HOME', amountCents: 100, savingsCents: 0, idempotencyKey: randomUUID(), renewal: false, pixExpiresAt: new Date(Date.now() + 60000) })
  await patch(true)
  await db.order.update({ where: { id: order.order.id }, data: { status: 'PAID' } })
  await store.activatePaid(order.order.id, now); await store.activatePaid(order.order.id, now)
  const promotion = await db.promotion.findFirstOrThrow({ where: { linkId: link } })
  expect(promotion).toMatchObject({ status: 'ACTIVE', activatedAt: now, expiresAt: new Date(now.getTime() + 7 * 86400000), pauseRevision: 0 })
  expect(await db.promotionPause.count({ where: { promotionId: promotion.id } })).toBe(0)
  expect((await queryCatalogPage(db, { tenantId: tenant, age: 'yes', surface: 'HOME', nicheSlug: null, networkSlug: null, limit: 12, cursor: null })).rows.map(row => row.id)).not.toContain(link)
  await patch(false)
  expect(await db.promotion.findUnique({ where: { id: promotion.id } })).toEqual(promotion)
  expect((await queryCatalogPage(db, { tenantId: tenant, age: 'yes', surface: 'HOME', nicheSlug: null, networkSlug: null, limit: 12, cursor: null })).rows.find(row => row.id === link)?.homeActivatedAt).toEqual(now)
})
