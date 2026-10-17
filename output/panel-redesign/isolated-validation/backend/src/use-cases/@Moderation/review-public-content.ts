import { Prisma, type PrismaClient, type ContentReview } from '@prisma/client'
import { reviewSummary } from '@/domain/moderation/content-review'
import { profileInput } from '@/domain/profiles/profile-input'
import { visibleProfile } from '@/domain/profiles/profile'
import { destinationInput } from '@/domain/redirects/redirect-input'
import { validateProfile } from '@/use-cases/@Profiles/validate-profile'
import { validateRedirectContent } from '@/use-cases/@Redirects/validate-content'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import type { PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'
import { appeal } from './appeal'
import { contentReviewHash, contentReviewPayload, queueContentReview, CONTENT_REVIEW_KINDS } from '@/use-cases/@Notifications/content-review-events'
import { operationalEvent, ReviewError } from './resolve-human-review'

export class ContentReviewError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}
export type ReviewActor = { tenantId: string; ownerId: string }
async function activeOwner(tx: Prisma.TransactionClient, actor: ReviewActor) {
  const user = await tx.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId }, include: { identifiers: true } })
  if (!user || !canSubmitLinkFromIdentifiers(user.status, user.identifiers)) throw new ContentReviewError(403, 'Confirme seu e-mail e verifique o estado da conta.')
}
export async function assertReviewAdmin(db: Prisma.TransactionClient, actor: ReviewActor) {
  if (!await db.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId, role: 'ADMIN', status: 'ACTIVE' } })) throw new ContentReviewError(403, 'Acesso negado.')
}
async function target(tx: Prisma.TransactionClient, row: ContentReview) {
  if (row.kind === 'PROFILE') {
    const profile = await tx.profile.findFirst({ where: { id: row.profileId!, tenantId: row.tenantId, ownerId: row.ownerId, version: row.version } })
    if (!profile) throw new ContentReviewError(409, 'A página mudou. Analise o envio mais recente.')
    return { profile, redirect: null }
  }
  const redirect = await tx.redirectDestination.findFirst({ where: { id: row.redirectRevisionId!, tenantId: row.tenantId, number: row.version, handle: { tenantId: row.tenantId, ownerId: row.ownerId, version: row.version, disabled: false } } })
  if (!redirect) throw new ContentReviewError(409, 'O convite mudou. Analise o envio mais recente.')
  return { profile: null, redirect }
}
export async function listContentReviews(db: PrismaClient, actor: ReviewActor, kind: 'PROFILE' | 'REDIRECT') {
  await assertReviewAdmin(db, actor)
  const rows = await db.contentReview.findMany({ where: { tenantId: actor.tenantId, kind, status: 'PENDING', owner: { status: 'ACTIVE' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 100, include: { owner: { select: { name: true } } } })
  return { cases: rows.map(row => ({ ...reviewSummary(row), kind: row.kind, ownerName: row.owner.name, snapshot: row.snapshot, appealText: row.appealText, createdAt: row.createdAt })) }
}
export async function appealContentReview(db: PrismaClient, actor: ReviewActor, id: string, text: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.ownerId} AND "tenantId"=${actor.tenantId} FOR UPDATE`
    await activeOwner(tx, actor)
    const row = await tx.contentReview.findFirst({ where: { id, tenantId: actor.tenantId, ownerId: actor.ownerId } })
    if (!row) throw new ContentReviewError(404, 'Revisão não encontrada.')
    if (row.status !== 'REJECTED') throw new ContentReviewError(409, 'Só é possível contestar uma recusa.')
    if (row.appealedAt) throw new ContentReviewError(409, 'Esta recusa já foi contestada.')
    appeal({ alreadyAppealed: Boolean(row.appealedAt), text })
    await target(tx, row)
    const updated = await tx.contentReview.update({ where: { id }, data: { status: 'PENDING', appealedAt: new Date(), appealText: text.trim(), resolvedAt: null } })
    await queueContentReview(tx, updated.id)
    if (row.redirectRevisionId) await tx.redirectDestination.update({ where: { id: row.redirectRevisionId }, data: { status: 'PENDING_REVIEW', resolvedAt: null } })
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'content.review.appeal', entityType: 'ContentReview', entityId: id, after: { version: row.version } } })
    return { review: reviewSummary(updated) }
  })
}
export async function decideContentReview(db: PrismaClient, actor: ReviewActor, id: string, decision: 'APPROVE' | 'REJECT', reason: string | undefined, ports: PublicContentValidationPorts, delivery?: { messageId: string; operatorPhone: string; receiptId: string }) {
  await assertReviewAdmin(db, actor)
  if (decision === 'REJECT' && !reason?.trim()) throw new ContentReviewError(400, 'Informe o motivo da recusa.')
  const row = await db.contentReview.findFirst({ where: { id, tenantId: actor.tenantId } })
  if (!row) throw new ContentReviewError(404, 'Revisão não encontrada.')
  if (row.status !== 'PENDING') throw new ContentReviewError(409, 'Esta revisão já foi resolvida ou substituída.')
  // Human approval replaces the AI verdict only. URL safety, availability, ownership and age remain enforced.
  const profile = decision === 'APPROVE' && row.kind === 'PROFILE' ? await validateProfile(db, row.tenantId, profileInput.parse(row.snapshot), ports, true) : null
  const destination = decision === 'APPROVE' && row.kind === 'REDIRECT' ? await validateRedirectContent(db, row.tenantId, destinationInput.parse(row.snapshot), ports, true) : null
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE "tenantId"=${row.tenantId} AND (id=${row.ownerId} OR id=${actor.ownerId}) ORDER BY id FOR UPDATE`
    await assertReviewAdmin(tx, actor); await activeOwner(tx, { tenantId: row.tenantId, ownerId: row.ownerId })
    if (delivery) {
      await tx.$queryRaw`SELECT id FROM evolution_operators WHERE "tenantId"=${actor.tenantId} AND phone=${delivery.operatorPhone} FOR SHARE`
      const operator = await tx.evolutionOperator.findUnique({ where: { tenantId_phone: { tenantId: actor.tenantId, phone: delivery.operatorPhone } } })
      if (!operator?.enabled || operator.userId !== actor.ownerId) throw new ReviewError(403, 'operator_forbidden')
    }
    const current = await tx.contentReview.findFirst({ where: { id, tenantId: actor.tenantId, status: 'PENDING' } })
    if (!current) throw new ContentReviewError(409, 'Esta revisão já foi resolvida ou substituída.')
    const resource = await target(tx, current)
    if (delivery) {
      const notice = await tx.operationalMessage.findFirst({ where: { id: delivery.messageId, tenantId: actor.tenantId, resourceId: id, kind: { in: CONTENT_REVIEW_KINDS }, state: 'SENT' } })
      if (!notice || notice.consumedAt || !notice.expiresAt || notice.expiresAt <= new Date() || notice.snapshotHash !== contentReviewHash(current)) throw new ReviewError(409, 'review_reference_expired')
      const claimed = await tx.operationalMessage.updateMany({ where: { id: notice.id, consumedAt: null }, data: { consumedAt: new Date() } })
      if (!claimed.count) throw new ReviewError(409, 'review_already_resolved')
    }
    if (profile && resource.profile) {
      const refs = [...new Set(profile.items.filter(item => item.type === 'CATALOG').map(item => item.destination))]
      const links = await tx.link.findMany({ where: { id: { in: refs }, tenantId: row.tenantId, ownerId: row.ownerId, status: 'PUBLISHED', niche: { tenantId: row.tenantId }, network: { tenantId: row.tenantId } }, select: { id: true } })
      if (links.length !== refs.length) throw new ContentReviewError(422, 'Um link do catálogo mudou. Peça a correção antes de aprovar.')
      if (profile.avatarAssetId && !await tx.profileAsset.findUnique({ where: { tenantId_ownerId_id: { tenantId: row.tenantId, ownerId: row.ownerId, id: profile.avatarAssetId } } })) throw new ContentReviewError(422, 'A foto não está mais disponível. Peça um novo envio.')
      await tx.profile.update({ where: { id: resource.profile.id }, data: { publication: visibleProfile(profile, new Set(links.map(link => link.id))), publishedVersion: row.version } })
    }
    if (resource.redirect) {
      await tx.redirectDestination.update({ where: { id: resource.redirect.id }, data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', ...(destination ? { destinationUrl: destination } : {}), errorMessage: decision === 'REJECT' ? reason!.trim() : null, resolvedAt: new Date() } })
      if (decision === 'APPROVE') await tx.redirectHandle.update({ where: { id: resource.redirect.handleId }, data: { activeRevisionId: resource.redirect.id } })
    }
    const updated = await tx.contentReview.update({ where: { id }, data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reason: decision === 'REJECT' ? reason!.trim() : null, resolvedAt: new Date() } })
    const channel = delivery ? 'WHATSAPP' : 'PANEL'
    const audit = await tx.auditLog.create({ data: { tenantId: actor.tenantId, actorId: actor.ownerId, action: 'content.review.decide', entityType: 'ContentReview', entityId: id, requestId: delivery?.receiptId, before: { status: 'PENDING' }, after: { status: updated.status, reason: updated.reason, version: row.version, channel, correlationId: delivery?.messageId ?? id } } })
    const administrator = await tx.user.findUniqueOrThrow({ where: { id: actor.ownerId }, select: { name: true } })
    await operationalEvent(tx, { tenantId: actor.tenantId, kind: 'DECISION', resourceId: id, occurrenceKey: `content-decision:${audit.id}`, payload: { ...await contentReviewPayload(tx, updated), decision, reason: updated.reason, operator: administrator.name, channel, status: updated.status, canAppeal: updated.status === 'REJECTED' && !updated.appealedAt, previousPublished: Boolean(resource.profile?.publishedVersion || (resource.redirect && await tx.redirectHandle.findFirst({ where: { id: resource.redirect.handleId, activeRevisionId: { not: null } } }))), reviewMessageId: delivery?.messageId ?? null } })
    if (delivery) await tx.evolutionReceipt.update({ where: { id: delivery.receiptId }, data: { state: 'DONE', resultCode: updated.status } })
    return { review: reviewSummary(updated) }
  })
}
