import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { CATALOG_SEO_KEY, CatalogSeoConflictError, readCatalogSeo, setCatalogSeoDbForTest, writeCatalogSeo } from './catalog-seo'
import { InMemoryConfigsRepository, PrismaConfigsRepository, setConfigsRepositoryForTest } from './configs-repository'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local database required')
const db = new PrismaClient({ datasources: { db: { url } } })
const tenantId = randomUUID(), actorId = randomUUID()
beforeAll(async () => {
  await db.tenant.create({ data: { id: tenantId, host: tenantId + '.test', name: 'SEO transaction fixture' } })
  await db.user.create({ data: { id: actorId, tenantId, name: 'SEO admin', role: 'ADMIN', passwordHash: 'test-fixture' } })
  setConfigsRepositoryForTest(new PrismaConfigsRepository(db))
  setCatalogSeoDbForTest(db)
})
afterAll(async () => {
  setCatalogSeoDbForTest(null)
  setConfigsRepositoryForTest(InMemoryConfigsRepository.seeded())
  await db.auditLog.deleteMany({ where: { tenantId } })
  await db.config.deleteMany({ where: { tenantId } })
  await db.user.deleteMany({ where: { tenantId } })
  await db.tenant.delete({ where: { id: tenantId } })
  await db.$disconnect()
})

it('CAS real permite uma primeira gravação concorrente e audita somente a vencedora', async () => {
  const state = await readCatalogSeo(tenantId)
  const results = await Promise.allSettled([writeCatalogSeo(tenantId, 0, state, actorId, 'one'), writeCatalogSeo(tenantId, 0, state, actorId, 'two')])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  const failure = results.find(result => result.status === 'rejected')
  expect(failure?.status === 'rejected' && failure.reason).toBeInstanceOf(CatalogSeoConflictError)
  expect((await readCatalogSeo(tenantId)).version).toBe(1)
  expect(await db.auditLog.count({ where: { tenantId, action: 'catalog.seo.update' } })).toBe(1)
})

it('falha da auditoria desfaz a edição Config na mesma transação', async () => {
  const before = await db.config.findUniqueOrThrow({ where: { tenantId_key: { tenantId, key: CATALOG_SEO_KEY } } })
  const state = await readCatalogSeo(tenantId)
  // PostgreSQL rejects NUL in text: fail the audit after the Config write, then verify rollback.
  await expect(writeCatalogSeo(tenantId, state.version, { ...state, facets: { 'niche:estudos': { title: 'Estudos', description: 'Comunidades de estudo.', explicit: false, approved: true } } }, actorId, 'invalid\u0000request')).rejects.toThrow()
  expect((await db.config.findUniqueOrThrow({ where: { id: before.id } })).value).toBe(before.value)
  expect(await db.auditLog.count({ where: { tenantId, action: 'catalog.seo.update' } })).toBe(1)
})
