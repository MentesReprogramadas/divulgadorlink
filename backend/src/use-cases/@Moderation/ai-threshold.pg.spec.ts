import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { publishSubmission, recordSubmissionReview, settleSubmission } from './settle-submission'
import { settleProposedText } from '@/use-cases/@Links/settle-proposed-text'
import { changeCollectionPublication } from '@/repositories/public-collections'
import { explainAiVerdict } from '@/domain/moderation/ai-verdict'
const url = process.env.AI_THRESHOLD_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Local disposable database required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenantId: string, userId: string, linkId: string
beforeEach(async () => {
  tenantId = randomUUID(); userId = 'user-' + tenantId; linkId = 'link-' + tenantId
  await db.tenant.create({ data: { id: tenantId, host: tenantId + '.test', name: 'Threshold fixture' } })
  await db.user.create({ data: { id: userId, tenantId, name: 'Owner', passwordHash: 'fixture', identifiers: { create: { tenantId, kind: 'EMAIL', normalizedValue: userId + '@test.invalid', confirmedAt: new Date() } } } })
  await db.network.create({ data: { id: 'r-' + tenantId, tenantId, name: 'Site', slug: 'site', knownHosts: [] } })
  await db.niche.create({ data: { id: 'n-' + tenantId, tenantId, name: 'Estudos', slug: 'estudos' } })
  await db.link.create({ data: { id: linkId, tenantId, ownerId: userId, networkId: 'r-' + tenantId, nicheId: 'n-' + tenantId, canonicalUrl: 'https://example.com/' + linkId, name: 'Estudos', description: 'Conteúdo de estudo', status: 'PENDING_MODERATION' } })
  await db.config.create({ data: { tenantId, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0' } })
})
afterAll(() => db.$disconnect())
it('zero publica de verdade e registra um único aviso de aprovação por configuração', async () => {
  const judge = vi.fn(async () => { throw new Error('offline') })
  const ports = { linkId, judge, load: async () => ({ status: (await db.link.findUniqueOrThrow({ where: { id: linkId } })).status, tenantId, name: 'Estudos', description: 'Texto', nicheName: 'Estudos' }), readThreshold: async () => 0, publish: (id: string, evidence: Parameters<typeof publishSubmission>[1]) => publishSubmission(id, evidence, db) }
  expect(await settleSubmission(ports)).toBe('PUBLISH')
  expect(await settleSubmission(ports)).toBe('SKIPPED')
  expect(judge).not.toHaveBeenCalled()
  expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).status).toBe('PUBLISHED')
  const notices = await db.operationalMessage.findMany({ where: { tenantId, kind: 'AI_APPROVED' } })
  expect(notices).toHaveLength(1)
  expect(notices[0]!.payload).toMatchObject({ threshold: 0, confidence: null, decisionReason: expect.stringContaining('desativada') })
})
it('parecer negativo mantém o link pendente e avisa o motivo sem duplicar entrega', async () => {
  const verdict = { pass: false, confidence: 0.99, reasons: ['Conteúdo fora das regras'] }
  const evidence = { verdict, threshold: 0.85, decisionReason: explainAiVerdict(verdict, 0.85) }
  await recordSubmissionReview(linkId, evidence, db)
  await recordSubmissionReview(linkId, evidence, db)
  expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).status).toBe('PENDING_MODERATION')
  const notices = await db.operationalMessage.findMany({ where: { tenantId, kind: 'AI_REVIEWED' } })
  expect(notices).toHaveLength(1)
  expect(notices[0]!.payload).toMatchObject({ threshold: 0.85, confidence: 0.99, reasons: verdict.reasons, decisionReason: expect.stringContaining('não aprovou') })
})
it('texto proposto em zero dispensa provedor e mantém auditoria, aviso e idempotência', async () => {
  await db.link.update({ where: { id: linkId }, data: { status: 'PUBLISHED', everPublished: true } })
  await db.auditLog.create({ data: { tenantId, action: 'link.text.proposed', entityType: 'link', entityId: linkId, after: { name: 'Nome novo', description: 'Descrição nova' } } })
  const judge = vi.fn(async () => { throw new Error('offline') })
  expect(await settleProposedText({ linkId, db, judge })).toBe('PUBLISH')
  expect(await settleProposedText({ linkId, db, judge })).toBe('SKIPPED')
  expect(judge).not.toHaveBeenCalled()
  expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).name).toBe('Nome novo')
  expect((await db.auditLog.findFirstOrThrow({ where: { tenantId, action: 'link.text.verdict' } })).after).toMatchObject({ decision: 'PUBLISH', provider: 'disabled', threshold: 0, confidence: null })
  expect(await db.operationalMessage.count({ where: { tenantId, kind: 'AI_APPROVED' } })).toBe(1)
})
it('coleção em zero publica sem IA, mas mantém conteúdo bloqueado e elegibilidade', async () => {
  await db.link.update({ where: { id: linkId }, data: { status: 'PUBLISHED' } })
  const favorite = await db.favorite.create({ data: { tenantId, userId, linkId } })
  const collection = await db.collection.create({ data: { id: randomUUID(), tenantId, userId, name: 'Coleção' } })
  await db.collectionItem.create({ data: { tenantId, userId, collectionId: collection.id, favoriteId: favorite.id, position: 0 } })
  const judge = vi.fn(async () => { throw new Error('offline') })
  const input = { expectedVersion: 0, title: 'Estudos', description: 'Seleção de estudos', curator: 'Ana', slug: 'estudos', requiresAge: false }
  await changeCollectionPublication(db, { tenantId, userId }, collection.id, 0, input, { probe: async () => 200, judge })
  expect((await db.collection.findUniqueOrThrow({ where: { id: collection.id } })).visibility).toBe('PUBLIC')
  expect(judge).not.toHaveBeenCalled()
  await db.blocklistTerm.create({ data: { tenantId, term: 'proibido' } })
  await expect(changeCollectionPublication(db, { tenantId, userId }, collection.id, 1, { ...input, title: 'proibido' }, { probe: async () => 200, judge })).rejects.toThrow()
})

it('recusa do texto avisa a proposta analisada e preserva o texto publicado', async () => {
  await db.link.update({ where: { id: linkId }, data: { status: 'PUBLISHED', everPublished: true } })
  await db.config.updateMany({ where: { tenantId, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' }, data: { value: '0.85' } })
  await db.auditLog.create({ data: { tenantId, action: 'link.text.proposed', entityType: 'link', entityId: linkId, after: { name: 'Texto recusado', description: 'Proposta em revisão' } } })
  expect(await settleProposedText({ linkId, db, judge: async () => ({ pass: false, confidence: 0.99, reasons: ['Fora das regras'] }) })).toBe('ADMIN')
  expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).name).toBe('Estudos')
  expect((await db.operationalMessage.findFirstOrThrow({ where: { tenantId, kind: 'AI_REVIEWED' } })).payload).toMatchObject({ name: 'Texto recusado', description: 'Proposta em revisão', threshold: 0.85, reasons: ['Fora das regras'] })
})
