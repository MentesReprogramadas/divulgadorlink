import { prisma } from '@/lib/prisma'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import type { Prisma, PrismaClient } from '@prisma/client'
import { LinkMediaError, type LinkMediaKind, type PreparedLinkMedia } from '@/domain/links/link-media'
import { MEDIA_REVIEW_KIND, mediaReviewHash, mediaReviewInclude, mediaReviewPayload, queuePendingLinkMediaReviews } from '@/use-cases/@Notifications/link-media-events'
import { operationalEvent, ReviewError } from '@/use-cases/@Moderation/resolve-human-review'
import { settlePendingLinkMedia } from '@/use-cases/@Moderation/settle-link-media'
import { hitsBlocklist } from '@/domain/links/blocklist'

let testDb: PrismaClient | null = null
export function setLinkMediaDbForTest(db: PrismaClient | null) { if (process.env.NODE_ENV === 'test') testDb = db }
export function linkMediaDatabase() { return testDb ?? prisma }

export type LinkMediaActor = { tenantId: string; ownerId: string; admin?: boolean; auditActorId?: string }
export type MediaMutation = { type: 'PUT'; media: PreparedLinkMedia } | { type: 'REMOVE'; kind: LinkMediaKind } | { type: 'DECIDE'; assetId: string; decision: 'APPROVE' | 'REJECT'; reason?: string }
export function mediaPath(linkId: string, id: string) { return `/api/v1/links/${encodeURIComponent(linkId)}/media/${encodeURIComponent(id)}` }
export async function readApprovedLinkMedia(db: Prisma.TransactionClient, tenantId: string, linkIds: string[]) {
  const result = new Map<string, { iconUrl?: string; imageUrl?: string; imageAlt?: string | null }>()
  if (!linkIds.length) return result
  const rows = await db.linkMediaAsset.findMany({ where: { tenantId, linkId: { in: linkIds }, status: 'APPROVED' }, select: { id: true, linkId: true, kind: true, alt: true } })
  for (const row of rows) {
    const previous = result.get(row.linkId) ?? {}
    result.set(row.linkId, { ...previous, ...(row.kind === 'ICON' ? { iconUrl: mediaPath(row.linkId, row.id) } : { imageUrl: mediaPath(row.linkId, row.id), imageAlt: row.alt }) })
  }
  return result
}
export async function insertLinkMedia(db: Prisma.TransactionClient, tenantId: string, linkId: string, media: PreparedLinkMedia[], revision = 1) {
  const config = media.length ? await db.config.findUnique({ where: { tenantId_key: { tenantId, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } } }) : null
  const zero = Boolean(config?.value.trim()) && Number(config?.value) === 0
  const terms = zero ? await db.blocklistTerm.findMany({ where: { tenantId }, select: { term: true } }) : []
  for (const row of media) {
    const approved = zero && !hitsBlocklist({ text: row.alt ?? '', selectedNiche: '', nicheNames: [], terms: terms.map(term => term.term) })
    if (approved) await db.linkMediaAsset.deleteMany({ where: { tenantId, linkId, kind: row.kind, status: 'APPROVED' } })
    const asset = await db.linkMediaAsset.create({ data: { ...row, tenantId, linkId, revision, status: approved ? 'APPROVED' : 'PENDING' } })
    if (approved) await db.auditLog.create({ data: { tenantId, actorId: null, entityType: 'link', entityId: linkId, action: 'link.media.ai', after: { assetId: asset.id, kind: row.kind, revision, threshold: 0, decision: 'PUBLISH' } } })
  }
  if (media.length) await db.link.update({ where: { id: linkId }, data: { mediaVersion: revision } })
}
export async function mutateLinkMedia(db: PrismaClient, actor: LinkMediaActor, linkId: string, expectedVersion: number, mutation: MediaMutation, delivery?: { messageId: string; operatorPhone: string; receiptId: string }) {
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM links WHERE id=${linkId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    const link = await tx.link.findFirst({ where: { id: linkId, tenantId: actor.tenantId, ...(!actor.admin ? { ownerId: actor.ownerId } : {}) }, include: { owner: { include: { identifiers: true } } } })
    if (!link) throw new LinkMediaError(404, 'Link não encontrado.')
    if (!actor.admin && (!link.owner || !canSubmitLinkFromIdentifiers(link.owner.status, link.owner.identifiers))) throw new LinkMediaError(403, 'Confirme seu e-mail e verifique o estado da conta.')
    const rejectionCleanup = actor.admin && mutation.type === 'DECIDE' && mutation.decision === 'REJECT'
    if (!rejectionCleanup && (link.owner?.status === 'BANNED' || !['PUBLISHED','PENDING_MODERATION'].includes(link.status))) throw new LinkMediaError(403, 'Este link não pode alterar anexos agora.')
    if (link.mediaVersion !== expectedVersion) throw new LinkMediaError(409, 'Os anexos mudaram. Atualize a página e tente novamente.')
    if (mutation.type === 'DECIDE' && !actor.admin) throw new LinkMediaError(403, 'Acesso negado.')
    const pending = mutation.type === 'DECIDE' ? await tx.linkMediaAsset.findFirst({ where: { id: mutation.assetId, linkId, tenantId: actor.tenantId, status: 'PENDING' }, include: mediaReviewInclude }) : null
    if (mutation.type === 'DECIDE' && !pending) throw new LinkMediaError(409, 'Este anexo já foi substituído ou analisado.')
    if (delivery) {
      const administrator = await tx.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId, role: 'ADMIN', status: 'ACTIVE' } })
      await tx.$queryRaw`SELECT id FROM evolution_operators WHERE "tenantId"=${actor.tenantId} AND phone=${delivery.operatorPhone} FOR SHARE`
      const operator = await tx.evolutionOperator.findUnique({ where: { tenantId_phone: { tenantId: actor.tenantId, phone: delivery.operatorPhone } } })
      if (!administrator || !operator?.enabled || operator.userId !== administrator.id) throw new ReviewError(403, 'operator_forbidden')
      const notice = await tx.operationalMessage.findFirst({ where: { id: delivery.messageId, tenantId: actor.tenantId, kind: MEDIA_REVIEW_KIND, resourceId: pending?.id, state: 'SENT' } })
      if (!pending || !notice || notice.consumedAt || !notice.expiresAt || notice.expiresAt <= new Date() || notice.snapshotHash !== mediaReviewHash(pending)) throw new ReviewError(409, 'review_reference_expired')
      const claimed = await tx.operationalMessage.updateMany({ where: { id: notice.id, consumedAt: null }, data: { consumedAt: new Date() } })
      if (!claimed.count) throw new ReviewError(409, 'review_already_resolved')
    }
    const kind = mutation.type === 'PUT' ? mutation.media.kind : mutation.type === 'REMOVE' ? mutation.kind : pending!.kind
    if (mutation.type === 'PUT') {
      await tx.linkMediaAsset.deleteMany({ where: { tenantId: actor.tenantId, linkId, kind, status: 'PENDING' } })
      await insertLinkMedia(tx, actor.tenantId, linkId, [mutation.media], expectedVersion + 1)
    } else if (mutation.type === 'REMOVE') {
      await tx.linkMediaAsset.deleteMany({ where: { tenantId: actor.tenantId, linkId, kind } })
    } else if (mutation.decision === 'APPROVE') {
      await tx.linkMediaAsset.deleteMany({ where: { tenantId: actor.tenantId, linkId, kind, status: 'APPROVED' } })
      await tx.linkMediaAsset.update({ where: { id: pending!.id }, data: { status: 'APPROVED' } })
    } else {
      if (!mutation.reason?.trim()) throw new LinkMediaError(400, 'Informe o motivo da rejeição.')
      await tx.linkMediaAsset.delete({ where: { id: pending!.id } })
    }
    const action = mutation.type === 'PUT' ? 'propose' : mutation.type === 'REMOVE' ? 'remove' : mutation.decision === 'APPROVE' ? 'approve' : 'reject'
    const audit = await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.auditActorId ?? actor.ownerId, entityType: 'link', entityId: linkId, action: 'link.media.' + action, before: { version: expectedVersion }, after: { version: expectedVersion + 1, kind, ...(pending ? { assetId: pending.id, revision: pending.revision } : {}), ...(mutation.type === 'DECIDE' && mutation.reason ? { reason: mutation.reason } : {}), ...(delivery ? { channel: 'WHATSAPP', reviewMessageId: delivery.messageId } : {}) } } })
    if (mutation.type === 'DECIDE' && pending) {
      const operator = await tx.user.findFirst({ where: { id: actor.auditActorId ?? actor.ownerId, tenantId: actor.tenantId }, select: { name: true } })
      const previousApproved = mutation.decision === 'REJECT' && Boolean(await tx.linkMediaAsset.findFirst({ where: { tenantId: actor.tenantId, linkId, kind, status: 'APPROVED' }, select: { id: true } }))
      await tx.operationalMessage.updateMany({ where: { tenantId: actor.tenantId, kind: MEDIA_REVIEW_KIND, resourceId: pending.id, consumedAt: null }, data: { consumedAt: new Date() } })
      await operationalEvent(tx, { tenantId: actor.tenantId, kind: 'DECISION', resourceId: pending.id, occurrenceKey: `media-decision:${audit.id}`, payload: { ...mediaReviewPayload(pending), decision: mutation.decision, reason: mutation.reason ?? null, previousApproved, operator: operator?.name ?? 'Administrador', channel: delivery ? 'WHATSAPP' : 'PANEL', status: mutation.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewMessageId: delivery?.messageId ?? null } })
      if (delivery) await tx.evolutionReceipt.update({ where: { id: delivery.receiptId }, data: { state: 'DONE', resultCode: mutation.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED' } })
    }
    await tx.link.update({ where: { id: linkId }, data: { mediaVersion: expectedVersion + 1 } })
    if (mutation.type !== 'PUT') await queuePendingLinkMediaReviews(tx, actor.tenantId, linkId)
    return { version: expectedVersion + 1 }
  })
  if (mutation.type === 'PUT') {
    await settlePendingLinkMedia(db, actor.tenantId, linkId)
    const link = await db.link.findUniqueOrThrow({ where: { id: linkId } })
    return { version: link.mediaVersion }
  }
  return result
}
