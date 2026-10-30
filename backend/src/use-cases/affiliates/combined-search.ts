import type { PrismaClient } from '@prisma/client'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { type AffiliateCatalogProvider } from '@/domain/affiliates/shopee'
import { searchAffiliateCatalog } from '@/use-cases/@Affiliates/catalog'

export const discoveryProviders: AffiliateCatalogProvider[] = ['MERCADO_LIVRE', 'SHOPEE']

export async function searchCombinedAffiliateCatalog(db: PrismaClient, tenantId: string, term: string, options?: { offset?: number }, search = searchAffiliateCatalog) {
  const offset = options?.offset ?? 0
  const settled = await Promise.allSettled(discoveryProviders.map(provider => search(db, tenantId, term, { offset, provider })))
  const results = settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  const exhausted = (result: PromiseSettledResult<unknown>) => result.status === 'rejected' && offset > 0 && result.reason instanceof AffiliateCatalogError && result.reason.status === 400
  const failedProviders = discoveryProviders.filter((_, index) => settled[index].status === 'rejected' && !exhausted(settled[index]))
  if (!results.length) throw new AffiliateCatalogError(settled.every(exhausted) ? 400 : 503, 'Não foi possível consultar Shopee e Mercado Livre. Confira as integrações e tente novamente.')
  const products = Array.from({ length: Math.max(...results.map(result => result.products.length)) }, (_, index) => results.flatMap(result => result.products[index] ? [result.products[index]] : [])).flat()
  const counts = results.reduce((sum, result) => ({ catalogsFound: sum.catalogsFound + result.counts.catalogsFound, catalogsChecked: sum.catalogsChecked + result.counts.catalogsChecked, withoutOffers: sum.withoutOffers + result.counts.withoutOffers, failed: sum.failed + result.counts.failed }), { catalogsFound: 0, catalogsChecked: 0, withoutOffers: 0, failed: 0 })
  return {
    products, rejected: results.flatMap(result => result.rejected), counts, checkedAt: new Date().toISOString(), comparison: 'combined_sources' as const,
    pagination: { offset, limit: 40, total: counts.catalogsFound, hasNext: !failedProviders.length && results.some(result => result.pagination.hasNext) },
    failedProviders,
    warnings: [...results.flatMap(result => result.warnings), ...failedProviders.map(provider => `${provider === 'SHOPEE' ? 'Shopee' : 'Mercado Livre'} indisponível nesta coleta. Os produtos da outra fonte continuam disponíveis; confira a integração em Configurações.`)],
  }
}
