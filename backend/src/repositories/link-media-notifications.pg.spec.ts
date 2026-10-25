import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { env } from '@/env'
import { prepareLinkMedia } from '@/domain/links/link-media'
import { actionReference } from '@/domain/notifications/evolution-command'
import { deliverOperationalMessage, processEvolutionReceipt, quotedReviewReference } from '@/use-cases/@Notifications/evolution-operations'
import { mutateLinkMedia } from './link-media'
import { queueLinkMediaReview } from '@/use-cases/@Notifications/link-media-events'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local PG required')
const db = new PrismaClient({ datasources: { db: { url } } })
const previousEnv = { ...env }
let tenantId: string, ownerId: string, adminId: string, linkId: string
let media: Awaited<ReturnType<typeof prepareLinkMedia>>
beforeAll(async () => {
  media = await prepareLinkMedia('IMAGE', { base64: readFileSync('src/domain/profiles/avatar.fixture.png').toString('base64'), alt: 'Pessoas lendo juntas' })
})
beforeEach(async () => {
  tenantId = randomUUID(); ownerId = randomUUID(); adminId = randomUUID(); linkId = randomUUID()
  await db.tenant.create({ data: { id: tenantId, host: tenantId + '.test', name: 'Media notices fixture' } })
  for (const id of [ownerId, adminId]) await db.user.create({ data: { id, tenantId, name: id === ownerId ? 'Autora' : 'Moderadora', role: id === adminId ? 'ADMIN' : 'USER', passwordHash: 'fixture', identifiers: { create: { tenantId, kind: 'EMAIL', normalizedValue: id + '@fixture.test', confirmedAt: new Date() } } } })
  const network = await db.network.create({ data: { tenantId, name: 'Site', slug: randomUUID() } })
  const niche = await db.niche.create({ data: { tenantId, name: 'Leitura', slug: randomUUID() } })
  await db.link.create({ data: { id: linkId, tenantId, ownerId, name: 'Clube de leitura', description: 'Livros e encontros.', canonicalUrl: 'https://example.com/' + linkId, networkId: network.id, nicheId: niche.id, status: 'PUBLISHED' } })
  Object.assign(env, { TENANT_HOST: tenantId + '.test', EVOLUTION_ENABLED: '1', EVOLUTION_ACTIONS_ENABLED: '1', EVOLUTION_BASE_URL: 'https://evolution.example.test', EVOLUTION_INSTANCE_NAME: 'Fixture media bot', EVOLUTION_API_KEY: 'fixture', EVOLUTION_GROUP_JID: 'fixture@g.us', EVOLUTION_WEBHOOK_AUTH_SECRET: 'fixture-media-secret', EVOLUTION_OPERATOR_PHONES: '5511999999999' })
  await db.evolutionOperator.create({ data: { tenantId, phone: '5511999999999', userId: adminId } })
})
afterEach(async () => {
  Object.assign(env, previousEnv)
  await db.auditLog.deleteMany({ where: { tenantId } }); await db.link.deleteMany({ where: { tenantId } })
  await db.network.deleteMany({ where: { tenantId } }); await db.niche.deleteMany({ where: { tenantId } })
  await db.userIdentifier.deleteMany({ where: { tenantId } }); await db.user.deleteMany({ where: { tenantId } }); await db.tenant.delete({ where: { id: tenantId } })
})
afterAll(async () => { await db.$disconnect() })
const actor = () => ({ tenantId, ownerId })
const administrator = () => ({ tenantId, ownerId: adminId, admin: true })
async function propose(version = 0) {
  await mutateLinkMedia(db, actor(), linkId, version, { type: 'PUT', media })
  return db.linkMediaAsset.findFirstOrThrow({ where: { tenantId, linkId, status: 'PENDING' } })
}
async function sent(assetId: string) {
  const event = await db.operationalMessage.findFirstOrThrow({ where: { tenantId, resourceId: assetId, kind: 'REVIEW_MEDIA' }, orderBy: { createdAt: 'desc' } })
  await deliverOperationalMessage(db, event, async () => new Response(JSON.stringify({ key: { id: 'provider-' + event.id } })))
  return db.operationalMessage.findUniqueOrThrow({ where: { id: event.id } })
}
const receipt = (id: string, decision = 'APPROVE', reason?: string) => db.evolutionReceipt.create({ data: { tenantId, instance: 'Fixture media bot', providerMessageId: randomUUID(), sender: '5511999999999', reference: actionReference(id, 'fixture-media-secret'), decision, reason } })

