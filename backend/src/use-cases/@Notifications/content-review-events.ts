import { createHash } from 'node:crypto'
import type { ContentReview, Prisma } from '@prisma/client'
import { profileInput } from '@/domain/profiles/profile-input'
import { destinationInput } from '@/domain/redirects/redirect-input'
import { operationalEvent } from '@/use-cases/@Moderation/resolve-human-review'

export const CONTENT_REVIEW_KINDS = ['REVIEW_PROFILE', 'REVIEW_REDIRECT']
export function contentReviewHash(row: ContentReview) {
  return createHash('sha256').update(JSON.stringify([row.id, row.tenantId, row.ownerId, row.version, row.snapshot, row.appealedAt?.toISOString() ?? 'submission'])).digest('hex')
}
export async function contentReviewPayload(tx: Prisma.TransactionClient, row: ContentReview) {
  const owner = await tx.user.findUniqueOrThrow({ where: { id: row.ownerId }, select: { name: true } })
  const common = { resourceType: row.kind, ownerName: owner.name ?? 'Não informado', version: row.version, appeal: row.appealText }
  if (row.kind === 'PROFILE') {
    const profile = profileInput.parse(row.snapshot)
    return { ...common, name: profile.name, description: profile.bio, publicPath: `/p/${profile.slug}`, requiresAge: profile.requiresAge,
      groups: profile.categories.filter(group => group.visible).map(group => ({ name: group.name, items: profile.items.filter(item => item.visible && item.categoryId === group.id).map(item => ({ label: item.label, destination: item.type === 'CATALOG' ? `/link/${item.destination}` : item.destination })) })) }
  }
  const destination = destinationInput.parse(row.snapshot)
  return { ...common, name: destination.label, canonicalUrl: destination.destinationUrl, requiresAge: destination.requiresAge }
}
export async function queueContentReview(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.contentReview.findUnique({ where: { id } })
  if (!row || row.status !== 'PENDING') return
  const snapshotHash = contentReviewHash(row)
  await operationalEvent(tx, { tenantId: row.tenantId, resourceId: row.id, kind: row.kind === 'PROFILE' ? 'REVIEW_PROFILE' : 'REVIEW_REDIRECT',
    occurrenceKey: `content-review:${row.id}:${snapshotHash}`, snapshotHash, payload: await contentReviewPayload(tx, row), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
}
