import type { Prisma, PrismaClient, OperationalMessage } from '@prisma/client'
import { z } from 'zod'
import { env } from '@/env'
import { actionReference, matchesReference, safeText } from '@/domain/notifications/evolution-command'
import { operationalEvent, pendingText, resolveHumanReview, ReviewError, reviewHash } from '@/use-cases/@Moderation/resolve-human-review'
import { deliverEmail } from '@/adapters/notifications/outbound-mail'
import { emailBrand, moderationEmail, type ModerationOutcome } from '@/adapters/notifications/email/templates'
import { logDomainEvent } from '@/observability/logger'

const settingsSchema = z.object({ enabled: z.boolean().default(true), actionsEnabled: z.boolean().default(true) }).strict()
export const EVOLUTION_SETTINGS_KEY = 'EVOLUTION_INTEGRATION'
export const MAX_DELIVERY_ATTEMPTS = 5
export const REFERENCE_TTL_MS = 24 * 60 * 60 * 1000

export async function evolutionConfiguration(db: PrismaClient, tenantId: string) {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant || tenant.host !== env.TENANT_HOST) return null
  const stored = await db.config.findUnique({ where: { tenantId_key: { tenantId, key: EVOLUTION_SETTINGS_KEY } } })
  let settings: z.infer<typeof settingsSchema>
  try { settings = settingsSchema.parse(stored ? JSON.parse(stored.value) : {}) } catch { return null }
  const configured = Boolean(env.EVOLUTION_BASE_URL && env.EVOLUTION_INSTANCE_NAME && env.EVOLUTION_API_KEY && env.EVOLUTION_GROUP_JID && env.EVOLUTION_WEBHOOK_AUTH_SECRET)
  return { configured, enabled: configured && env.EVOLUTION_ENABLED === '1' && settings.enabled,
    actionsEnabled: configured && env.EVOLUTION_ENABLED === '1' && env.EVOLUTION_ACTIONS_ENABLED === '1' && settings.enabled && settings.actionsEnabled,
    baseUrl: env.EVOLUTION_BASE_URL ?? '', instance: env.EVOLUTION_INSTANCE_NAME ?? '', group: env.EVOLUTION_GROUP_JID ?? '',
    apiKey: env.EVOLUTION_API_KEY ?? '', secret: env.EVOLUTION_WEBHOOK_AUTH_SECRET ?? '',
    phones: (env.EVOLUTION_OPERATOR_PHONES ?? '').split(',').map(p => p.trim()).filter(p => /^\d{10,15}$/.test(p)), tenant,
  }
}

export async function seedEvolutionOperators(db: PrismaClient, tenantId: string) {
  const config = await evolutionConfiguration(db, tenantId)
  if (!config?.configured) return
  const admins = await db.user.findMany({ where: { tenantId, role: 'ADMIN', status: 'ACTIVE', ...(env.EVOLUTION_OPERATOR_ADMIN_ID ? { id: env.EVOLUTION_OPERATOR_ADMIN_ID } : {}) }, select: { id: true }, take: 2 })
  // Only a single unambiguous administrator can be bootstrapped. Existing revocations are never overwritten.
  if (admins.length !== 1) {
    logDomainEvent('evolution.operator.bootstrap_skipped', { tenantId, result: 'ambiguous_admin', adminCandidates: admins.length })
    return
  }
  const previous = await db.evolutionOperator.count({ where: { tenantId, phone: { in: config.phones } } })
  for (const phone of config.phones) await db.evolutionOperator.upsert({ where: { tenantId_phone: { tenantId, phone } }, create: { tenantId, phone, userId: admins[0]!.id }, update: {} })
  if (previous < config.phones.length) logDomainEvent('evolution.operator.bound', { tenantId, result: 'bootstrapped', configuredOperators: config.phones.length })
}

