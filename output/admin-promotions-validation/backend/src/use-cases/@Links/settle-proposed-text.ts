import type { PrismaClient } from '@prisma/client'
import { readConfig } from '@/domain/config/read-config'
import { prisma as defaultPrisma } from '@/lib/prisma'
import { PrismaAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { PrismaConfigsRepository } from '@/repositories/configs-repository'
import { decideProposedText, type ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'
import { queueTextReview } from '@/use-cases/@Notifications/evolution-operations'

export async function settleProposedText(input: {
  linkId: string
  judge?: (text: { name: string; description: string; niche: string }) => Promise<ModelVerdict>
  db?: PrismaClient
  finalAttempt?: boolean
}): Promise<'ADMIN' | 'PUBLISH' | 'SKIPPED'> {
  const prisma = input.db ?? defaultPrisma
  const link = await prisma.link.findUnique({ where: { id: input.linkId }, include: { niche: { select: { name: true } } } })
  if (!link || link.status !== 'PUBLISHED') return 'SKIPPED'
  const audits = new PrismaAuditLogsRepository(prisma)
  const proposal = await audits.latest({
    tenantId: link.tenantId,
    entityType: 'link',
    entityId: link.id,
    action: 'link.text.proposed',
  })
  if (!proposal || !proposal.after || typeof proposal.after !== 'object') return 'SKIPPED'
  const settled = await audits.latest({
    tenantId: link.tenantId,
    entityType: 'link',
    entityId: link.id,
    action: 'link.text.verdict',
  })
  if (settled && (!settled.createdAt || !proposal.createdAt || settled.createdAt.getTime() >= proposal.createdAt.getTime())) {
    return 'SKIPPED'
  }
  const after = proposal.after as { name?: unknown; description?: unknown }
  const proposedName = typeof after.name === 'string' ? after.name : link.name
  const proposedDescription = typeof after.description === 'string' ? after.description : link.description
  const config = await new PrismaConfigsRepository(prisma).findByTenantAndKey(link.tenantId, 'MODERATION_AUTO_APPROVE_THRESHOLD')
  const threshold = readConfig(config ? { MODERATION_AUTO_APPROVE_THRESHOLD: config.value } : {}, 'MODERATION_AUTO_APPROVE_THRESHOLD')
  let verdict: ModelVerdict = null
  let providerFailed = false
  if (input.judge) {
    try {
      verdict = await input.judge({ name: proposedName, description: proposedDescription, niche: link.niche.name })
    } catch (error) {
      if (input.finalAttempt === false) throw error
      providerFailed = true
    }
  }
  const decided = decideProposedText({
    publishedName: link.name,
    proposedName,
    blocklisted: false,
    verdict,
    threshold,
  })
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM links WHERE id = ${link.id} FOR UPDATE`
    const current = await tx.link.findUnique({ where: { id: link.id } })
    const latest = await tx.auditLog.findFirst({ where: { tenantId: link.tenantId, entityId: link.id, action: 'link.text.proposed' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
    const resolved = await tx.auditLog.findFirst({ where: { tenantId: link.tenantId, entityId: link.id, action: 'link.text.verdict', createdAt: { gte: proposal.createdAt! } } })
    if (!current || current.status !== 'PUBLISHED' || latest?.id !== proposal.id || resolved) return 'SKIPPED'
    if (decided.decision === 'PUBLISH') {
      await tx.link.update({
        where: { id: link.id },
        data: {
          name: proposedName,
          description: proposedDescription,
          approvedName: proposedName,
          approvedDescription: proposedDescription,
          embeddingState: 'PENDING',
        },
      })
    }
    await tx.auditLog.create({ data: {
      tenantId: link.tenantId,
      actorId: null,
      action: 'link.text.verdict',
      entityType: 'link',
      entityId: link.id,
      before: { name: link.name },
      after: {
        decision: decided.decision,
        provider: providerFailed ? 'error' : decided.provider,
        confidence: verdict?.confidence ?? null,
        threshold,
      },
      requestId: null,
    } })
    if (decided.decision === 'ADMIN') await queueTextReview(tx, link.tenantId, link.id)
    return decided.decision
  })
}
