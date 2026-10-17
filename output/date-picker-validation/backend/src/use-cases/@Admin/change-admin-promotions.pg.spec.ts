import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { changeAdminPromotions } from './change-admin-promotions'
import { PrismaAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { queryCatalogPage } from '@/http/catalog-query'
import { PrismaCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'
import { hybridSearchSql } from '@/use-cases/@Search/rank-links'

const url = process.env.CHECKOUT_DATABASE_URL
if (!url) throw new Error('CHECKOUT_DATABASE_URL ausente')
const db = new PrismaClient({ datasources: { db: { url } } })
const tenantId = 'admin-pg'
const base = { tenantId, actorId: 'admin-pg-user', linkId: 'admin-pg-link', requestId: 'test' }
function change(surfaces: ('HOME' | 'SEARCH' | 'NICHE')[], expiresAt: Date | null = null) {
  return db.$transaction(tx => changeAdminPromotions(tx, { ...base, surfaces, expiresAt }, new PrismaAuditLogsRepository(tx)))
}
describe('destaque administrativo persistido', () => {
  beforeAll(async () => {
    await db.tenant.create({ data: { id: tenantId, host: 'admin-pg.localhost', name: 'Admin PG' } })
    await db.user.create({ data: { id: base.actorId, tenantId, role: 'ADMIN', status: 'ACTIVE', name: 'Admin', passwordHash: 'fixture' } })
    await db.network.create({ data: { id: 'admin-pg-net', tenantId, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.niche.create({ data: { id: 'admin-pg-niche', tenantId, name: 'Jogos', slug: 'jogos' } })
    await db.link.create({ data: { id: base.linkId, tenantId, ownerId: base.actorId, name: 'Comunidade teste', description: 'Comunidade teste', status: 'PUBLISHED', networkId: 'admin-pg-net', nicheId: 'admin-pg-niche', canonicalUrl: 'https://t.me/teste' } })
  })
  beforeEach(async () => { await db.promotion.deleteMany({ where: { tenantId } }); await db.auditLog.deleteMany({ where: { tenantId } }) })
  afterAll(async () => { await db.$disconnect() })
  it('persiste prazo nulo e auditoria, conserva ativação na edição e remove sem gerar pedido', async () => {
    await change(['HOME'], new Date(Date.now() + 86400000))
    const first = await db.promotion.findFirstOrThrow({ where: { tenantId, status: 'ACTIVE' } })
    await change(['HOME'])
    const next = await db.promotion.findFirstOrThrow({ where: { tenantId, status: 'ACTIVE' } })
    expect(next.expiresAt).toBeNull(); expect(next.activatedAt).toEqual(first.activatedAt)
    expect(await db.order.count({ where: { tenantId } })).toBe(0)
    await change([])
    expect(await db.promotion.count({ where: { tenantId, status: 'ACTIVE' } })).toBe(0)
    expect(await db.auditLog.count({ where: { tenantId } })).toBe(3)
  })
  it('prazo expirado deixa de patrocinar home, categoria e busca; indeterminado continua', async () => {
    await change(['HOME', 'NICHE', 'SEARCH'])
    const catalog = (surface: 'HOME' | 'NICHE') => queryCatalogPage(db, { tenantId, age: 'no', surface, nicheSlug: null, networkSlug: null, limit: 10, cursor: null })
    for (const surface of ['HOME', 'NICHE'] as const) expect((await catalog(surface)).rows[0]?.homeActivatedAt).toBeInstanceOf(Date)
    const search = () => db.$queryRawUnsafe<Array<{ search_activated_at: Date | null }>>(hybridSearchSql(), 'Comunidade', null, tenantId, 'no', 1, 0, 0)
    expect((await search())[0]?.search_activated_at).toBeInstanceOf(Date)
    await db.promotion.updateMany({ where: { tenantId }, data: { expiresAt: new Date('2020-01-01') } })
    for (const surface of ['HOME', 'NICHE'] as const) expect((await catalog(surface)).rows[0]?.homeActivatedAt).toBeNull()
    expect((await search())[0]?.search_activated_at).toBeNull()
    expect(await new PrismaCheckoutStore(db).activeSurfaces(base.linkId)).toEqual([])
    await change(['HOME'])
    expect((await catalog('HOME')).rows[0]?.homeActivatedAt).toBeInstanceOf(Date)
  })
  it('conflito pago desfaz a transação e mantém os destaques administrativos anteriores', async () => {
    await change(['HOME'])
    await db.promotion.create({ data: { tenantId, linkId: base.linkId, surface: 'SEARCH', status: 'ACTIVE', activatedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) } })
    await expect(change(['HOME', 'NICHE', 'SEARCH'])).rejects.toThrow('pago')
    expect(await db.promotion.count({ where: { tenantId, status: 'ACTIVE' } })).toBe(2)
    expect(await db.auditLog.count({ where: { tenantId } })).toBe(1)
    await change([])
    expect(await db.promotion.count({ where: { tenantId, status: 'ACTIVE', administrative: false } })).toBe(1)
  })
})