export async function authorizedOperator(db: PrismaClient, tenantId: string, phone: string) {
  const config = await evolutionConfiguration(db, tenantId)
  if (!config?.actionsEnabled || !config.phones.includes(phone)) return null
  const binding = await db.evolutionOperator.findUnique({ where: { tenantId_phone: { tenantId, phone } } })
  if (!binding?.enabled) return null
  return db.user.findFirst({ where: { id: binding.userId, tenantId, role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
}

export async function quotedReviewReference(db: PrismaClient, tenantId: string, providerMessageId: string, secret: string): Promise<string | null> {
  const matches = await db.operationalMessage.findMany({ where: { tenantId, providerMessageId, state: 'SENT', kind: { in: ['REVIEW_CASE', 'REVIEW_TEXT'] } }, select: { id: true }, take: 2 })
  // Never guess the latest review or accept a quote of a confirmation, user message or another tenant.
  return matches.length === 1 ? actionReference(matches[0]!.id, secret) : null
}

export async function queueCaseReview(tx: Prisma.TransactionClient, caseId: string) {
  const row = await tx.moderationCase.findUnique({ where: { id: caseId }, include: { link: { include: { network: true, niche: true } } } })
  if (!row || row.closedAt || row.link.status !== 'PENDING_MODERATION') return
  const revision = `${row.id}:${row.appealedAt?.toISOString() ?? 'submission'}`
  const snapshotHash = reviewHash(row.link, revision)
  await operationalEvent(tx, { tenantId: row.tenantId, occurrenceKey: `review:${caseId}:${snapshotHash}`, kind: 'REVIEW_CASE', resourceId: caseId, snapshotHash,
    payload: { name: row.link.name, description: row.link.description, network: row.link.network.name, niche: row.link.niche.name, type: row.appealedAt ? 'Contestação' : 'Novo link' },
    expiresAt: new Date(Date.now() + REFERENCE_TTL_MS), nextAttemptAt: new Date(Date.now() + 10_000),
  })
}

export async function queueTextReview(tx: Prisma.TransactionClient, tenantId: string, linkId: string) {
  const proposal = await pendingText(tx, tenantId, linkId)
  const link = await tx.link.findFirst({ where: { id: linkId, tenantId, status: 'PUBLISHED' }, include: { network: true, niche: true } })
  if (!proposal || !link) return
  const after = proposal.after as { name?: string; description?: string }
  const snapshotHash = reviewHash(link, proposal.id)
  await operationalEvent(tx, { tenantId, occurrenceKey: `text:${proposal.id}:${snapshotHash}`, kind: 'REVIEW_TEXT', resourceId: `text:${proposal.id}`, snapshotHash,
    payload: { name: after.name ?? link.name, description: after.description ?? link.description, network: link.network.name, niche: link.niche.name, type: 'Alteração de texto' }, expiresAt: new Date(Date.now() + REFERENCE_TTL_MS),
  })
}

async function reviewStillCurrent(db: PrismaClient, event: OperationalMessage) {
  if (event.consumedAt || !event.expiresAt || event.expiresAt <= new Date()) return false
  if (event.kind === 'REVIEW_CASE') {
    const row = await db.moderationCase.findFirst({ where: { id: event.resourceId, tenantId: event.tenantId, closedAt: null }, include: { link: true } })
    return Boolean(row && row.link.status === 'PENDING_MODERATION' && event.snapshotHash === reviewHash(row.link, `${row.id}:${row.appealedAt?.toISOString() ?? 'submission'}`))
  }
  const proposal = await db.auditLog.findFirst({ where: { id: event.resourceId.slice(5), tenantId: event.tenantId, action: 'link.text.proposed' } })
  if (!proposal) return false
  const link = await db.link.findUnique({ where: { id: proposal.entityId } })
  const current = await pendingText(db, event.tenantId, proposal.entityId)
  return Boolean(link && link.status === 'PUBLISHED' && current?.id === proposal.id && event.snapshotHash === reviewHash(link, proposal.id))
}

export function renderOperationalMessage(event: Pick<OperationalMessage, 'id' | 'kind' | 'payload'> & { resourceId?: string }, _secret: string, origin: string): string {
  const p = event.payload as Record<string, unknown>
  const name = safeText(String(p.name ?? ''))
  const panel = `${origin.replace(/\/$/, '')}/admin/moderacao`
  if (event.kind.startsWith('REVIEW_')) {
    return [`🔎 *AGUARDANDO SUA REVISÃO*`, `${safeText(String(p.type ?? 'Link'))} • ${name}`, `Rede: ${safeText(String(p.network ?? ''))} | Categoria: ${safeText(String(p.niche ?? ''))}`, '', safeText(String(p.description ?? '')), '', '*Como decidir no WhatsApp*', '1. Toque e segure ESTA mensagem e escolha Responder.', '2. Envie uma das opções:', 'APROVAR', 'RECUSAR motivo da recusa', '', 'Cada resposta vale apenas para o link da mensagem citada, mesmo que outros avisos cheguem depois.', 'Prazo: 24 horas. Após isso ou se o conteúdo mudar, revise pelo painel.', `Revisão: ${event.id}`, `Painel: ${panel}`].join('\n')
  }
  if (event.kind === 'DECISION') return [p.decision === 'APPROVE' ? '✅ *REVISÃO APROVADA*' : '❌ *REVISÃO RECUSADA*', name, `Resultado: ${p.status === 'PUBLISHED' ? (p.decision === 'REJECT' ? 'O link continua publicado com o texto anterior.' : 'Link publicado.') : p.status === 'PRE_REJECTED' ? 'Link não publicado. O responsável poderá contestar pelo painel.' : 'Decisão registrada no painel.'}`, p.reason ? `Motivo: ${safeText(String(p.reason))}` : '', `Decisão de: ${safeText(String(p.operator ?? 'administrador autorizado'))} • ${p.channel === 'WHATSAPP' ? 'WhatsApp' : 'Painel'}`, p.reviewMessageId ? `Revisão: ${safeText(String(p.reviewMessageId), 100)}` : '', panel].filter(Boolean).join('\n')
  if (event.kind === 'REFUND_FAILED') return `Estorno não concluído — REFUND_FAILED. Pedido: ${safeText(event.resourceId ?? event.id, 100)}. Consulte ${origin.replace(/\/$/, '')}/admin/estornos. Nenhuma promoção será ativada por esta mensagem.`
  if (event.kind === 'COMMAND_RESULT') {
    const explanations: Record<string, string> = { review_already_resolved: 'Essa revisão já foi decidida. A decisão anterior foi mantida.', review_reference_expired: 'Esse aviso expirou ou o conteúdo do link mudou. Abra a revisão atual no painel.', review_not_found: 'Essa revisão não está mais disponível.', reason_required: 'Para recusar, responda ao aviso com RECUSAR e o motivo.' }
    return ['⚠️ *NENHUMA ALTERAÇÃO FEITA*', p.name ? safeText(String(p.name)) : '', explanations[String(p.resultCode)] ?? 'Não foi possível aplicar o comando. Confira a revisão no painel.', p.reviewMessageId ? `Revisão: ${safeText(String(p.reviewMessageId), 100)}` : '', panel].filter(Boolean).join('\n')
  }
  return `Integração recuperada. Consulte os alertas e entregas pendentes no painel: ${origin.replace(/\/$/, '')}/admin/integracoes`
}

export class EvolutionDeliveryError extends Error {
  constructor(public readonly disposition: 'RETRY' | 'UNCERTAIN' | 'DEAD', public readonly safeCode: string) { super(safeCode) }
}

export async function evolutionConnection(config: { baseUrl: string; instance: string; apiKey: string }, transport: typeof fetch = fetch): Promise<'open' | 'close' | 'connecting' | 'unknown'> {
  try {
    const response = await transport(`${config.baseUrl.replace(/\/$/, '')}/instance/connectionState/${encodeURIComponent(config.instance)}`, { headers: { apikey: config.apiKey }, redirect: 'error', signal: AbortSignal.timeout(3_000) })
    if (!response.ok) return 'unknown'
    const body = await response.json() as { instance?: { state?: unknown } }
    const state = body.instance?.state
    return state === 'open' || state === 'close' || state === 'connecting' ? state : 'unknown'
  } catch { return 'unknown' }
}

export async function sendEvolution(config: { baseUrl: string; instance: string; group: string; apiKey: string }, text: string, transport: typeof fetch = fetch): Promise<string> {
  const target = new URL(config.baseUrl)
  if (target.username || target.password || (target.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost'].includes(target.hostname)))) throw new EvolutionDeliveryError('DEAD', 'invalid_origin')
  let response: Response
  try {
    response = await transport(`${config.baseUrl.replace(/\/$/, '')}/message/sendText/${encodeURIComponent(config.instance)}`, { method: 'POST', headers: { apikey: config.apiKey, 'content-type': 'application/json' }, body: JSON.stringify({ number: config.group, text, linkPreview: false }), redirect: 'error', signal: AbortSignal.timeout(12_000) })
  } catch { throw new EvolutionDeliveryError('UNCERTAIN', 'delivery_unconfirmed') }
  if (!response.ok) throw new EvolutionDeliveryError(response.status === 429 || response.status >= 500 ? 'RETRY' : 'DEAD', `provider_http_${response.status}`)
  try {
    const body = await response.json() as { key?: { id?: unknown } }
    if (typeof body.key?.id !== 'string' || !body.key.id) throw new Error()
    return body.key.id.slice(0, 200)
  } catch { throw new EvolutionDeliveryError('UNCERTAIN', 'provider_response_unconfirmed') }
}

export async function processEvolutionReceipt(db: PrismaClient, id: string) {
  const receipt = await db.evolutionReceipt.findUnique({ where: { id } })
  if (!receipt || receipt.state !== 'PENDING') return
  const claimed = await db.evolutionReceipt.updateMany({ where: { id, state: 'PENDING' }, data: { state: 'PROCESSING' } })
  if (!claimed.count) return
  try {
    const config = await evolutionConfiguration(db, receipt.tenantId)
    const actor = await authorizedOperator(db, receipt.tenantId, receipt.sender)
    const eventId = receipt.reference.split('.')[0]!
    if (!config || !actor) throw new ReviewError(403, 'operator_forbidden')
    if (!matchesReference(receipt.reference, eventId, config.secret)) throw new ReviewError(403, 'invalid_reference')
    const event = await db.operationalMessage.findFirst({ where: { id: eventId, tenantId: receipt.tenantId, kind: { in: ['REVIEW_CASE', 'REVIEW_TEXT'] } } })
    if (!event) throw new ReviewError(404, 'review_not_found')
    await resolveHumanReview(db, { tenantId: receipt.tenantId, actorId: actor.id, reviewId: event.resourceId, fields: { decision: receipt.decision as 'APPROVE' | 'REJECT', reason: receipt.reason ?? undefined }, channel: 'WHATSAPP', requestId: receipt.id, messageId: event.id, operatorPhone: receipt.sender, receiptId: receipt.id })
  } catch (error) {
    const code = error instanceof ReviewError ? error.code : 'processing_failed'
    if (!(error instanceof ReviewError)) {
      await db.evolutionReceipt.update({ where: { id }, data: { state: 'PENDING', resultCode: code } })
      return
    }
    // Unknown failure may have occurred after a database commit: consumed references prevent duplicate decisions on recovery.
    await db.evolutionReceipt.update({ where: { id }, data: { state: 'REJECTED', resultCode: code } })
    if (error instanceof ReviewError && error.status !== 403) {
      const notice = await db.operationalMessage.findFirst({ where: { id: receipt.reference.split('.')[0], tenantId: receipt.tenantId } })
      await operationalEvent(db, { tenantId: receipt.tenantId, kind: 'COMMAND_RESULT', resourceId: id, occurrenceKey: `command-result:${id}`, payload: { resultCode: code, reviewMessageId: notice?.id ?? null, name: String((notice?.payload as Record<string, unknown> | undefined)?.name ?? '') } })
    }
  }
}

export async function deliverOperationalMessage(db: PrismaClient, event: OperationalMessage, transport: typeof fetch = fetch) {
  const config = await evolutionConfiguration(db, event.tenantId)
  if (event.kind !== 'MODERATION_EMAIL' && !config?.enabled) return
  if (event.kind.startsWith('REVIEW_') && !await reviewStillCurrent(db, event)) {
    await db.operationalMessage.updateMany({ where: { id: event.id, state: { in: ['PENDING', 'RETRY'] } }, data: { state: 'CANCELLED' } }); return
  }
  const claim = await db.operationalMessage.updateMany({ where: { id: event.id, state: { in: event.kind === 'MODERATION_EMAIL' && event.state === 'WAITING_API' ? ['WAITING_API'] : ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: new Date() } }, data: { state: 'PROCESSING', attempts: { increment: 1 }, lockedAt: new Date() } })
  if (!claim.count) return
  try {
    let providerMessageId: string | null = null
    if (event.kind === 'MODERATION_EMAIL') {
      const link = await db.link.findUnique({ where: { id: event.resourceId }, include: { tenant: true, owner: { include: { identifiers: true } } } })
      const email = link?.owner?.identifiers.find(i => i.kind === 'EMAIL' && i.replacedAt === null)?.normalizedValue
      if (link && email) {
        const rendered = moderationEmail({ brand: emailBrand({ name: link.tenant.name, host: link.tenant.host }), linkName: link.name, outcome: (event.payload as { outcome: ModerationOutcome }).outcome })
        await deliverEmail({ to: email, kind: 'moderation', ...rendered }, AbortSignal.timeout(12_000))
      }
    } else if (config) providerMessageId = await sendEvolution(config, renderOperationalMessage(event, config.secret, env.APP_PUBLIC_URL ?? `https://${config.tenant.host}`), transport)
    await db.$transaction(async tx => {
      await tx.operationalMessage.update({ where: { id: event.id }, data: { state: 'SENT', providerMessageId, lastErrorCode: null, lockedAt: null } })
      if (event.lastErrorCode && event.kind !== 'RECOVERY' && event.kind !== 'MODERATION_EMAIL') {
        await operationalEvent(tx, { tenantId: event.tenantId, kind: 'RECOVERY', resourceId: event.id, occurrenceKey: `recovery:${event.id}`, payload: {} })
      }
    })
  } catch (error) {
    const fail = error instanceof EvolutionDeliveryError ? error : new EvolutionDeliveryError('UNCERTAIN', 'delivery_unconfirmed')
    const attempts = event.attempts + 1
    const state = fail.disposition === 'RETRY' && attempts >= MAX_DELIVERY_ATTEMPTS ? 'DEAD' : fail.disposition
    await db.operationalMessage.update({ where: { id: event.id }, data: { state, lastErrorCode: fail.safeCode, lockedAt: null, nextAttemptAt: new Date(Date.now() + Math.min(3600_000, 30_000 * 2 ** attempts)) } })
  }
}

export async function runEvolutionCycle(db: PrismaClient, transport: typeof fetch = fetch) {
  await db.operationalMessage.updateMany({ where: { state: 'WAITING_API', createdAt: { lt: new Date(Date.now() - 120_000) } }, data: { state: 'PENDING' } })
  // A worker lost after network I/O must never blindly resend its message.
  await db.operationalMessage.updateMany({ where: { state: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - 120_000) } }, data: { state: 'UNCERTAIN', lastErrorCode: 'worker_interrupted', lockedAt: null } })
  await db.evolutionReceipt.updateMany({ where: { state: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 120_000) } }, data: { state: 'PENDING' } })
  const tenant = await db.tenant.findUnique({ where: { host: env.TENANT_HOST } })
  if (tenant) {
    const config = await evolutionConfiguration(db, tenant.id)
    if (config?.enabled) {
      await seedEvolutionOperators(db, tenant.id)
      const cases = await db.moderationCase.findMany({ where: { tenantId: tenant.id, closedAt: null, link: { status: 'PENDING_MODERATION' } }, select: { id: true }, take: 200, orderBy: { createdAt: 'asc' } })
      for (const row of cases) await queueCaseReview(db, row.id)
      const proposals = await db.auditLog.findMany({ where: { tenantId: tenant.id, action: 'link.text.verdict', after: { path: ['decision'], equals: 'ADMIN' } }, orderBy: { createdAt: 'desc' }, take: 100 })
      for (const row of proposals) await queueTextReview(db, tenant.id, row.entityId)
    }
  }
  const receipts = await db.evolutionReceipt.findMany({ where: { state: 'PENDING' }, take: 50, orderBy: { createdAt: 'asc' } })
  for (const row of receipts) await processEvolutionReceipt(db, row.id)
  const active = tenant ? await evolutionConfiguration(db, tenant.id) : null
  const due = await db.operationalMessage.findMany({ where: { state: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: new Date() }, OR: [{ kind: 'MODERATION_EMAIL' }, ...(active?.enabled ? [{ tenantId: tenant!.id }] : [])] }, take: 100, orderBy: { createdAt: 'asc' } })
  for (const event of due) await deliverOperationalMessage(db, event, transport)
  const cutoff = new Date(Date.now() - 30 * 24 * 3600_000)
  await db.evolutionReceipt.deleteMany({ where: { createdAt: { lt: cutoff }, state: { in: ['DONE', 'REJECTED'] } } })
  await db.operationalMessage.deleteMany({ where: { createdAt: { lt: cutoff }, state: { in: ['SENT', 'CANCELLED'] } } })
}
