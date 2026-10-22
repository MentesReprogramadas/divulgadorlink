import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { applyAiVerdict, explainAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'
import { prisma } from '@/lib/prisma'
import { operationalEvent } from './resolve-human-review'
import type { PrismaClient } from '@prisma/client'
import { aiApprovalSnapshot, type AiApprovalEvidence } from '@/domain/notifications/ai-approval'
import { linkNotificationSnapshot } from '@/domain/notifications/link-notification'

export type SubmissionSnapshot = {
  status: string
  name: string
  description: string
  nicheName: string
  tenantId: string
}

export type SubmissionReviewEvidence = { verdict: ModelVerdict; threshold: number | null; decisionReason: string }

type Judge = (text: { name: string; description: string; niche: string }) => Promise<ModelVerdict>

export async function settleSubmission(input: {
  linkId: string
  judge: Judge | null
  finalAttempt?: boolean
  load: (linkId: string) => Promise<SubmissionSnapshot | null>
  readThreshold: (tenantId: string) => Promise<number | null>
  publish: (linkId: string, evidence: AiApprovalEvidence) => Promise<void>
  recordReview?: (linkId: string, evidence: SubmissionReviewEvidence) => Promise<void>
}): Promise<'PUBLISH' | 'ADMIN' | 'SKIPPED'> {
  const row = await input.load(input.linkId)
  if (!row || row.status !== 'PENDING_MODERATION') return 'SKIPPED'
  const threshold = await input.readThreshold(row.tenantId)
  let verdict: ModelVerdict = null
  const review = async () => {
    await input.recordReview?.(input.linkId, { verdict, threshold, decisionReason: explainAiVerdict(verdict, threshold) })
    return 'ADMIN' as const
  }
  if (threshold === null || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) return review()
  if (threshold === 0) {
    await input.publish(input.linkId, { verdict: null, threshold })
    return 'PUBLISH'
  }
  if (!input.judge) return review()
  try {
    verdict = await input.judge({ name: row.name, description: row.description, niche: row.nicheName })
  } catch (error) {
    if (input.finalAttempt === false) throw error
    return review()
  }
  const decision = applyAiVerdict(verdict, threshold)
  if (decision !== 'PUBLISH') return review()
  await input.publish(input.linkId, { verdict, threshold })
  return decision
}

export async function publishSubmission(linkId: string, evidence: AiApprovalEvidence, db: PrismaClient = prisma): Promise<void> {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM links WHERE id = ${linkId} FOR UPDATE`
    const link = await tx.link.findUnique({ where: { id: linkId }, include: { owner: { select: { name: true } }, network: true, niche: true } })
    if (!link || link.status !== 'PENDING_MODERATION') return
    await tx.link.update({ where: { id: link.id }, data: { status: 'PUBLISHED', occupiesSlot: true, everPublished: true, approvedName: link.name, approvedDescription: link.description, embeddingState: 'PENDING' } })
    await tx.embeddingJob.create({ data: { tenantId: link.tenantId, linkId: link.id, snapshotName: link.name, snapshotDescription: link.description, snapshotNetworkId: link.networkId, snapshotNicheId: link.nicheId } })
    await tx.moderationCase.updateMany({ where: { linkId: link.id, closedAt: null }, data: { closedAt: new Date() } })
    await tx.funnelEvent.upsert({ where: { tenantId_eventId: { tenantId: link.tenantId, eventId: `${link.id}:published` } }, create: { tenantId: link.tenantId, eventId: `${link.id}:published`, name: 'LinkPublished', userId: link.ownerId, linkId: link.id }, update: {} })
    const explanation = aiApprovalSnapshot(evidence)
    const audit = await tx.auditLog.create({ data: { tenantId: link.tenantId, actorId: null, action: 'moderation.ai', entityType: 'Link', entityId: link.id, before: { status: 'PENDING_MODERATION' }, after: { status: 'PUBLISHED', decision: 'PUBLISH', ...explanation } } })
    await operationalEvent(tx, { tenantId: link.tenantId, kind: 'AI_APPROVED', resourceId: link.id, occurrenceKey: `ai-approved:${audit.id}`, payload: { ...linkNotificationSnapshot(link), ...explanation, type: 'Novo link' } })
    await operationalEvent(tx, { tenantId: link.tenantId, kind: 'MODERATION_EMAIL', resourceId: link.id, occurrenceKey: `moderation-email:${audit.id}`, payload: { outcome: 'published' } })
  })
}

export async function recordSubmissionReview(linkId: string, evidence: SubmissionReviewEvidence, db: PrismaClient = prisma): Promise<void> {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM links WHERE id = ${linkId} FOR UPDATE`
    const link = await tx.link.findUnique({ where: { id: linkId }, include: { owner: { select: { name: true } }, network: true, niche: true } })
    if (!link || link.status !== 'PENDING_MODERATION') return
    const explanation = { decision: 'ADMIN', confidence: evidence.verdict?.confidence ?? null, threshold: evidence.threshold, reasons: evidence.verdict?.reasons ?? [], decisionReason: evidence.decisionReason }
    await tx.auditLog.create({ data: { tenantId: link.tenantId, actorId: null, action: 'moderation.ai', entityType: 'Link', entityId: linkId, after: explanation } })
    await operationalEvent(tx, { tenantId: link.tenantId, kind: 'AI_REVIEWED', resourceId: linkId, occurrenceKey: `ai-review:${link.id}:${link.updatedAt.toISOString()}:${evidence.threshold}`, payload: { ...linkNotificationSnapshot(link), ...explanation, type: 'Novo link' } })
  })
}
