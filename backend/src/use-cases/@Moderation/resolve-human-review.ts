import { createHash } from 'node:crypto'
import { Prisma, type PrismaClient, type Link } from '@prisma/client'
import { decideCase } from './decide-case'
import { linkMachine, transition } from '@/domain/state/transition'
import { shouldEnqueueEmbedLink } from '@/adapters/queues/enqueue-embed-link'

export type ReviewDecision = {
  decision: 'APPROVE' | 'REJECT'; reason?: string; name?: string; description?: string;
  networkId?: string; nicheId?: string;
  newNiche?: { name: string; kind?: 'SCAM' | 'PERSONAL_DATA' | 'MINOR' | 'NORMAL'; requiresAge: boolean };
}
export class ReviewError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code) }
}

export function reviewHash(link: Pick<Link, 'id' | 'name' | 'description' | 'canonicalUrl' | 'networkId' | 'nicheId' | 'status'>, revision: string): string {
  return createHash('sha256').update(JSON.stringify([link.id, link.name, link.description, link.canonicalUrl, link.networkId, link.nicheId, link.status, revision])).digest('hex')
}

export async function operationalEvent(tx: Prisma.TransactionClient, input: {
  tenantId: string; occurrenceKey: string; kind: string; resourceId: string; payload: Prisma.InputJsonValue;
  snapshotHash?: string; expiresAt?: Date; nextAttemptAt?: Date;
  state?: string;
}) {
  return tx.operationalMessage.upsert({ where: { occurrenceKey: input.occurrenceKey }, create: input, update: {} })
}

