import type { PrismaClient } from '@prisma/client'
export async function seedAvailability(db: PrismaClient, input: { tenantId: string; ownerId: string; networkId: string; nicheId: string }) {
  const at = new Date('2026-10-14T12:00Z')
  const link = await db.link.create({ data: { ...input, id: 'f07-visual-link', canonicalUrl: 'https://example.com/f07-original', name: 'Clube de estudos', description: 'Encontros e materiais para estudar em grupo', status: 'UNAVAILABLE', occupiesSlot: false, everPublished: true } })
  await db.linkAvailability.create({ data: { linkId: link.id, tenantId: input.tenantId, state: 'UNAVAILABLE', version: 2, failures: 3, checkedAt: at, disabledAt: at, nextCheckAt: at } })
  await db.urlRevision.create({ data: { id: 'f07-visual-proposal', tenantId: input.tenantId, linkId: link.id, sourceUrl: link.canonicalUrl, canonicalUrl: 'https://example.com/f07-corrected-private', expectedVersion: 1, checkedAt: at, createdAt: at } })
  const promotion = await db.promotion.create({ data: { tenantId: input.tenantId, linkId: link.id, status: 'PAUSED', surface: 'SEARCH', activatedAt: new Date('2026-10-11T12:00Z'), expiresAt: new Date('2026-10-21T12:00Z'), pauseRevision: 1 } })
  await db.promotionPause.create({ data: { tenantId: input.tenantId, promotionId: promotion.id, revision: 1, startsAt: at, remainingMs: BigInt(7 * 86400000) } })
  return { visualLink: link.id, visualProposal: 'f07-visual-proposal' }
}
