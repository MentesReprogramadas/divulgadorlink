import type { Prisma, PrismaClient, OperationalMessage } from '@prisma/client'
import { z } from 'zod'
import { env } from '@/env'
import { actionReference, matchesReference, safeText } from '@/domain/notifications/evolution-command'
import { linkNotificationSnapshot, notificationUrl } from '@/domain/notifications/link-notification'
import { operationalEvent, pendingText, resolveHumanReview, ReviewError, reviewHash } from '@/use-cases/@Moderation/resolve-human-review'
import { deliverEmail } from '@/adapters/notifications/outbound-mail'
import { emailBrand, moderationEmail, type ModerationOutcome } from '@/adapters/notifications/email/templates'
import { logDomainEvent } from '@/observability/logger'
import { CONTENT_REVIEW_KINDS, contentReviewHash, queueContentReview } from './content-review-events'
import { ContentReviewError, decideContentReview } from '@/use-cases/@Moderation/review-public-content'
import { publicContentValidationPorts, type PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'

const REVIEW_KINDS = ['REVIEW_CASE', 'REVIEW_TEXT', ...CONTENT_REVIEW_KINDS]

const settingsSchema = z.object({ enabled: z.boolean().default(true), actionsEnabled: z.boolean().default(true) }).strict()
export const EVOLUTION_SETTINGS_KEY = 'EVOLUTION_INTEGRATION'
export const MAX_DELIVERY_ATTEMPTS = 5
export const REFERENCE_TTL_MS = 24 * 60 * 60 * 1000

export async function queueNewUser(db: PrismaClient, tenantId: string, userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, tenantId }, select: { id: true, name: true, createdAt: true } })
  if (!user) return
  await operationalEvent(db, { tenantId, kind: 'NEW_USER', resourceId: user.id, occurrenceKey: `new-user:${tenantId}:${user.id}`, payload: { ownerName: user.name, registeredAt: user.createdAt.toISOString() } })
}

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
  const matches = await db.operationalMessage.findMany({ where: { tenantId, providerMessageId, state: 'SENT', kind: { in: REVIEW_KINDS } }, select: { id: true }, take: 2 })
  // Never guess the latest review or accept a quote of a confirmation, user message or another tenant.
  return matches.length === 1 ? actionReference(matches[0]!.id, secret) : null
}

export async function queueCaseReview(tx: Prisma.TransactionClient, caseId: string) {
  const row = await tx.moderationCase.findUnique({ where: { id: caseId }, include: { link: { include: { network: true, niche: true, owner: { select: { name: true } } } } } })
  if (!row || row.closedAt || row.link.status !== 'PENDING_MODERATION') return
  const revision = `${row.id}:${row.appealedAt?.toISOString() ?? 'submission'}`
  const snapshotHash = reviewHash(row.link, revision)
  await operationalEvent(tx, { tenantId: row.tenantId, occurrenceKey: `review:${caseId}:${snapshotHash}`, kind: 'REVIEW_CASE', resourceId: caseId, snapshotHash,
    payload: { ...linkNotificationSnapshot(row.link), type: row.appealedAt ? 'Contestação' : 'Novo link', appeal: row.appealedAt ? row.appealText : null },
    expiresAt: new Date(Date.now() + REFERENCE_TTL_MS), nextAttemptAt: new Date(Date.now() + 10_000),
  })
}

export async function queueTextReview(tx: Prisma.TransactionClient, tenantId: string, linkId: string) {
  const proposal = await pendingText(tx, tenantId, linkId)
  const link = await tx.link.findFirst({ where: { id: linkId, tenantId, status: 'PUBLISHED' }, include: { network: true, niche: true, owner: { select: { name: true } } } })
  if (!proposal || !link) return
  const after = proposal.after as { name?: string; description?: string }
  const snapshotHash = reviewHash(link, proposal.id)
  await operationalEvent(tx, { tenantId, occurrenceKey: `text:${proposal.id}:${snapshotHash}`, kind: 'REVIEW_TEXT', resourceId: `text:${proposal.id}`, snapshotHash,
    payload: { ...linkNotificationSnapshot(link), name: after.name ?? link.name, description: after.description ?? link.description, type: 'Alteração de texto' }, expiresAt: new Date(Date.now() + REFERENCE_TTL_MS),
  })
}

