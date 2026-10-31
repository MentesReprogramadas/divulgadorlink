import type { AffiliateConnection, PrismaClient } from '@prisma/client'
import { env } from '@/env'
import { openWebhookSecret, sealWebhookSecret } from '@/lib/webhook-secret'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { shopeeConfigSchema, type ShopeeCredentials } from '@/domain/affiliates/shopee'
import { generateShopeeAffiliateLink, searchShopeeCatalog, shopeeRequest } from '@/adapters/affiliates/shopee'

export const SHOPEE_PROVIDER = 'SHOPEE'
const where = (tenantId: string) => ({ tenantId_provider: { tenantId, provider: SHOPEE_PROVIDER } })
const context = (tenantId: string) => `affiliates:${tenantId}:${SHOPEE_PROVIDER}`
function credentials(row: AffiliateConnection): ShopeeCredentials {
  try { return shopeeConfigSchema.parse(JSON.parse(openWebhookSecret(row.credentials, env.WEBHOOK_ENCRYPTION_KEY, context(row.tenantId)))) }
  catch { throw new AffiliateCatalogError(503, 'Configure novamente a Shopee com a proteção correta no servidor.') }
}
export async function shopeeStatus(db: Pick<PrismaClient, 'affiliateConnection'>, tenantId: string) {
  const row = await db.affiliateConnection.findUnique({ where: where(tenantId) })
  const value = row && row.status !== 'DISCONNECTED' ? credentials(row) : null
  return { provider: SHOPEE_PROVIDER, configured: Boolean(value), connected: row?.status === 'CONNECTED', status: row?.status ?? 'NOT_CONFIGURED', accountLabel: value?.accountLabel ?? '', subIds: value?.subIds ?? [], updatedAt: row?.updatedAt.toISOString() ?? null }
}
export async function configureShopee(db: PrismaClient, tenantId: string, actorId: string, input: ShopeeCredentials) {
  const value = shopeeConfigSchema.parse(input), encrypted = sealWebhookSecret(JSON.stringify(value), env.WEBHOOK_ENCRYPTION_KEY, context(tenantId))
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    await tx.affiliateConnection.upsert({ where: where(tenantId), create: { tenantId, provider: SHOPEE_PROVIDER, credentials: encrypted, status: 'CONFIGURED' }, update: { credentials: encrypted, status: 'CONFIGURED' } })
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.shopee.configure', entityType: 'AffiliateConnection', entityId: tenantId, after: { provider: SHOPEE_PROVIDER } } })
  })
  return { saved: true, verified: false }
}
export async function disconnectShopee(db: PrismaClient, tenantId: string, actorId: string) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
    await tx.affiliateConnection.upsert({ where: where(tenantId), create: { tenantId, provider: SHOPEE_PROVIDER, credentials: '', status: 'DISCONNECTED' }, update: { credentials: '', status: 'DISCONNECTED' } })
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.shopee.disconnect', entityType: 'AffiliateConnection', entityId: tenantId, after: { provider: SHOPEE_PROVIDER } } })
  })
  return { disconnected: true }
}
export async function shopeeConnection(db: Pick<PrismaClient, 'affiliateConnection'>, tenantId: string) {
  const row = await db.affiliateConnection.findUnique({ where: where(tenantId) })
  if (!row || !['CONFIGURED','CONNECTED'].includes(row.status)) throw new AffiliateCatalogError(409, 'Configure e verifique o acesso à Open API da Shopee antes de consultar produtos.')
  const value = credentials(row)
  return { row, credentials: value, request: (query: string, variables?: Record<string, unknown>) => shopeeRequest(value, query, variables) }
}
export async function verifyShopee(db: PrismaClient, tenantId: string, actorId: string) {
  const connection = await shopeeConnection(db, tenantId)
  await searchShopeeCatalog('oferta', connection.request)
  await db.$transaction(async tx => {
    // Guard credential rotation/disconnect without treating successful concurrent requests as configuration changes.
    const saved = await tx.affiliateConnection.updateMany({ where: { id: connection.row.id, tenantId, credentials: connection.row.credentials, status: { in: ['CONFIGURED', 'CONNECTED'] } }, data: { status: 'CONNECTED' } })
    if (!saved.count) throw new AffiliateCatalogError(409, 'A configuração Shopee mudou durante a verificação. Tente novamente.')
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.shopee.verify', entityType: 'AffiliateConnection', entityId: connection.row.id, after: { provider: SHOPEE_PROVIDER } } })
  })
  return { connected: true }
}
export async function generateTenantShopeeAffiliate(db: PrismaClient, tenantId: string, actorId: string, productUrl: string) {
  const connection = await shopeeConnection(db, tenantId)
  const result = await generateShopeeAffiliateLink(productUrl, connection.credentials.subIds, connection.request)
  await db.$transaction(async tx => {
    // Guard credential rotation/disconnect without treating successful concurrent requests as configuration changes.
    const saved = await tx.affiliateConnection.updateMany({ where: { id: connection.row.id, tenantId, credentials: connection.row.credentials, status: { in: ['CONFIGURED', 'CONNECTED'] } }, data: { status: 'CONNECTED' } })
    if (!saved.count) throw new AffiliateCatalogError(409, 'A configuração Shopee mudou durante a geração. Gere novamente.')
    await tx.auditLog.create({ data: { tenantId, actorId, action: 'affiliate.link.generate', entityType: 'AffiliateConnection', entityId: connection.row.id, after: { provider: SHOPEE_PROVIDER } } })
  })
  return result
}
