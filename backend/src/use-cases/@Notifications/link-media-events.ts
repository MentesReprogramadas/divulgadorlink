import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { linkNotificationSnapshot } from '@/domain/notifications/link-notification'
import { operationalEvent } from '@/use-cases/@Moderation/resolve-human-review'

export const MEDIA_REVIEW_KIND = 'REVIEW_MEDIA'
export const mediaReviewInclude = { link: { include: { network: true, niche: true, owner: { select: { name: true, status: true } } } } } as const
export type MediaReviewRecord = Prisma.LinkMediaAssetGetPayload<{ include: typeof mediaReviewInclude }>
export function mediaReviewHash(row: MediaReviewRecord) {
  const link = row.link
  return createHash('sha256').update(JSON.stringify([row.id, row.tenantId, row.linkId, row.kind, row.revision, row.alt, link.mediaVersion, link.name, link.description, link.canonicalUrl, link.networkId, link.nicheId, link.status, link.owner?.status])).digest('hex')
}
export function mediaReviewPayload(row: MediaReviewRecord) {
  return { ...linkNotificationSnapshot(row.link), resourceType: 'LINK_MEDIA', mediaKind: row.kind, linkId: row.linkId, version: row.link.mediaVersion, revision: row.revision, alt: row.alt, linkStatus: row.link.status }
}
export async function queueLinkMediaReview(tx: Prisma.TransactionClient, tenantId: string, assetId: string) {
  const row = await tx.linkMediaAsset.findFirst({ where: { id: assetId, tenantId, status: 'PENDING' }, include: mediaReviewInclude })
  if (!row || !['PUBLISHED', 'PENDING_MODERATION'].includes(row.link.status) || row.link.owner?.status === 'BANNED') return
  const snapshotHash = mediaReviewHash(row)
  await operationalEvent(tx, { tenantId, resourceId: row.id, kind: MEDIA_REVIEW_KIND, occurrenceKey: `media-review:${row.id}:${snapshotHash}`, snapshotHash, payload: mediaReviewPayload(row), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
}
export async function queuePendingLinkMediaReviews(tx: Prisma.TransactionClient, tenantId: string, linkId: string) {
  const pending = await tx.linkMediaAsset.findMany({ where: { tenantId, linkId, status: 'PENDING' }, select: { id: true } })
  for (const row of pending) await queueLinkMediaReview(tx, tenantId, row.id)
}