async function reviewStillCurrent(db: PrismaClient, event: OperationalMessage) {
  if (event.consumedAt || !event.expiresAt || event.expiresAt <= new Date()) return false
  if (CONTENT_REVIEW_KINDS.includes(event.kind)) {
    const row = await db.contentReview.findFirst({ where: { id: event.resourceId, tenantId: event.tenantId, status: 'PENDING', owner: { status: 'ACTIVE' } }, include: { profile: true, redirectRevision: { include: { handle: true } } } })
    return Boolean(row && event.snapshotHash === contentReviewHash(row) && (row.kind === 'PROFILE' ? row.profile?.version === row.version : row.redirectRevision?.handle.version === row.version && !row.redirectRevision.handle.disabled))
  }
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
  const url = notificationUrl(p.canonicalUrl)
  const type = p.resourceType === 'PROFILE' ? 'PÁGINA' : p.resourceType === 'REDIRECT' ? 'CONVITE' : 'LINK'
  const symbol = p.resourceType === 'PROFILE' ? '🪪' : p.resourceType === 'REDIRECT' ? '🎟️' : '🔗'
  const pageUrl = typeof p.publicPath === 'string' && /^\/p\/[a-z0-9-]+$/.test(p.publicPath) ? origin.replace(/\/$/, '') + p.publicPath : null
  const groups = Array.isArray(p.groups) ? p.groups.slice(0, 4).map(group => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) return ''
    const g = group as Record<string, unknown>
    const items = Array.isArray(g.items) ? g.items.slice(0, 3).map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return ''
      const i = item as Record<string, unknown>
      const destination = notificationUrl(i.destination) ?? (typeof i.destination === 'string' && /^\/link\/[a-zA-Z0-9_-]+$/.test(i.destination) ? origin.replace(/\/$/, '') + i.destination : null)
      return [safeText(String(i.label ?? ''), 80), destination].filter(Boolean).join(' • ')
    }).filter(Boolean) : []
    return [safeText(String(g.name ?? ''), 80), ...items, Array.isArray(g.items) && g.items.length > 3 ? `+${g.items.length - 3} links no painel` : ''].filter(Boolean).join('\n')
  }).filter(Boolean).join('\n\n').slice(0, 1400) : ''
  const details = [
    p.ownerName ? `*Usuário*\n${safeText(String(p.ownerName), 100)}` : '',
    name || url || pageUrl ? [p.resourceType === 'PROFILE' ? '*Página*' : p.resourceType === 'REDIRECT' ? '*Convite*' : '*Link*', name ? `*${name}*` : '', p.description ? safeText(String(p.description)) : '', url ?? pageUrl ?? ''].filter(Boolean).join('\n') : '',
    p.niche || p.network ? `*Classificação*\nCategoria: ${safeText(String(p.niche ?? '—'), 100)}\nRede: ${safeText(String(p.network ?? '—'), 100)}` : '',
    groups ? `*Grupos e links*\n${groups}${Array.isArray(p.groups) && p.groups.length > 4 ? '\nMais grupos no painel.' : ''}` : '',
    p.resourceType ? `*Envio*\nVersão ${Number(p.version) || 1} • Adulto: ${p.requiresAge === true ? 'Sim' : 'Não'}` : '',
    p.note ? `*Observação*\n${safeText(String(p.note), 200)}` : '',
  ].filter(Boolean)
  if (event.kind === 'PAYMENT_RECEIVED') {
    const surfaces: Record<string, string> = { HOME: 'Página inicial', SEARCH: 'Busca', NICHE: 'Categoria' }
    const products: Record<string, string> = { HOME: 'Página inicial', SEARCH: 'Busca', NICHE: 'Categoria', SEARCH_NICHE: 'Busca + Categoria', SEARCH_NICHE_HOME: 'Busca + Categoria + Página inicial' }
    const confirmed = typeof p.confirmedAt === 'string' ? new Date(p.confirmedAt) : null
    return ['💰 *PAGAMENTO RECEBIDO*', ...details,
      ['*Pagamento*', typeof p.amountCents === 'number' && Number.isSafeInteger(p.amountCents) && p.amountCents >= 0 ? `Valor: ${(p.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '', `Forma: ${p.method === 'PIX' ? 'Pix' : p.method === 'CARD' ? 'Cartão' : 'Não informada'}`, confirmed && Number.isFinite(confirmed.getTime()) ? `Confirmação registrada: ${confirmed.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)` : '', p.gatewayChargeId ? `Transação: ${safeText(String(p.gatewayChargeId), 200)}` : ''].filter(Boolean).join('\n'),
      ['*Pedido*', safeText(event.resourceId ?? event.id, 100), p.productCode ? `Produto: ${products[String(p.productCode)] ?? safeText(String(p.productCode), 60)}` : '', typeof p.durationDays === 'number' ? `Duração: ${p.durationDays} dias` : '', Array.isArray(p.surfaces) && p.surfaces.length ? `Superfícies: ${p.surfaces.map(surface => surfaces[String(surface)] ?? safeText(String(surface), 60)).join(', ')}` : '', p.renewal === true ? 'Renovação' : 'Nova compra', p.userId ? `Usuário: ${safeText(String(p.userId), 100)}` : '', p.linkOwnerName ? `Responsável pelo link: ${safeText(String(p.linkOwnerName), 100)}` : ''].filter(Boolean).join('\n'),
      `*Situação*\n${p.late === true ? 'Pagamento recebido após o prazo. O destaque não foi ativado; o pedido segue o fluxo de estorno.' : 'Recebimento confirmado. A ativação do destaque segue as regras do pedido.'}`,
      `*Painel*\n${origin.replace(/\/$/, '')}/admin/visao`,
    ].join('\n\n')
  }
  if (event.kind === 'NEW_USER') return ['👤 *NOVO USUÁRIO*', ...details, '*Cadastro*\nConta criada; a confirmação dos contatos é uma etapa separada.', `*Painel*\n${origin.replace(/\/$/, '')}/admin/usuarios`].join('\n\n')
  if (event.kind === 'AI_APPROVED') {
    const reasons = Array.isArray(p.reasons) ? p.reasons.filter((reason): reason is string => typeof reason === 'string').map(reason => safeText(reason, 240)).filter(Boolean).slice(0, 5) : []
    const percent = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : 'Não informado'
    return ['🤖 *APROVADO PELA IA*', ...details, `*Resultado*\n${p.type === 'Alteração de texto' ? 'Alteração de texto publicada.' : 'Link publicado.'}`, `*Justificativa da IA*\n${reasons.length ? reasons.map(reason => `• ${reason}`).join('\n') : 'A IA não forneceu uma justificativa textual.'}`, `*Critério de aprovação*\nConfiança informada pela IA: ${percent(p.confidence)}\nLimiar configurado: ${percent(p.threshold)}`, '*Escopo da análise*\nNome e descrição em relação à categoria e às regras de conteúdo. Não verifica o conteúdo interno do grupo nem garante a segurança do destino.', `*Painel*\n${panel}`].join('\n\n')
  }
  if (event.kind.startsWith('REVIEW_')) {
    return [p.appeal ? `📣 *CONTESTAÇÃO • ${type}*` : event.kind === 'REVIEW_TEXT' ? '✏️ *ALTERAÇÃO DE TEXTO*' : `${symbol} *${p.resourceType ? type + ' EM REVISÃO' : safeText(String(p.type ?? 'Novo link')).toUpperCase()}*`, ...details, p.appeal ? `*Contestação*\n${safeText(String(p.appeal), 240)}` : '', '*Ação*\nResponda: *APROVAR* ou *RECUSAR motivo*.', `Revisão: ${event.id}\nValidade: 24h\nPainel: ${panel}`].filter(Boolean).join('\n\n')
  }
  if (event.kind === 'DECISION') return [p.decision === 'APPROVE' ? `✅ *${p.resourceType ? type + ' • ' : ''}APROVADO*` : `❌ *${p.resourceType ? type + ' • ' : ''}RECUSADO*`, ...details, `*Resultado*\n${p.resourceType ? p.decision === 'APPROVE' ? (p.resourceType === 'PROFILE' ? 'Página publicada.' : 'Destino do convite liberado.') : [p.previousPublished ? 'Publicação anterior mantida.' : 'Envio não publicado.', p.canAppeal ? 'Contestação disponível.' : 'Contestação já utilizada; corrija e envie nova versão.'].join(' ') : p.status === 'PUBLISHED' ? (p.decision === 'REJECT' ? 'Link continua publicado com o texto anterior.' : 'Link publicado.') : p.status === 'PRE_REJECTED' ? 'Não publicado • contestação disponível.' : 'Decisão registrada.'}`, p.reason ? `*Motivo*\n${safeText(String(p.reason))}` : '', `*Decidido por*\n${safeText(String(p.operator ?? 'Administrador'), 100)} • ${p.channel === 'WHATSAPP' ? 'WhatsApp' : 'Painel'}`, [p.reviewMessageId ? `Revisão: ${safeText(String(p.reviewMessageId), 100)}` : '', `Painel: ${panel}`].filter(Boolean).join('\n')].filter(Boolean).join('\n\n')
  if (event.kind === 'REFUND_FAILED') return ['💸 *FALHA NO ESTORNO*', ...details, ['*Pedido*', safeText(event.resourceId ?? event.id, 100), typeof p.amountCents === 'number' && Number.isFinite(p.amountCents) ? `Valor: ${(p.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • ${p.method === 'CARD' ? 'Cartão' : p.method === 'PIX' ? 'Pix' : 'Pagamento'}` : '', typeof p.attempts === 'number' ? `Tentativas: ${p.attempts}` : ''].filter(Boolean).join('\n'), `*Ação*\nVerificar estorno\n${origin.replace(/\/$/, '')}/admin/estornos`].join('\n\n')
  if (event.kind === 'COMMAND_RESULT') {
    const explanations: Record<string, string> = { review_already_resolved: 'Essa revisão já foi decidida. A decisão anterior foi mantida.', review_reference_expired: 'Esse aviso expirou ou o conteúdo mudou. Abra a revisão atual no painel.', review_not_found: 'Essa revisão não está mais disponível.', reason_required: 'Para recusar, responda ao aviso com RECUSAR e o motivo.', review_validation_failed: 'O conteúdo não passou nas validações de segurança ou disponibilidade. Peça a correção pelo painel.', review_validation_unavailable: 'Não foi possível revalidar agora. Tente novamente mais tarde; nada foi publicado.' }
    return ['⚠️ *COMANDO NÃO APLICADO*', ...details, `*Resultado*\n${explanations[String(p.resultCode)] ?? 'Confira a revisão no painel.'}`, `*Ação*\nAcessar o painel\n${panel}`, p.reviewMessageId ? `Revisão: ${safeText(String(p.reviewMessageId), 100)}` : ''].filter(Boolean).join('\n\n')
  }
  return ['📬 *ENVIO RECUPERADO*', ...details, `*Entrega*\nAviso: ${safeText(event.resourceId ?? event.id, 100)}\nEntrega pendente concluída.`, `*Ação*\n${origin.replace(/\/$/, '')}/admin/integracoes`].join('\n\n')
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

export async function processEvolutionReceipt(db: PrismaClient, id: string, ports?: PublicContentValidationPorts) {
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
    const event = await db.operationalMessage.findFirst({ where: { id: eventId, tenantId: receipt.tenantId, kind: { in: REVIEW_KINDS } } })
    if (!event) throw new ReviewError(404, 'review_not_found')
    if (CONTENT_REVIEW_KINDS.includes(event.kind)) {
      if (receipt.decision === 'REJECT' && !receipt.reason?.trim()) throw new ReviewError(400, 'reason_required')
      try {
        await decideContentReview(db, { tenantId: receipt.tenantId, ownerId: actor.id }, event.resourceId, receipt.decision as 'APPROVE' | 'REJECT', receipt.reason ?? undefined, ports ?? publicContentValidationPorts(config.tenant.host), { messageId: event.id, operatorPhone: receipt.sender, receiptId: receipt.id })
      } catch (error) {
        if (error instanceof ReviewError) throw error
        if (error instanceof ContentReviewError || (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number')) {
          const status = Number(error.status)
          throw new ReviewError(status, status === 403 ? 'operator_forbidden' : status === 404 ? 'review_not_found' : status === 409 ? 'review_already_resolved' : status >= 500 ? 'review_validation_unavailable' : 'review_validation_failed')
        }
        throw error
      }
    } else await resolveHumanReview(db, { tenantId: receipt.tenantId, actorId: actor.id, reviewId: event.resourceId, fields: { decision: receipt.decision as 'APPROVE' | 'REJECT', reason: receipt.reason ?? undefined }, channel: 'WHATSAPP', requestId: receipt.id, messageId: event.id, operatorPhone: receipt.sender, receiptId: receipt.id })
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
      await operationalEvent(db, { tenantId: receipt.tenantId, kind: 'COMMAND_RESULT', resourceId: id, occurrenceKey: `command-result:${id}`, payload: { ...(notice?.payload as Prisma.JsonObject ?? {}), resultCode: code, reviewMessageId: notice?.id ?? null } })
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
        await operationalEvent(tx, { tenantId: event.tenantId, kind: 'RECOVERY', resourceId: event.id, occurrenceKey: `recovery:${event.id}`, payload: event.payload as Prisma.InputJsonValue })
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
      const contents = await db.contentReview.findMany({ where: { tenantId: tenant.id, status: 'PENDING', owner: { status: 'ACTIVE' } }, select: { id: true }, take: 200, orderBy: { createdAt: 'asc' } })
      for (const row of contents) await queueContentReview(db, row.id)
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