export async function pendingText(tx: Prisma.TransactionClient, tenantId: string, linkId: string) {
  const proposal = await tx.auditLog.findFirst({ where: { tenantId, entityId: linkId, action: 'link.text.proposed' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
  if (!proposal) return null
  const verdict = await tx.auditLog.findFirst({ where: { tenantId, entityId: linkId, action: 'link.text.verdict', createdAt: { gte: proposal.createdAt } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
  if (!verdict || (verdict.after as { decision?: string } | null)?.decision !== 'ADMIN') return null
  return proposal
}

export async function resolveHumanReview(db: PrismaClient, input: {
  tenantId: string; actorId: string; reviewId: string; fields: ReviewDecision; channel: 'PANEL' | 'WHATSAPP';
  requestId: string; messageId?: string; operatorPhone?: string; receiptId?: string;
}) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.actorId} FOR SHARE`
    const actor = await tx.user.findFirst({ where: { id: input.actorId, tenantId: input.tenantId, role: 'ADMIN', status: 'ACTIVE' } })
    if (!actor) throw new ReviewError(403, 'operator_forbidden')
    if (input.operatorPhone) {
      await tx.$queryRaw`SELECT id FROM evolution_operators WHERE "tenantId" = ${input.tenantId} AND phone = ${input.operatorPhone} FOR SHARE`
      const operator = await tx.evolutionOperator.findUnique({ where: { tenantId_phone: { tenantId: input.tenantId, phone: input.operatorPhone } } })
      if (!operator?.enabled || operator.userId !== actor.id) throw new ReviewError(403, 'operator_forbidden')
    }
    const isText = input.reviewId.startsWith('text:')
    const review = isText
      ? await tx.auditLog.findFirst({ where: { id: input.reviewId.slice(5), tenantId: input.tenantId, action: 'link.text.proposed' } })
      : await tx.moderationCase.findFirst({ where: { id: input.reviewId, tenantId: input.tenantId } })
    if (!review) throw new ReviewError(404, 'review_not_found')
    const linkId = 'linkId' in review ? review.linkId : review.entityId
    await tx.$queryRaw`SELECT id FROM links WHERE id = ${linkId} FOR UPDATE`
    const link = await tx.link.findFirst({ where: { id: linkId, tenantId: input.tenantId } })
    if (!link) throw new ReviewError(404, 'review_not_found')
    let proposed: { name?: string; description?: string } | null = null
    let revision: string
    if (isText) {
      const current = await pendingText(tx, input.tenantId, link.id)
      if (!current || current.id !== review.id || link.status !== 'PUBLISHED') throw new ReviewError(409, 'review_already_resolved')
      proposed = current.after as { name?: string; description?: string } | null
      revision = current.id
    } else {
      const current = await tx.moderationCase.findUnique({ where: { id: review.id } })
      if (!current || current.closedAt || link.status !== 'PENDING_MODERATION') throw new ReviewError(409, 'review_already_resolved')
      revision = `${current.id}:${current.appealedAt?.toISOString() ?? 'submission'}`
    }
    if (input.channel === 'WHATSAPP' && input.fields.decision === 'REJECT' && !input.fields.reason?.trim()) throw new ReviewError(400, 'reason_required')
    if (input.messageId) {
      const event = await tx.operationalMessage.findFirst({ where: { id: input.messageId, tenantId: input.tenantId } })
      if (!event || event.consumedAt || !event.expiresAt || event.expiresAt <= new Date() || event.snapshotHash !== reviewHash(link, revision)) throw new ReviewError(409, 'review_reference_expired')
      const claimed = await tx.operationalMessage.updateMany({ where: { id: event.id, consumedAt: null }, data: { consumedAt: new Date() } })
      if (!claimed.count) throw new ReviewError(409, 'review_already_resolved')
    }
    const body = input.fields
    let result: ReturnType<typeof decideCase>
    try {
      result = decideCase({ decision: body.decision, url: link.canonicalUrl, creatingNiche: Boolean(body.newNiche), nicheKind: body.newNiche?.kind ?? 'NORMAL', requiresAge: body.newNiche?.requiresAge, wasPublished: link.everPublished })
    } catch { throw new ReviewError(400, 'invalid_decision') }
    let nicheId = body.nicheId ?? link.nicheId
    if (body.newNiche) {
      const slug = body.newNiche.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const niche = await tx.niche.create({ data: { tenantId: link.tenantId, name: body.newNiche.name, slug, requiresAge: body.newNiche.requiresAge, isPublicFacet: !body.newNiche.requiresAge } })
      nicheId = niche.id
    }
    if (!await tx.niche.findFirst({ where: { id: nicheId, tenantId: link.tenantId } }) || !await tx.network.findFirst({ where: { id: body.networkId ?? link.networkId, tenantId: link.tenantId } })) throw new ReviewError(400, 'invalid_facet')
    if (link.status !== result.status) transition(linkMachine, link.status, result.status)
    const approved = body.decision === 'APPROVE'
    const name = approved ? (body.name || proposed?.name) ?? link.name : link.approvedName ?? link.name
    const description = approved ? (body.description || proposed?.description) ?? link.description : link.approvedDescription ?? link.description
    const updated = await tx.link.update({ where: { id: link.id }, data: {
      status: result.status, occupiesSlot: result.occupiesSlot,
      ...(result.status === 'PUBLISHED' ? { name, description, approvedName: name, approvedDescription: description, everPublished: true } : {}),
      ...(approved ? { networkId: body.networkId ?? link.networkId, nicheId } : {}),
    } })
    if (shouldEnqueueEmbedLink(link, updated)) {
      await tx.link.update({ where: { id: link.id }, data: { embeddingState: 'PENDING' } })
      await tx.embeddingJob.create({ data: { tenantId: link.tenantId, linkId: link.id, snapshotName: updated.name, snapshotDescription: updated.description, snapshotNetworkId: updated.networkId, snapshotNicheId: updated.nicheId } })
    }
    if (!isText) await tx.moderationCase.update({ where: { id: review.id }, data: { closedAt: new Date() } })
    else await tx.auditLog.create({ data: { tenantId: link.tenantId, actorId: actor.id, action: 'link.text.verdict', entityType: 'link', entityId: link.id, after: { decision: approved ? 'PUBLISH' : 'REJECT', proposalId: review.id } } })
    if (result.requiresAge) await tx.niche.update({ where: { id: nicheId }, data: { isPublicFacet: false } })
    if (link.status !== 'PUBLISHED' && updated.status === 'PUBLISHED') {
      await tx.funnelEvent.upsert({ where: { tenantId_eventId: { tenantId: link.tenantId, eventId: `${link.id}:published` } }, create: { tenantId: link.tenantId, eventId: `${link.id}:published`, name: 'LinkPublished', userId: link.ownerId, linkId: link.id }, update: {} })
    }
    const audit = await tx.auditLog.create({ data: { tenantId: link.tenantId, actorId: actor.id, action: 'moderation.decide', entityType: isText ? 'TextProposal' : 'ModerationCase', entityId: review.id, requestId: input.requestId,
      before: { status: link.status, name: link.name, description: link.description, canonicalUrl: link.canonicalUrl },
      after: { status: updated.status, name: updated.name, description: updated.description, reason: body.reason ?? null, channel: input.channel, correlationId: input.messageId ?? input.requestId },
    } })
    await operationalEvent(tx, { tenantId: link.tenantId, kind: 'DECISION', resourceId: review.id, occurrenceKey: `decision:${audit.id}`, payload: { name: link.name, decision: body.decision, reason: body.reason ?? null, operator: actor.name, channel: input.channel, status: updated.status } })
    await operationalEvent(tx, { tenantId: link.tenantId, kind: 'MODERATION_EMAIL', resourceId: link.id, occurrenceKey: `moderation-email:${audit.id}`, state: input.channel === 'PANEL' ? 'WAITING_API' : 'PENDING', payload: { outcome: approved ? 'published' : updated.status === 'PRE_REJECTED' ? 'rejected' : 'change_rejected' } })
    if (input.receiptId) await tx.evolutionReceipt.update({ where: { id: input.receiptId }, data: { state: 'DONE', resultCode: updated.status } })
    return { id: input.reviewId, linkId: link.id, status: updated.status, url: link.canonicalUrl, occupiesSlot: updated.occupiesSlot }
  }, { timeout: 15_000 })
}
