import type { PrismaClient } from '@prisma/client'
import { expect, it, vi } from 'vitest'
import { searchCombinedAffiliateCatalog } from './combined-search'
import { AffiliateCatalogError, type CatalogProduct } from '@/domain/affiliates/mercado-livre'

const db = {} as PrismaClient
const product = (id: string): CatalogProduct => ({ id, catalogId: id, title: id, productUrl: 'https://example.test', priceCents: 1000, oldPriceCents: null, imageUrl: null, checkedAt: new Date().toISOString() })
const result = (ids: string[], total = 20, hasNext = false) => ({ products: ids.map(product), rejected: [], checkedAt: new Date().toISOString(), comparison: 'catalog_sellers' as const, warnings: [], counts: { catalogsFound: total, catalogsChecked: 20, withoutOffers: 0, failed: 0 }, pagination: { offset: 0, limit: 20, total, hasNext } })

it('queries both sources with the same term/page and interleaves their products', async () => {
  const search = vi.fn().mockResolvedValueOnce(result(['MLB1', 'MLB2'], 200, true)).mockResolvedValueOnce(result(['SHP1_1', 'SHP1_2']))
  const combined = await searchCombinedAffiliateCatalog(db, 'tenant', 'Pets', { offset: 20 }, search)
  expect(search.mock.calls).toEqual([[db, 'tenant', 'Pets', { offset: 20, provider: 'MERCADO_LIVRE' }], [db, 'tenant', 'Pets', { offset: 20, provider: 'SHOPEE' }]])
  expect(combined.products.map(p => p.id)).toEqual(['MLB1', 'SHP1_1', 'MLB2', 'SHP1_2'])
  expect(combined.pagination).toMatchObject({ hasNext: true, total: 220 })
  expect(combined.failedProviders).toEqual([])
})

it.each(['MERCADO_LIVRE', 'SHOPEE'] as const)('keeps the other source available when %s fails without reflecting secrets', async provider => {
  const search = vi.fn(async (_db, _tenant, _term, options) => {
    if (options.provider === provider) throw new Error('secret cookie credential')
    return result([provider === 'SHOPEE' ? 'MLB1' : 'SHP1_1'])
  })
  const combined = await searchCombinedAffiliateCatalog(db, 'tenant', 'Pets', undefined, search)
  expect(combined.products).toHaveLength(1)
  expect(combined.failedProviders).toEqual([provider])
  expect(combined.warnings.join()).toContain(provider === 'SHOPEE' ? 'Shopee' : 'Mercado Livre')
  expect(JSON.stringify(combined)).not.toContain('secret')
})

it('does not advance a page that failed in one source while the other succeeded', async () => {
  const search = vi.fn().mockResolvedValueOnce(result(['MLB1'], 200, true)).mockRejectedValueOnce(new Error('Unavailable'))
  expect((await searchCombinedAffiliateCatalog(db, 'tenant', 'Pets', undefined, search)).pagination.hasNext).toBe(false)
})

it('treats an exhausted source as empty on later pages while continuing the other', async () => {
  const search = vi.fn().mockRejectedValueOnce(new AffiliateCatalogError(400, 'Boundary')).mockResolvedValueOnce(result(['SHP1_1'], 61, true))
  const combined = await searchCombinedAffiliateCatalog(db, 'tenant', 'Pets', { offset: 40 }, search)
  expect(combined.pagination.hasNext).toBe(true)
  expect(combined.failedProviders).toEqual([])
})

it('fails safely when both sources are unavailable', async () => {
  await expect(searchCombinedAffiliateCatalog(db, 'tenant', 'Pets', undefined, vi.fn().mockRejectedValue(new Error('secret')))).rejects.toMatchObject({ status: 503 })
})
