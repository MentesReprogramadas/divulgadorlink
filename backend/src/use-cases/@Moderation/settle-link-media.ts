import type { PrismaClient } from '@prisma/client'
import { env } from '@/env'
import { OpenAiTextModeration } from '@/adapters/moderation/openai-text-moderation'
import { applyAiVerdict, explainAiVerdict } from '@/domain/moderation/ai-verdict'
import { hitsBlocklist } from '@/domain/links/blocklist'
import { avatarContentType } from '@/domain/profiles/avatar-webp'
import { canSubmitLinkFromIdentifiers } from '@/use-cases/@Auth/confirm-identifier'
import { operationalEvent } from './resolve-human-review'
import { mediaReviewPayload, MEDIA_REVIEW_KIND, queueLinkMediaReview } from '@/use-cases/@Notifications/link-media-events'
import type { PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'
import type { ModelVerdict } from '@/use-cases/@Links/proposed-text-decision'

const include = { link: { include: { network: true, niche: true, owner: { include: { identifiers: true } } } } } as const
const thresholdOf = (value?: string | null) => value?.trim() && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1 ? Number(value) : null

export async function settlePendingLinkMedia(db: PrismaClient, tenantId: string, linkId: string, ports?: Pick<PublicContentValidationPorts, 'judge'>) {
  const pending = await db.linkMediaAsset.findMany({ where: { tenantId, linkId, status: 'PENDING' }, include })
  for (const row of pending) {
    if (!['PUBLISHED', 'PENDING_MODERATION'].includes(row.link.status) || row.link.owner && !canSubmitLinkFromIdentifiers(row.link.owner.status, row.link.owner.identifiers)) continue
    const config = await db.config.findUnique({ where: { tenantId_key: { tenantId, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } } })
    const threshold = thresholdOf(config?.value)
    const terms = await db.blocklistTerm.findMany({ where: { tenantId }, select: { term: true } })
    const blocked = hitsBlocklist({ text: row.alt ?? '', selectedNiche: '', nicheNames: [], terms: terms.map(term => term.term) })
    let verdict: ModelVerdict = null
    if (!blocked && threshold !== null && threshold > 0) {
      try {
        const input = { name: row.link.name, description: row.alt ?? 'Ícone do link', niche: 'Anexo de link: avaliar conteúdo visual permitido e o texto da imagem', images: [{ base64: Buffer.from(row.bytes).toString('base64'), mimeType: avatarContentType(Buffer.from(row.bytes)), label: row.kind === 'ICON' ? 'Ícone' : 'Imagem do link' }] }
        verdict = ports ? await ports.judge(input) : env.OPENAI_API_KEY ? await new OpenAiTextModeration(env.OPENAI_API_KEY).judgeProfile(input) : null
      } catch { /* Keep the pending asset and the existing human review. */ }
    }
    await db.$transaction(async tx => {
      if (row.link.ownerId) await tx.$queryRaw`SELECT id FROM users WHERE id=${row.link.ownerId} AND "tenantId"=${tenantId} FOR UPDATE`
      await tx.$queryRaw`SELECT id FROM links WHERE id=${linkId} AND "tenantId"=${tenantId} FOR UPDATE`
      const current = await tx.linkMediaAsset.findFirst({ where: { id: row.id, tenantId, linkId, status: 'PENDING' }, include })
      if (!current || !['PUBLISHED', 'PENDING_MODERATION'].includes(current.link.status) || current.link.owner && !canSubmitLinkFromIdentifiers(current.link.owner.status, current.link.owner.identifiers)) return
      const policy = await tx.config.findUnique({ where: { tenantId_key: { tenantId, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } } })
      if (thresholdOf(policy?.value) !== threshold) return
      const currentTerms = await tx.blocklistTerm.findMany({ where: { tenantId }, select: { term: true } })
      const contentBlocked = blocked || hitsBlocklist({ text: current.alt ?? '', selectedNiche: '', nicheNames: [], terms: currentTerms.map(term => term.term) })
      const approved = !contentBlocked && threshold !== null && applyAiVerdict(verdict, threshold) === 'PUBLISH'
      const explanation = { threshold, confidence: verdict?.confidence ?? null, reasons: verdict?.reasons ?? [], decisionReason: contentBlocked ? 'Conteúdo bloqueado. Encaminhado para revisão humana.' : explainAiVerdict(verdict, threshold) }
      const audit = await tx.auditLog.create({ data: { tenantId, actorId: null, entityType: 'link', entityId: linkId, action: 'link.media.ai', after: { assetId: row.id, kind: row.kind, decision: approved ? 'PUBLISH' : 'ADMIN', ...explanation } } })
      if (approved) {
        await tx.linkMediaAsset.deleteMany({ where: { tenantId, linkId, kind: row.kind, status: 'APPROVED' } })
        await tx.linkMediaAsset.update({ where: { id: row.id }, data: { status: 'APPROVED' } })
        await tx.link.update({ where: { id: linkId }, data: { mediaVersion: { increment: 1 } } })
        await tx.operationalMessage.updateMany({ where: { tenantId, kind: MEDIA_REVIEW_KIND, resourceId: row.id, consumedAt: null }, data: { consumedAt: new Date(), state: 'CANCELLED' } })
      } else await queueLinkMediaReview(tx, tenantId, row.id)
      await operationalEvent(tx, { tenantId, resourceId: row.id, kind: approved ? 'AI_APPROVED' : 'AI_REVIEWED', occurrenceKey: `media-ai:${audit.id}`, payload: { ...mediaReviewPayload(current), ...explanation, type: 'Anexo de link', decision: approved ? 'PUBLISH' : 'ADMIN' } })
    })
  }
}