it('enfileira a proposta sem bytes privados e registra uma decisão do painel sem republicar o link', async () => {
  const asset = await propose()
  const notice = await db.operationalMessage.findFirst({ where: { tenantId, resourceId: asset.id, kind: 'REVIEW_MEDIA' } })
  expect(notice).toBeTruthy()
  expect(notice!.payload).toMatchObject({ resourceType: 'LINK_MEDIA', mediaKind: 'IMAGE', linkId, version: 1, alt: media.alt })
  expect(JSON.stringify(notice!.payload)).not.toContain('base64')
  await queueLinkMediaReview(db, tenantId, asset.id); await queueLinkMediaReview(db, tenantId, asset.id)
  expect(await db.operationalMessage.count({ where: { tenantId, resourceId: asset.id, kind: 'REVIEW_MEDIA' } })).toBe(1)
  await mutateLinkMedia(db, administrator(), linkId, 1, { type: 'DECIDE', assetId: asset.id, decision: 'APPROVE' })
  const decision = await db.operationalMessage.findFirstOrThrow({ where: { tenantId, resourceId: asset.id, kind: 'DECISION' } })
  expect(decision.payload).toMatchObject({ resourceType: 'LINK_MEDIA', decision: 'APPROVE', channel: 'PANEL', operator: 'Moderadora' })
  await expect(mutateLinkMedia(db, administrator(), linkId, 1, { type: 'DECIDE', assetId: asset.id, decision: 'REJECT', reason: 'Outra decisão' })).rejects.toMatchObject({ status: 409 })
  expect(await db.operationalMessage.count({ where: { tenantId, resourceId: asset.id, kind: 'DECISION' } })).toBe(1)
  expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).description).toBe('Livros e encontros.')
})
it('aceita a citação exata no WhatsApp e consome o recibo atomicamente uma única vez', async () => {
  const asset = await propose(), event = await sent(asset.id)
  expect(event.state).toBe('SENT')
  expect(await quotedReviewReference(db, tenantId, event.providerMessageId!, 'fixture-media-secret')).toBe(actionReference(event.id, 'fixture-media-secret'))
  expect(await quotedReviewReference(db, 'foreign', event.providerMessageId!, 'fixture-media-secret')).toBeNull()
  const inbound = await receipt(event.id)
  await processEvolutionReceipt(db, inbound.id); await processEvolutionReceipt(db, inbound.id)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: inbound.id } })).state).toBe('DONE')
  expect((await db.linkMediaAsset.findUniqueOrThrow({ where: { id: asset.id } })).status).toBe('APPROVED')
  expect((await db.operationalMessage.findFirstOrThrow({ where: { tenantId, resourceId: asset.id, kind: 'DECISION' } })).payload).toMatchObject({ channel: 'WHATSAPP', reviewMessageId: event.id })
  expect(await db.auditLog.count({ where: { tenantId, action: 'link.media.approve' } })).toBe(1)
})
it('exige motivo e mantém o anexo aprovado quando a substituição é recusada pelo WhatsApp', async () => {
  const first = await propose(); await mutateLinkMedia(db, administrator(), linkId, 1, { type: 'DECIDE', assetId: first.id, decision: 'APPROVE' })
  const replacement = await propose(2), event = await sent(replacement.id), missing = await receipt(event.id, 'REJECT')
  await processEvolutionReceipt(db, missing.id)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: missing.id } })).resultCode).toBe('reason_required')
  const inbound = await receipt(event.id, 'REJECT', 'Envie uma imagem mais legível.'); await processEvolutionReceipt(db, inbound.id)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: inbound.id } })).state).toBe('DONE')
  expect(await db.linkMediaAsset.findUnique({ where: { id: replacement.id } })).toBeNull()
  expect((await db.linkMediaAsset.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('APPROVED')
  expect((await db.operationalMessage.findFirstOrThrow({ where: { tenantId, resourceId: replacement.id, kind: 'DECISION' } })).payload).toMatchObject({ decision: 'REJECT', previousApproved: true, reason: 'Envie uma imagem mais legível.' })
})
it('não aplica aviso expirado, substituído ou de operador revogado', async () => {
  const asset = await propose(), event = await sent(asset.id)
  await db.operationalMessage.update({ where: { id: event.id }, data: { expiresAt: new Date(0) } })
  const expired = await receipt(event.id); await processEvolutionReceipt(db, expired.id)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: expired.id } })).resultCode).toBe('review_reference_expired')
  await db.operationalMessage.update({ where: { id: event.id }, data: { expiresAt: new Date(Date.now() + 60000) } })
  const replacement = await propose(1), current = await sent(replacement.id), stale = await receipt(event.id); await processEvolutionReceipt(db, stale.id)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: stale.id } })).state).toBe('REJECTED')
  await db.evolutionOperator.updateMany({ where: { tenantId }, data: { enabled: false } })
  const revoked = await receipt(current.id); await processEvolutionReceipt(db, revoked.id)
  expect((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: revoked.id } })).resultCode).toBe('operator_forbidden')
  expect((await db.linkMediaAsset.findUniqueOrThrow({ where: { id: replacement.id } })).status).toBe('PENDING')
})
it('uma corrida entre painel e WhatsApp registra somente uma decisão para o anexo', async () => {
  const asset = await propose(), event = await sent(asset.id), inbound = await receipt(event.id)
  await Promise.allSettled([
    processEvolutionReceipt(db, inbound.id),
    mutateLinkMedia(db, administrator(), linkId, 1, { type: 'DECIDE', assetId: asset.id, decision: 'REJECT', reason: 'Imagem inadequada.' }),
  ])
  expect(await db.auditLog.count({ where: { tenantId, action: { in: ['link.media.approve', 'link.media.reject'] } } })).toBe(1)
  expect(await db.operationalMessage.count({ where: { tenantId, resourceId: asset.id, kind: 'DECISION' } })).toBe(1)
  expect(['DONE', 'REJECTED']).toContain((await db.evolutionReceipt.findUniqueOrThrow({ where: { id: inbound.id } })).state)
})
it('reverte aprovação, auditoria e consumo da referência se o aviso da decisão não puder ser persistido', async () => {
  const asset = await propose(), event = await sent(asset.id)
  const identifier = 'media_notice_' + tenantId.replace(/-/g, '')
  if (!/^media_notice_[a-f0-9]+$/.test(identifier)) throw new Error('Invalid fixture identifier')
  await db.$executeRawUnsafe(`CREATE FUNCTION ${identifier}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."tenantId"='${tenantId}' AND NEW.kind='DECISION' THEN RAISE EXCEPTION 'fixture notice unavailable'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe(`CREATE TRIGGER ${identifier} BEFORE INSERT ON operational_messages FOR EACH ROW EXECUTE FUNCTION ${identifier}()`)
  try {
    await expect(mutateLinkMedia(db, administrator(), linkId, 1, { type: 'DECIDE', assetId: asset.id, decision: 'APPROVE' })).rejects.toThrow('fixture notice unavailable')
    expect((await db.linkMediaAsset.findUniqueOrThrow({ where: { id: asset.id } })).status).toBe('PENDING')
    expect((await db.link.findUniqueOrThrow({ where: { id: linkId } })).mediaVersion).toBe(1)
    expect((await db.operationalMessage.findUniqueOrThrow({ where: { id: event.id } })).consumedAt).toBeNull()
    expect(await db.auditLog.count({ where: { tenantId, action: 'link.media.approve' } })).toBe(0)
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER ${identifier} ON operational_messages`)
    await db.$executeRawUnsafe(`DROP FUNCTION ${identifier}()`)
  }
})
