import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'
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

type Judge = (text: { name: string; description: string; niche: string }) => Promise<ModelVerdict>

export async function settleSubmission(input: {
  linkId: string
  judge: Judge | null
  finalAttempt?: boolean
  load: (linkId: string) => Promise<SubmissionSnapshot | null>
  readThreshold: (tenantId: string) => Promise<number | null>
  publish: (linkId: string, evidence: AiApprovalEvidence) => Promise<void>
}): Promise<'PUBLISH' | 'ADMIN' | 'SKIPPED'> {
  const row = await input.load(input.linkId)
  if (!row || row.status !== 'PENDING_MODERATION') return 'SKIPPED'
  if (!input.judge) return 'ADMIN'
  let verdict: ModelVerdict = null
  try {
    verdict = await input.judge({ name: row.name, description: row.description, niche: row.nicheName })
  } catch (error) {
    if (input.finalAttempt === false) throw error
    return 'ADMIN'
  }
  const threshold = await input.readThreshold(row.tenantId)
  if (threshold === null) return 'ADMIN'
  const decision = applyAiVerdict(verdict, threshold)
  if (decision === 'PUBLISH' && verdict) await input.publish(input.linkId, { verdict, threshold })
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
    const audit = await tx.auditLog.create({ data: { tenantId: link.tenantId, actorId: null, action: 'moderation.ai', entityType: 'Link', entityId: link.id, before: { status: 'PENDING_MODERATION' }, after: { status: 'PUBLISHED', ...explanation } } })
    await operationalEvent(tx, { tenantId: link.tenantId, kind: 'AI_APPROVED', resourceId: link.id, occurrenceKey: `ai-approved:${audit.id}`, payload: { ...linkNotificationSnapshot(link), ...explanation, type: 'Novo link' } })
    await operationalEvent(tx, { tenantId: link.tenantId, kind: 'MODERATION_EMAIL', resourceId: link.id, occurrenceKey: `moderation-email:${audit.id}`, payload: { outcome: 'published' } })
  })
}
