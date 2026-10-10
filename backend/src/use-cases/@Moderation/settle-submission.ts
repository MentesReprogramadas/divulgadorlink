import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { applyAiVerdict } from '@/use-cases/@Moderation/apply-ai-verdict'
import { prisma } from '@/lib/prisma'
import { PrismaLinksRepository } from '@/repositories/links-repository'
import { getModerationCasesRepository } from '@/repositories/moderation-cases-repository'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { getAcquisitionStore } from '@/use-cases/@Acquisition/record-funnel'
import { notifyModeration } from '@/adapters/notifications/outbound-mail'
import { logDomainEvent } from '@/observability/logger'

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
  publish: (linkId: string) => Promise<void>
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
  if (decision === 'PUBLISH') await input.publish(input.linkId)
  return decision
}

export async function publishSubmission(linkId: string): Promise<void> {
  const link = await prisma.link.findUnique({
    where: { id: linkId },
    include: {
      tenant: { select: { name: true, host: true } },
      owner: { include: { identifiers: true } },
    },
  })
  if (!link || link.status !== 'PENDING_MODERATION') return
  await new PrismaLinksRepository(prisma).updateLinkModeration(link.id, {
    status: 'PUBLISHED',
    occupiesSlot: true,
    name: link.name,
    description: link.description,
  })
  const open = await getModerationCasesRepository().findOpenByLinkId(link.id)
  if (open) await getModerationCasesRepository().close(open.id)
  try {
    await getAcquisitionStore().recordFunnel({
      tenantId: link.tenantId,
      eventId: `${link.id}:published`,
      name: 'LinkPublished',
      userId: link.ownerId,
      linkId: link.id,
    })
  } catch (error) {
    logDomainEvent('moderation.publish.funnel', { result: error instanceof Error ? error.message : 'funil' })
  }
  const email = link.owner?.identifiers.find((row) => row.kind === 'EMAIL' && row.replacedAt === null)?.normalizedValue ?? null
  await notifyModeration({
    to: email,
    name: link.tenant.name,
    host: link.tenant.host,
    linkName: link.name,
    outcome: 'published',
  })
  await getAuditLogsRepository().create({
    tenantId: link.tenantId,
    actorId: null,
    action: 'moderation.ai',
    entityType: 'Link',
    entityId: link.id,
    before: { status: 'PENDING_MODERATION' },
    after: { status: 'PUBLISHED' },
    requestId: null,
  })
}
