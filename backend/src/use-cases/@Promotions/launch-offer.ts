import { randomUUID } from 'node:crypto'
import type { PrismaClient, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { canIssueLaunchOffer, discountedLaunchRows, LAUNCH_VALIDITY_MS, launchOfferIsActive, type LaunchPriceRow } from '@/domain/promotions/launch-offer'
import { assertCheckout } from '@/domain/promotions/eligibility'
import { surfacesFor, type OfferCode } from '@/domain/promotions/offer-catalog'
import type { PriceRow } from '@/domain/promotions/price-for'
import { publishSubmission } from '@/use-cases/@Moderation/settle-submission'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { getLinksRepository } from '@/repositories/links-repository'
import { getConfigsRepository } from '@/repositories/configs-repository'

export type LaunchOffer = { id: string; linkId: string; linkName: string; discountPercent: 20; expiresAt: string; dismissed: boolean; productCode?: OfferCode; durationDays?: 7 | 14 | 28 }
export type LaunchOfferRow = { id: string; tenantId: string; userId: string; linkId: string; linkName: string; prices: unknown; createdAt: Date; expiresAt: Date; dismissedAt: Date | null; reservedOrderId: string | null; productCode: OfferCode | null; durationDays: 7 | 14 | 28 | null }
const pricesSchema = z.array(z.object({ code: z.enum(['SEARCH', 'NICHE', 'HOME', 'SEARCH_NICHE', 'SEARCH_NICHE_HOME']), durationDays: z.union([z.literal(7), z.literal(14), z.literal(28)]), amountCents: z.number().int().nonnegative(), referenceAmountCents: z.number().int().nonnegative() }))
export function launchPrices(row: LaunchOfferRow): LaunchPriceRow[] { return pricesSchema.parse(row.prices) }
export function launchDto(row: LaunchOfferRow): LaunchOffer { return { id: row.id, linkId: row.linkId, linkName: row.linkName, discountPercent: 20, expiresAt: row.expiresAt.toISOString(), dismissed: row.dismissedAt !== null, ...(row.productCode ? { productCode: row.productCode } : {}), ...(row.durationDays ? { durationDays: row.durationDays } : {}) } }

async function selectionIsAvailable(db: Prisma.TransactionClient, tenantId: string, linkId: string, code: OfferCode, reservedOrderId: string | null = null): Promise<boolean> {
 const niche = await db.link.findFirst({ where: { id: linkId, tenantId, ownerHidden: false }, select: { niche: { select: { requiresAge: true } } } })
 if (!niche) return false
 const [active, pending] = await Promise.all([
  db.promotion.findMany({ where: { tenantId, linkId, status: 'ACTIVE', NOT: { administrative: true, expiresAt: { lte: new Date() } } }, select: { surface: true } }),
  db.orderSurface.findMany({ where: { linkId, hold: 'PENDING_PAYMENT', ...(reservedOrderId ? { orderId: { not: reservedOrderId } } : {}) }, select: { surface: true } }),
 ])
 try {
  // Campaigns can precede moderation; checkout still validates publication before payment.
  assertCheckout({ account: 'ACTIVE', link: 'PUBLISHED', requiresAge: niche.niche.requiresAge, surfaces: surfacesFor(code), activeSurfaces: active.map(row => row.surface), pendingSurfaces: pending.map(row => row.surface) })
  return true
 } catch { return false }
}

export async function activeLaunchOffer(tenantId: string, userId: string, linkId?: string, db: PrismaClient = prisma): Promise<LaunchOfferRow | null> {
 const rows = await db.$queryRaw<LaunchOfferRow[]>`SELECT o.* FROM promotion_launch_offers o JOIN links l ON l.id=o."linkId" AND l."tenantId"=o."tenantId" JOIN users u ON u.id=o."userId" AND u."tenantId"=o."tenantId" LEFT JOIN orders paid ON paid.id=o."reservedOrderId" WHERE o."tenantId"=${tenantId} AND o."userId"=${userId} AND l."ownerId"=${userId} AND l."ownerHidden" = false AND l.status IN ('PUBLISHED','PENDING_MODERATION') AND u.status='ACTIVE' AND o."expiresAt">NOW() AND (paid.id IS NULL OR paid.status NOT IN ('PAID','PAID_LATE','REFUND_PENDING','REFUNDED','REFUND_FAILED')) ORDER BY o."createdAt" DESC LIMIT 1`
 const row = rows[0]
 return row && (!linkId || row.linkId === linkId) && await selectionIsAvailable(db, tenantId, row.linkId, row.productCode ?? 'SEARCH_NICHE', row.reservedOrderId) ? row : null
}
export type LaunchOfferSelection = { source?: 'post_create' | 'exit'; productCode?: OfferCode; durationDays?: 7 | 14 | 28 }
export async function issueLaunchOffer(tenantId: string, userId: string, linkId: string, prices: PriceRow[], db: PrismaClient = prisma, selection: LaunchOfferSelection = {}): Promise<LaunchOfferRow | null> {
 return db.$transaction(async tx => {
  // Lock the account: two newly submitted links cannot issue two concurrent offers.
  const users = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM users WHERE id=${userId} AND "tenantId"=${tenantId} AND status='ACTIVE' FOR UPDATE`
  if (!users.length) return null
  // Match checkout's link lock so issuing a campaign cannot race a competing reservation.
  await tx.$executeRaw`SELECT id FROM links WHERE id=${linkId} AND "tenantId"=${tenantId} FOR UPDATE`
  const link = await tx.link.findFirst({ where: { id: linkId, tenantId, ownerId: userId, ownerHidden: false, status: { in: ['PUBLISHED','PENDING_MODERATION'] } } })
  if (!link) return null
  const niche = await tx.niche.findFirst({ where: { id: link.nicheId, tenantId } })
  if (!niche) return null
  const eligiblePrices = prices.filter(row => !niche.requiresAge || !surfacesFor(row.code).includes('HOME'))
  const validSelection = (rows: PriceRow[], productCode: OfferCode, durationDays: number) => rows.some(row => row.code === productCode && row.durationDays === durationDays)
  const history = await tx.$queryRaw<LaunchOfferRow[]>`SELECT * FROM promotion_launch_offers WHERE "tenantId"=${tenantId} AND "userId"=${userId} ORDER BY "createdAt" DESC LIMIT 1`
  const latest = history[0], now = new Date()
  if (latest?.linkId === linkId) {
   const reserved = latest.reservedOrderId ? await tx.order.findUnique({ where: { id: latest.reservedOrderId } }) : null
   if (!launchOfferIsActive(latest, now) || (reserved && reserved.status !== 'PENDING_PAYMENT' && reserved.status !== 'EXPIRED')) return null
   const productCode = selection.productCode ?? latest.productCode ?? 'SEARCH_NICHE', durationDays = selection.durationDays ?? latest.durationDays ?? 7
   if (!validSelection(eligiblePrices, productCode, durationDays) || !validSelection(launchPrices(latest), productCode, durationDays)) return null
   // A pending order owns its selection until payment resolves or expires.
   if (reserved?.status === 'PENDING_PAYMENT') return await selectionIsAvailable(tx, tenantId, linkId, latest.productCode ?? 'SEARCH_NICHE', latest.reservedOrderId) ? latest : null
   if (!await selectionIsAvailable(tx, tenantId, linkId, selection.productCode ?? latest.productCode ?? 'SEARCH_NICHE')) return null
   if (selection.productCode !== undefined || selection.durationDays !== undefined) {
    await tx.$executeRaw`UPDATE promotion_launch_offers SET "productCode"=${productCode},"durationDays"=${durationDays} WHERE id=${latest.id}`
    return { ...latest, productCode, durationDays }
   }
   return latest
  }
  if (!validSelection(eligiblePrices, selection.productCode ?? 'SEARCH_NICHE', selection.durationDays ?? 7)) return null
  if (!await selectionIsAvailable(tx, tenantId, linkId, selection.productCode ?? 'SEARCH_NICHE')) return null
  if (!canIssueLaunchOffer(now, link.createdAt, latest?.createdAt ?? null, selection.source)) return null
  const id = randomUUID(), snapshot = discountedLaunchRows(eligiblePrices), expiresAt = new Date(now.getTime() + LAUNCH_VALIDITY_MS)
  await tx.$executeRaw`INSERT INTO promotion_launch_offers (id,"tenantId","userId","linkId","linkName",prices,"createdAt","expiresAt","productCode","durationDays") VALUES (${id},${tenantId},${userId},${linkId},${link.name},${JSON.stringify(snapshot)}::jsonb,${now},${expiresAt},${selection.productCode ?? null},${selection.durationDays ?? null})`
  return { id, tenantId, userId, linkId, linkName: link.name, prices: snapshot, createdAt: now, expiresAt, dismissedAt: null, reservedOrderId: null, productCode: selection.productCode ?? null, durationDays: selection.durationDays ?? null }
 })
}
export async function dismissLaunchOffer(tenantId: string, userId: string, id: string, db: PrismaClient = prisma): Promise<void> {
 await db.$executeRaw`UPDATE promotion_launch_offers SET "dismissedAt"=COALESCE("dismissedAt",NOW()) WHERE id=${id} AND "tenantId"=${tenantId} AND "userId"=${userId}`
}

export async function reserveLaunchOffer(tx: Prisma.TransactionClient, input: { id: string; tenantId: string; userId: string; linkId: string; orderId: string; code: string; durationDays: number; amountCents: number }): Promise<void> {
 const rows = await tx.$queryRaw<LaunchOfferRow[]>`SELECT * FROM promotion_launch_offers WHERE id=${input.id} AND "tenantId"=${input.tenantId} AND "userId"=${input.userId} AND "linkId"=${input.linkId} FOR UPDATE`
 const row = rows[0]
 if (!row || !launchOfferIsActive(row, new Date())) throw new Error('oferta expirada ou indisponível')
 const price = launchPrices(row).find(p => p.code===input.code && p.durationDays===input.durationDays)
 if (!price || price.amountCents !== input.amountCents) throw new Error('oferta indisponível')
 if (row.reservedOrderId) {
  const order = await tx.order.findUnique({ where: { id: row.reservedOrderId } })
  if (order && order.status !== 'EXPIRED') throw new Error('oferta já utilizada ou com pagamento pendente')
 }
 await tx.$executeRaw`UPDATE promotion_launch_offers SET "reservedOrderId"=${input.orderId},"productCode"=${input.code},"durationDays"=${input.durationDays} WHERE id=${input.id}`
}

// Threshold zero is already an automatic-publication policy; checkout must not wait for a queue cycle.
export async function prepareAutomaticPublication(tenantId: string, userId: string, linkId: string, db: PrismaClient = prisma): Promise<void> {
 const repo = getLinksRepository(), link = await repo.findLinkById(linkId)
 if (!link || link.tenantId !== tenantId || link.ownerId !== userId || link.ownerHidden || link.status !== 'PENDING_MODERATION') return
 const config = await getConfigsRepository().findByTenantAndKey(tenantId, 'MODERATION_AUTO_APPROVE_THRESHOLD')
 if (!config?.value.trim() || Number(config.value) !== 0) return
 const [user, niche, network, terms, niches] = await Promise.all([repo.findSubmitter(tenantId,userId),repo.findNiche(tenantId,link.nicheId),repo.findNetwork(tenantId,link.networkId),repo.listBlocklistTerms(tenantId),repo.listNiches(tenantId)])
 if (!user || user.status !== 'ACTIVE' || !niche || !network || niche.slug==='outro' || network.slug==='outro') return
 if (hitsBlocklist({text:link.name+' '+link.description,selectedNiche:niche.name,nicheNames:niches.map(n=>n.name),terms})) return
 await publishSubmission(linkId,{threshold:0,verdict:null},db)
}
