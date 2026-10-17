import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { env } from '@/env'
import { actionReference } from '@/domain/notifications/evolution-command'
import { resolveHumanReview, operationalEvent, reviewHash } from '@/use-cases/@Moderation/resolve-human-review'
import { queueCaseReview, queueTextReview, deliverOperationalMessage, processEvolutionReceipt, seedEvolutionOperators, authorizedOperator, runEvolutionCycle, quotedReviewReference } from '@/use-cases/@Notifications/evolution-operations'
import { PrismaCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'

const url = process.env.EVOLUTION_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('EVOLUTION_DATABASE_URL deve apontar para PostgreSQL local descartável')
const db = new PrismaClient({ datasources: { db: { url } } })
const previous = { ...env }
let tenantId: string, adminId: string, linkId: string, caseId: string

beforeEach(async () => {
  tenantId = `f42-${randomUUID()}`; adminId = `admin-${tenantId}`; linkId = `link-${tenantId}`
  Object.assign(env, { TENANT_HOST: `${tenantId}.test`, EVOLUTION_ENABLED: '1', EVOLUTION_ACTIONS_ENABLED: '1', EVOLUTION_BASE_URL: 'https://evolution.example.test', EVOLUTION_INSTANCE_NAME: 'Test bot', EVOLUTION_API_KEY: 'fixture-api', EVOLUTION_GROUP_JID: 'fixture@g.us', EVOLUTION_WEBHOOK_AUTH_SECRET: 'fixture-webhook-secret', EVOLUTION_OPERATOR_PHONES: '5511999999999', EVOLUTION_OPERATOR_ADMIN_ID: undefined })
  await db.tenant.create({ data: { id: tenantId, host: env.TENANT_HOST, name: 'Test tenant' } })
  await db.user.create({ data: { id: adminId, tenantId, name: 'Admin fixture', role: 'ADMIN', passwordHash: 'not-a-real-password' } })
  await db.network.create({ data: { id: `network-${tenantId}`, tenantId, name: 'Telegram', slug: 'telegram', knownHosts: ['example.com'] } })
  await db.niche.create({ data: { id: `niche-${tenantId}`, tenantId, name: 'Educação', slug: 'educacao' } })
  await db.link.create({ data: { id: linkId, tenantId, ownerId: adminId, networkId: `network-${tenantId}`, nicheId: `niche-${tenantId}`, canonicalUrl: 'https://example.com/test', name: 'Grupo teste', description: 'Descrição teste', status: 'PENDING_MODERATION' } })
  const review = await db.moderationCase.create({ data: { tenantId, linkId } }); caseId = review.id
  await seedEvolutionOperators(db, tenantId)
})
afterAll(async () => { Object.assign(env, previous); await db.$disconnect() })

async function event() {
  await queueCaseReview(db, caseId)
  return db.operationalMessage.findFirstOrThrow({ where: { tenantId, kind: 'REVIEW_CASE' } })
}
function decision(decision: 'APPROVE' | 'REJECT', messageId?: string) {
  return resolveHumanReview(db, { tenantId, actorId: adminId, reviewId: caseId, fields: { decision, reason: 'Motivo de teste' }, channel: messageId ? 'WHATSAPP' : 'PANEL', messageId, requestId: randomUUID() })
}

describe('F42 PostgreSQL decisão e outbox', () => {
  it('resolve apenas citação de aviso enviado ao tenant e recusa ID ambíguo', async () => {
    const notice = await event()
    const resolve = (tenant = tenantId) => quotedReviewReference(db, tenant, 'outbound-a', 'secret')
    await db.operationalMessage.update({ where: { id: notice.id }, data: { providerMessageId: 'outbound-a' } })
    expect(await resolve()).toBeNull()
    await db.operationalMessage.update({ where: { id: notice.id }, data: { state: 'SENT' } })
    expect(await resolve()).toBe(actionReference(notice.id, 'secret'))
    expect(await resolve('other-tenant')).toBeNull()
    await db.operationalMessage.update({ where: { id: notice.id }, data: { consumedAt: new Date() } })
    // Consumed notices still resolve so the shared transaction can explain the previous decision.
    expect(await resolve()).toBe(actionReference(notice.id, 'secret'))
    await db.operationalMessage.create({ data: { tenantId, occurrenceKey: `ambiguous-${tenantId}`, resourceId: caseId, kind: 'REVIEW_CASE', payload: {}, state: 'SENT', providerMessageId: 'outbound-a' } })
    expect(await resolve()).toBeNull()
    expect(await quotedReviewReference(db, tenantId, 'unknown', 'secret')).toBeNull()
  })
  it('F42-T01/T13/U08 persiste aviso único e cancela versão antiga', async () => {
    const first = await event(); await event()
    expect(first.payload).toMatchObject({ ownerName: 'Admin fixture', canonicalUrl: 'https://example.com/test', network: 'Telegram', niche: 'Educação', description: 'Descrição teste' })
    expect(await db.operationalMessage.count({ where: { tenantId } })).toBe(1)
    await db.link.update({ where: { id: linkId }, data: { name: 'Texto revisado' } })
    await expect(decision('APPROVE', first.id)).rejects.toMatchObject({ code: 'review_reference_expired' })
    await deliverOperationalMessage(db, first, async () => { throw new Error('Não deve enviar versão antiga') })
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: first.id } })).state).toBe('CANCELLED')
    await event()
    expect(await db.operationalMessage.count({ where: { tenantId, kind: 'REVIEW_CASE' } })).toBe(2)
  })
  it('F42-T03/T10/T11 aprova apenas uma vez na disputa painel/grupo', async () => {
    const notice = await event()
    const results = await Promise.allSettled([decision('APPROVE', notice.id), decision('REJECT')])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(await db.auditLog.count({ where: { tenantId, action: 'moderation.decide' } })).toBe(1)
    expect((await db.moderationCase.findUniqueOrThrow({ where: { id: caseId } })).closedAt).not.toBeNull()
    const link = await db.link.findUniqueOrThrow({ where: { id: linkId } })
    expect(['PUBLISHED', 'PRE_REJECTED']).toContain(link.status)
    expect(await db.operationalMessage.count({ where: { tenantId, kind: 'DECISION' } })).toBe(1)
    if (link.status === 'PUBLISHED') {
      expect(link.everPublished).toBe(true)
      expect(await db.embeddingJob.count({ where: { tenantId } })).toBe(1)
      expect(await db.funnelEvent.count({ where: { tenantId } })).toBe(1)
    }
  })
  it('F42-T09 rejeita referência expirada e preserva consumo após rollback', async () => {
    const notice = await event()
    await db.operationalMessage.update({ where: { id: notice.id }, data: { expiresAt: new Date(0) } })
    await expect(decision('APPROVE', notice.id)).rejects.toMatchObject({ code: 'review_reference_expired' })
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: notice.id } })).consumedAt).toBeNull()
    await db.operationalMessage.update({ where: { id: notice.id }, data: { expiresAt: new Date(Date.now() + 60000) } })
    await expect(resolveHumanReview(db, { tenantId, actorId: adminId, reviewId: caseId, fields: { decision: 'APPROVE', nicheId: 'wrong-tenant' }, channel: 'WHATSAPP', messageId: notice.id, requestId: 'rollback' })).rejects.toMatchObject({ code: 'invalid_facet' })
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: notice.id } })).consumedAt).toBeNull()
    expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).status).toBe('PENDING_MODERATION')
  })
  it('F42-T04/T12 recusa edição sem alterar o texto publicado', async () => {
    await db.link.update({ where: { id: linkId }, data: { status: 'PUBLISHED', everPublished: true, approvedName: 'Grupo teste', approvedDescription: 'Descrição teste' } })
    await db.moderationCase.update({ where: { id: caseId }, data: { closedAt: new Date() } })
    const proposal = await db.auditLog.create({ data: { tenantId, entityType: 'link', entityId: linkId, action: 'link.text.proposed', after: { name: 'Texto novo', description: 'Proposta nova' }, createdAt: new Date(Date.now() - 2000) } })
    await db.auditLog.create({ data: { tenantId, entityType: 'link', entityId: linkId, action: 'link.text.verdict', after: { decision: 'ADMIN' } } })
    await queueTextReview(db, tenantId, linkId)
    const notice = await db.operationalMessage.findFirstOrThrow({ where: { tenantId, kind: 'REVIEW_TEXT' } })
    await resolveHumanReview(db, { tenantId, actorId: adminId, reviewId: `text:${proposal.id}`, fields: { decision: 'REJECT', reason: 'Fora do tema' }, channel: 'WHATSAPP', messageId: notice.id, requestId: 'reject-text' })
    expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).name).toBe('Grupo teste')
    await expect(resolveHumanReview(db, { tenantId, actorId: adminId, reviewId: `text:${proposal.id}`, fields: { decision: 'APPROVE' }, channel: 'PANEL', requestId: 'late' })).rejects.toMatchObject({ code: 'review_already_resolved' })
  })
  it('F42-T05/T07/T26 operador revogado não decide e bootstrap não reativa', async () => {
    expect(await authorizedOperator(db, tenantId, '5511999999999')).toEqual({ id: adminId })
    await db.evolutionOperator.updateMany({ where: { tenantId }, data: { enabled: false } })
    await seedEvolutionOperators(db, tenantId)
    expect(await authorizedOperator(db, tenantId, '5511999999999')).toBeNull()
    await db.user.update({ where: { id: adminId }, data: { role: 'USER' } })
    await expect(decision('APPROVE')).rejects.toMatchObject({ code: 'operator_forbidden' })
    await expect(resolveHumanReview(db, { tenantId: 'other-tenant', actorId: adminId, reviewId: caseId, fields: { decision: 'APPROVE' }, channel: 'PANEL', requestId: 'other' })).rejects.toMatchObject({ code: 'operator_forbidden' })
  })
  it('F42-T15/T25 mantém entrega incerta e falha permanente visíveis', async () => {
    const notice = await event()
    await db.operationalMessage.update({ where: { id: notice.id }, data: { nextAttemptAt: new Date(0) } })
    await deliverOperationalMessage(db, notice, async () => { throw new Error('connection reset after provider accepted') })
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: notice.id } })).state).toBe('UNCERTAIN')
    let requests = 0
    await runEvolutionCycle(db, async () => { requests++; return new Response('{"key":{"id":"accepted"}}') })
    expect(requests).toBe(0)
    expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).status).toBe('PENDING_MODERATION')
  })
  it('F42-T03/T13 webhook receipt vincula operador e consome decisão atomicamente', async () => {
    const notice = await event()
    const receipt = await db.evolutionReceipt.create({ data: { tenantId, instance: 'Test bot', providerMessageId: randomUUID(), sender: '5511999999999', reference: actionReference(notice.id, env.EVOLUTION_WEBHOOK_AUTH_SECRET!), decision: 'APPROVE' } })
    await processEvolutionReceipt(db, receipt.id)
    await processEvolutionReceipt(db, receipt.id)
    expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).state).toBe('DONE')
    expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).status).toBe('PUBLISHED')
    expect(await db.auditLog.count({ where: { tenantId, action: 'moderation.decide' } })).toBe(1)
  })
  it('F42-T17/T18 eventos informativos não expõem payload ou chaves em mensagem', async () => {
    const info = await operationalEvent(db, { tenantId, kind: 'REFUND_FAILED', resourceId: 'order', occurrenceKey: `refund-${tenantId}`, payload: { apiKey: 'secret-sentinel' } })
    let body = ''
    await deliverOperationalMessage(db, info, async (_url, init) => { body = String(init?.body); return new Response('{"key":{"id":"sent"}}') })
    expect(body).not.toContain('secret-sentinel')
    expect(body).toContain('/admin/estornos')
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: info.id } })).state).toBe('SENT')
  })
  it('F42-T08 vínculo de snapshot muda quando a revisão muda', async () => {
    const notice = await event()
    const link = await db.link.findUniqueOrThrow({ where: { id: linkId } })
    expect(notice.snapshotHash).toBe(reviewHash(link, `${caseId}:submission`))
  })
  it('F42-T09 atualização de embedding não invalida revisão, mas troca de faceta invalida', async () => {
    const notice = await event()
    const revision = `${caseId}:submission`
    const unchanged = await db.link.update({ where: { id: linkId }, data: { embeddingState: 'FAILED' } })
    expect(reviewHash(unchanged, revision)).toBe(notice.snapshotHash)
    expect(reviewHash({ ...unchanged, nicheId: 'another-niche' }, revision)).not.toBe(notice.snapshotHash)
    const result = await resolveHumanReview(db, { tenantId, actorId: adminId, reviewId: caseId, fields: { decision: 'APPROVE', name: '', description: '' }, channel: 'WHATSAPP', messageId: notice.id, requestId: 'embedding-completed' })
    expect(result.status).toBe('PUBLISHED')
    expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).name).toBe('Grupo teste')
  })
  it('F42-T13/T15 recupera worker interrompido sem reenviar entrega ambígua', async () => {
    const notice = await event()
    await db.operationalMessage.update({ where: { id: notice.id }, data: { state: 'PROCESSING', lockedAt: new Date(Date.now() - 180_000), attempts: 1 } })
    let requests = 0
    await runEvolutionCycle(db, async () => { requests++; return new Response('{"key":{"id":"unexpected"}}') })
    expect(requests).toBe(0)
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: notice.id } })).state).toBe('UNCERTAIN')
  })
  it('F42-T15/T25 esgota retry e emite uma recuperação sem recursão', async () => {
    const notice = await event()
    await db.operationalMessage.update({ where: { id: notice.id }, data: { attempts: 4, nextAttemptAt: new Date(0) } })
    await deliverOperationalMessage(db, { ...notice, attempts: 4 }, async () => new Response('{}', { status: 503 }))
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: notice.id } })).state).toBe('DEAD')
    await db.operationalMessage.update({ where: { id: notice.id }, data: { state: 'PENDING', attempts: 0, nextAttemptAt: new Date(0) } })
    const retry = await db.operationalMessage.findUniqueOrThrow({ where: { id: notice.id } })
    await deliverOperationalMessage(db, retry, async () => new Response('{"key":{"id":"recovered"}}'))
    const recovery = await db.operationalMessage.findFirstOrThrow({ where: { tenantId, kind: 'RECOVERY' } })
    await deliverOperationalMessage(db, recovery, async () => new Response('{"key":{"id":"recovery-notice"}}'))
    expect(await db.operationalMessage.count({ where: { tenantId, kind: 'RECOVERY' } })).toBe(1)
  })
  it('F42-T20/T26 desligamento impede comandos e retenção preserva falhas para análise', async () => {
    await event()
    env.EVOLUTION_ENABLED = '0'
    expect(await authorizedOperator(db, tenantId, '5511999999999')).toBeNull()
    const old = new Date(Date.now() - 31 * 24 * 3600_000)
    for (const state of ['SENT', 'DEAD', 'UNCERTAIN']) await db.operationalMessage.create({ data: { tenantId, occurrenceKey: `${tenantId}:${state}`, resourceId: 'old', kind: 'REFUND_FAILED', payload: {}, state, createdAt: old } })
    await runEvolutionCycle(db, async () => { throw new Error('disabled') })
    expect(await db.operationalMessage.count({ where: { tenantId, resourceId: 'old', state: 'SENT' } })).toBe(0)
    expect(await db.operationalMessage.count({ where: { tenantId, resourceId: 'old', state: { in: ['DEAD', 'UNCERTAIN'] } } })).toBe(2)
  })
  it('F42-T25 estado de estorno e aviso são persistidos juntos, sem duplicar ocorrência', async () => {
    const row = await db.order.create({ data: { tenantId, linkId, userId: adminId, status: 'REFUND_PENDING', method: 'PIX', productCode: 'SEARCH', durationDays: 7, amountCents: 100, savingsCents: 0 } })
    const store = new PrismaCheckoutStore(db)
    const commercial = await store.findCommercial(row.id)
    expect(commercial).not.toBeNull()
    const order = { ...commercial!.order, status: 'REFUND_FAILED' as const, refundAttempts: 3 }
    await store.saveOrder(order)
    await store.saveOrder(order)
    expect((await db.order.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('REFUND_FAILED')
    expect(await db.operationalMessage.count({ where: { tenantId, resourceId: row.id, kind: 'REFUND_FAILED' } })).toBe(1)
    expect((await db.operationalMessage.findFirstOrThrow({ where: { tenantId, kind: 'REFUND_FAILED' } })).payload).toMatchObject({ ownerName: 'Admin fixture', name: 'Grupo teste', canonicalUrl: 'https://example.com/test', amountCents: 100, method: 'PIX', attempts: 3 })
  })
})
