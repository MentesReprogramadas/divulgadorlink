import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { analyticsDay, analyticsDayStart, shiftAnalyticsDay } from '@/domain/analytics/day'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaPromotionPerformanceRepository, setPromotionPerformanceRepositoryForTest } from '@/repositories/promotion-performance-repository'
import { PrismaCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Banco F01 deve ser local descartável')
const db = new PrismaClient({ datasources: { db: { url } } })
const today = analyticsDay(new Date()), from = shiftAnalyticsDay(today, -7), to = shiftAnalyticsDay(today, -1)
const start = analyticsDayStart(from), end = analyticsDayStart(today)
let tenant: string, owner: string, other: string, admin: string, link: string, host: string

beforeAll(async () => {
  setTenantsRepositoryForTest({ async findByHost(host) {
    const value = await db.tenant.findUnique({ where: { host } })
    return value ? { id: value.id, host: value.host, name: value.name } : null
  } })
  setPromotionPerformanceRepositoryForTest(new PrismaPromotionPerformanceRepository(db))
  await app.ready()
})
beforeEach(async () => {
  tenant = 'f01-' + randomUUID(); owner = 'owner-' + tenant; other = 'other-' + tenant; admin = 'admin-' + tenant
  host = tenant + '.test'; link = 'link-' + tenant
  await db.tenant.create({ data: { id: tenant, host, name: 'F01' } })
  for (const [id, role] of [[owner, 'USER'], [other, 'USER'], [admin, 'ADMIN']] as const) await db.user.create({ data: { id, tenantId: tenant, role, name: id, passwordHash: 'fixture-only' } })
  await db.network.create({ data: { id: 'net-' + tenant, tenantId: tenant, slug: 'site', name: 'Site', knownHosts: [] } })
  await db.niche.create({ data: { id: 'niche-' + tenant, tenantId: tenant, slug: 'educacao', name: 'Educação' } })
  await db.link.create({ data: { id: link, tenantId: tenant, ownerId: owner, canonicalUrl: 'https://example.com/' + tenant, name: 'Link F01', description: 'Fixture', status: 'PUBLISHED', networkId: 'net-' + tenant, nicheId: 'niche-' + tenant } })
})
afterAll(async () => { setPromotionPerformanceRepositoryForTest(null); await db.$disconnect() })
function token(actor: string, tenantId = tenant, role: 'USER' | 'ADMIN' = 'USER') { return app.jwt.sign({ sub: actor, tenantId, role, typ: 'access' }, { expiresIn: '5m' }) }
function get(actor: string | null = owner, query = 'from=' + from + '&to=' + to, tenantId = tenant) {
  return app.inject({ method: 'GET', url: '/api/v1/analytics/links/' + link + '/performance?' + query, headers: { host, ...(actor ? { authorization: 'Bearer ' + token(actor, tenantId) } : {}) } })
}
async function order(surfaces: Array<'HOME' | 'SEARCH' | 'NICHE'>, cents = 1000, renewal = false) {
  return db.order.create({ data: { tenantId: tenant, userId: owner, linkId: link, status: 'PAID', method: 'PIX', productCode: 'SEARCH', durationDays: 7, amountCents: cents, savingsCents: 0, renewal, paidAt: start, surfaces: { create: surfaces.map(surface => ({ linkId: link, surface })) } } })
}
async function events(surface = 'HOME', impressions = 100, clicks = 10, at = new Date(start.getTime() + 3600000)) {
  await db.analyticsEvent.createMany({ data: [
    ...Array.from({ length: impressions }, () => ({ id: randomUUID(), tenantId: tenant, sessionId: randomUUID(), linkId: link, surface, day: new Date(analyticsDay(at) + 'T00:00Z'), kind: 'IMPRESSION', createdAt: at, updatedAt: at })),
    ...Array.from({ length: clicks }, () => ({ id: randomUUID(), tenantId: tenant, sessionId: randomUUID(), linkId: link, surface, day: new Date(analyticsDay(at) + 'T00:00Z'), kind: 'CLICK', createdAt: at, updatedAt: at })),
  ] })
}

describe('F01 PostgreSQL e HTTP', () => {
  it('F01-T01/I02 acesso do dono/admin atual e isolamento sem expor dados', async () => {
    expect((await get()).statusCode).toBe(200)
    expect((await get(other)).statusCode).toBe(404)
    expect((await get(null)).statusCode).toBe(401)
    expect((await get(owner, undefined, 'other-tenant')).statusCode).toBe(403)
    expect((await get(admin)).statusCode).toBe(200)
    await db.user.update({ where: { id: owner }, data: { status: 'BANNED' } })
    expect((await get()).statusCode).toBe(404)
    const headers = (await get(admin)).headers
    expect(headers['cache-control']).toBe('private, no-store')
  })
  it('F01-T02/I01 distingue ausência de eventos e cobertura fora da retenção', async () => {
    const empty = (await get()).json()
    expect(empty.dataState).toBe('NO_EVENTS')
    expect(empty.totals.clicks).toBe(0)
    expect(empty.daily).toHaveLength(7)
    const old = new Date(start); old.setUTCFullYear(old.getUTCFullYear() - 2)
    await events('HOME', 1, 1, old)
    const oldDay = analyticsDay(old)
    const missing = (await get(owner, 'from=' + oldDay + '&to=' + oldDay)).json()
    expect(missing.dataState).toBe('OUTSIDE_RETENTION')
    expect(missing.coverage.status).toBe('UNAVAILABLE')
    expect(missing.series).toEqual([])
  })
  it('F01-T03/U03 período com impressões sem cliques tem CPC indisponível', async () => {
    const paid = await order(['HOME'])
    await new PrismaCheckoutStore(db).activatePaid(paid.id, start)
    await events('HOME', 100, 0)
    const body = (await get()).json()
    expect(body.dataState).toBe('RECORDED')
    expect(body.totals).toMatchObject({ impressions: 100, clicks: 0, investmentCents: 1000, cpcCents: null })
  })
  it('F01-T04/I03 comparação equivalente, datas inválidas e leitura sem efeitos', async () => {
    await events('HOME', 100, 10)
    await events('HOME', 50, 5, new Date(start.getTime() - 6 * 86400000))
    const before = await db.analyticsEvent.count({ where: { tenantId: tenant } })
    const body = (await get()).json()
    expect(body.days).toBe(7)
    expect(body.comparison).toMatchObject({ from: shiftAnalyticsDay(from, -7), to: shiftAnalyticsDay(from, -1), days: 7, totals: { impressions: 50, clicks: 5, ctr: 10 } })
    expect((await get()).json()).toEqual(body)
    expect(await db.analyticsEvent.count({ where: { tenantId: tenant } })).toBe(before)
    expect((await get(owner, 'from=2026-02-30&to=2026-03-01')).statusCode).toBe(400)
  })
  it('F01-T05/I01 não multiplica eventos com pedidos ou campanhas sobrepostas', async () => {
    const store = new PrismaCheckoutStore(db)
    const first = await order(['HOME', 'SEARCH'], 1000), second = await order(['NICHE'], 700)
    await Promise.all([store.activatePaid(first.id, start), store.activatePaid(second.id, start)])
    await events('HOME', 100, 10); await events('SEARCH', 10, 1)
    // A second administrative window must not duplicate HOME events.
    await db.promotion.create({ data: { tenantId: tenant, linkId: link, surface: 'HOME', status: 'EXPIRED', activatedAt: start, expiresAt: end, administrative: true } })
    const body = (await get()).json()
    expect(body.totals).toMatchObject({ impressions: 110, clicks: 11, ctr: 10, paidClicks: 11, investmentCents: 1700, cpcCents: 155 })
    expect(body.surfaces.find((row: { surface: string }) => row.surface === 'SEARCH')).toMatchObject({ impressions: 10, clicks: 1 })
    const selected = body.campaigns.find((row: { surface: string }) => row.surface === 'SEARCH')
    expect((await get(owner, 'from=' + from + '&to=' + to + '&promotionId=' + selected.id)).json().totals).toMatchObject({ clicks: 1, investmentCents: 500, cpcCents: 500 })
    expect((await get(owner, 'promotionId=foreign')).statusCode).toBe(404)
  })
  it('F01-PG01 ativação concorrente e renovação preservam centavos e duração', async () => {
    const store = new PrismaCheckoutStore(db), paid = await order(['HOME', 'SEARCH', 'NICHE'], 1000)
    await Promise.all([store.activatePaid(paid.id, start), store.activatePaid(paid.id, start)])
    const funding = await db.promotionInvestment.findMany({ where: { orderId: paid.id } })
    expect(funding).toHaveLength(3)
    expect(funding.reduce((sum, row) => sum + row.amountCents, 0)).toBe(1000)
    const renewal = await order(['SEARCH'], 500, true)
    await store.activatePaid(renewal.id, new Date(start.getTime() + 86400000))
    const extra = await db.promotionInvestment.findFirstOrThrow({ where: { orderId: renewal.id } })
    expect(extra.startsAt.toISOString()).toBe(end.toISOString())
    expect(extra.endsAt.getTime() - extra.startsAt.getTime()).toBe(7 * 86400000)
    expect(await db.promotion.count({ where: { tenantId: tenant } })).toBe(3)
  })
  it('F01-PG02 rollback e FK impedem ledger cruzado e ativação parcial', async () => {
    const paid = await order(['HOME']), store = new PrismaCheckoutStore(db)
    await store.activatePaid(paid.id, start)
    const promotion = await db.promotion.findFirstOrThrow({ where: { tenantId: tenant } })
    await expect(db.promotionInvestment.create({ data: { tenantId: 'wrong-tenant', orderId: paid.id, promotionId: promotion.id, surface: 'SEARCH', amountCents: 1, startsAt: start, endsAt: end } })).rejects.toThrow()
    const broken = await order(['NICHE'], 1000)
    await db.order.update({ where: { id: broken.id }, data: { durationDays: 0 } })
    await expect(store.activatePaid(broken.id, start)).rejects.toThrow()
    expect(await db.promotion.count({ where: { tenantId: tenant, surface: 'NICHE' } })).toBe(0)
    expect(await db.promotionInvestment.count({ where: { orderId: broken.id } })).toBe(0)
    expect((await db.orderSurface.findFirstOrThrow({ where: { orderId: broken.id } })).hold).toBe('PENDING_PAYMENT')
  })
  it('F01-PG03 duas renovações distintas não sobrescrevem a duração', async () => {
    const store = new PrismaCheckoutStore(db), paid = await order(['HOME'])
    await store.activatePaid(paid.id, start)
    const first = await order(['HOME'], 500, true)
    await db.orderSurface.updateMany({ where: { orderId: first.id }, data: { hold: 'RELEASED' } })
    const second = await order(['HOME'], 500, true)
    await Promise.all([store.activatePaid(first.id, start), store.activatePaid(second.id, start)])
    const promotion = await db.promotion.findFirstOrThrow({ where: { tenantId: tenant } })
    expect(promotion.expiresAt!.getTime() - start.getTime()).toBe(21 * 86400000)
    const funding = await db.promotionInvestment.findMany({ where: { promotionId: promotion.id }, orderBy: { startsAt: 'asc' } })
    expect(funding).toHaveLength(3)
    expect(funding[1]!.startsAt).toEqual(funding[0]!.endsAt)
    expect(funding[2]!.startsAt).toEqual(funding[1]!.endsAt)
  })
  it('F01-T02 informa cobertura parcial na fronteira da retenção', async () => {
    const now = new Date(), cutoff = new Date(now)
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 12)
    const day = cutoff.toISOString().slice(0, 10)
    const body = (await get(owner, 'from=' + shiftAnalyticsDay(day, -1) + '&to=' + day)).json()
    expect(body.coverage.status).toBe('PARTIAL')
    expect(body.daily[0].available).toBe(false)
    expect(body.daily[1].available).toBe(true)
    expect(body.totals.cpcCents).toBeNull()
  })
  it('F01-T05 histórico sem vínculo não inventa investimento ou CPC', async () => {
    await db.promotion.create({ data: { tenantId: tenant, linkId: link, surface: 'HOME', status: 'EXPIRED', activatedAt: start, expiresAt: end } })
    await events()
    const body = (await get()).json()
    expect(body.coverage.investment).toBe('UNLINKED_HISTORY')
    expect(body.totals.investmentCents).toBeNull()
    expect(body.totals.cpcCents).toBeNull()
  })
})
