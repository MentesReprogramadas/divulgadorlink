import { seoEditorialSchema, type SeoEditorial } from '@/domain/catalog/seo-editorial'
import { prisma } from '@/lib/prisma'
import { getConfigsRepository, PrismaConfigsRepository, type ConfigsRepository } from './configs-repository'
import { getAuditLogsRepository, PrismaAuditLogsRepository, type AuditLogsRepository } from './audit-logs-repository'
import type { PrismaClient } from '@prisma/client'

export const CATALOG_SEO_KEY = 'CATALOG_SEO_EDITORIAL'
let testDatabase: PrismaClient | null = null
export function setCatalogSeoDbForTest(database: PrismaClient | null): void {
  if (process.env.NODE_ENV === 'test') testDatabase = database
}
export class CatalogSeoConflictError extends Error {
  constructor() { super('O editorial mudou. Atualize os dados antes de salvar.') }
}

export async function readCatalogSeo(tenantId: string): Promise<SeoEditorial> {
  const row = await getConfigsRepository().findByTenantAndKey(tenantId, CATALOG_SEO_KEY)
  return row ? seoEditorialSchema.parse(JSON.parse(row.value)) : { version: 0, facets: {}, links: {}, collections: [] }
}

export async function writeCatalogSeo(tenantId: string, expectedVersion: number, state: SeoEditorial, actorId: string, requestId: string): Promise<SeoEditorial> {
  const write = async (configs: ConfigsRepository, audits: AuditLogsRepository) => {
    const current = await configs.findByTenantAndKey(tenantId, CATALOG_SEO_KEY)
    const before = current ? seoEditorialSchema.parse(JSON.parse(current.value)) : { version: 0, facets: {}, links: {}, collections: [] }
    if (before.version !== expectedVersion) throw new CatalogSeoConflictError()
    const next = seoEditorialSchema.parse({ ...state, version: expectedVersion + 1 })
    if (!await configs.compareAndSet(tenantId, CATALOG_SEO_KEY, current?.value ?? null, JSON.stringify(next))) throw new CatalogSeoConflictError()
    await audits.create({ tenantId, actorId, action: 'catalog.seo.update', entityType: 'Config', entityId: CATALOG_SEO_KEY, before, after: next, requestId })
    return next
  }
  const database = process.env.NODE_ENV === 'test' ? testDatabase : prisma
  return database
    ? database.$transaction(tx => write(new PrismaConfigsRepository(tx), new PrismaAuditLogsRepository(tx)))
    : write(getConfigsRepository(), getAuditLogsRepository())
}
