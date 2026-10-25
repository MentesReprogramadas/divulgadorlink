import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { insertLinkMedia } from '@/repositories/link-media'
import { settlePendingLinkMedia } from '@/use-cases/@Moderation/settle-link-media'

const url = process.env.ANALYTICS_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local PG required')
const db = new PrismaClient({ datasources: { db: { url } } })
let tenant: string, owner: string, link: string
beforeEach(async () => {
  tenant = randomUUID(); owner = randomUUID(); link = randomUUID()
  await db.tenant.create({ data: { id: tenant, host: tenant + '.test', name: 'Global moderation' } })
  await db.config.create({ data: { tenantId: tenant, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0' } })
  await db.user.create({ data: { id: owner, tenantId: tenant, name: 'Owner', passwordHash: 'fixture', identifiers: { create: { tenantId: tenant, kind: 'EMAIL', normalizedValue: owner + '@fixture.test', confirmedAt: new Date() } } } })
  const network = await db.network.create({ data: { tenantId: tenant, name: 'Site', slug: 'site' } })
  const niche = await db.niche.create({ data: { tenantId: tenant, name: 'Projetos', slug: 'projetos' } })
  await db.link.create({ data: { id: link, tenantId: tenant, ownerId: owner, networkId: network.id, nicheId: niche.id, name: 'Projeto', description: 'Público', canonicalUrl: 'https://example.com/projeto', status: 'PUBLISHED' } })
})
afterEach(async () => {
  for (const remove of [() => db.operationalMessage.deleteMany({ where: { tenantId: tenant } }), () => db.auditLog.deleteMany({ where: { tenantId: tenant } }), () => db.link.deleteMany({ where: { tenantId: tenant } }), () => db.network.deleteMany({ where: { tenantId: tenant } }), () => db.niche.deleteMany({ where: { tenantId: tenant } }), () => db.config.deleteMany({ where: { tenantId: tenant } }), () => db.userIdentifier.deleteMany({ where: { tenantId: tenant } }), () => db.user.deleteMany({ where: { tenantId: tenant } })]) await remove()
  await db.tenant.delete({ where: { id: tenant } })
})
afterAll(async () => { await db.$disconnect() })

async function attach() {
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: 'navy' } }).webp().toBuffer()
  await db.$transaction(tx => insertLinkMedia(tx, tenant, link, [{ kind: 'IMAGE', alt: 'Projeto', bytes }]))
  return db.linkMediaAsset.findFirstOrThrow({ where: { tenantId: tenant, linkId: link } })
}

it('zero aprova anexos elegíveis na mesma transação sem depender da IA', async () => {
  const row = await attach()
  expect(row.status).toBe('APPROVED')
  expect(await db.operationalMessage.count({ where: { tenantId: tenant, kind: 'REVIEW_MEDIA' } })).toBe(0)
})

it('o mesmo limiar aprova imagem vista pela IA e substitui só o anexo anterior', async () => {
  const previous = await attach()
  await db.config.update({ where: { tenantId_key: { tenantId: tenant, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } }, data: { value: '0.85' } })
  await db.$transaction(tx => insertLinkMedia(tx, tenant, link, [{ kind: 'IMAGE', alt: 'Imagem nova', bytes: Buffer.from(previous.bytes) }], 2))
  expect(await db.operationalMessage.count({ where: { tenantId: tenant, kind: 'REVIEW_MEDIA' } })).toBe(0)
  const judge = vi.fn(async () => ({ pass: true, confidence: 0.85, reasons: ['Imagem permitida'] }))
  await settlePendingLinkMedia(db, tenant, link, { judge })
  const assets = await db.linkMediaAsset.findMany({ where: { tenantId: tenant, linkId: link } })
  expect(assets).toHaveLength(1)
  expect(assets[0]).toMatchObject({ status: 'APPROVED', revision: 2 })
  expect(assets[0].id).not.toBe(previous.id)
  expect(judge).toHaveBeenCalledWith(expect.objectContaining({ images: [expect.objectContaining({ base64: Buffer.from(previous.bytes).toString('base64') })] }))
  expect(await db.operationalMessage.count({ where: { tenantId: tenant, kind: 'REVIEW_MEDIA', state: { not: 'CANCELLED' } } })).toBe(0)
})

it.each(['negative', 'low', 'unavailable', 'changed-policy', 'suspended'])('parecer %s conserva a imagem aprovada e o novo anexo privado', async mode => {
  const previous = await attach()
  await db.config.update({ where: { tenantId_key: { tenantId: tenant, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } }, data: { value: '0.9' } })
  await db.$transaction(tx => insertLinkMedia(tx, tenant, link, [{ kind: 'IMAGE', alt: 'Nova imagem', bytes: Buffer.from(previous.bytes) }], 2))
  await settlePendingLinkMedia(db, tenant, link, { judge: async () => {
    if (mode === 'unavailable') throw new Error('offline')
    if (mode === 'changed-policy') await db.config.update({ where: { tenantId_key: { tenantId: tenant, key: 'MODERATION_AUTO_APPROVE_THRESHOLD' } }, data: { value: '1' } })
    if (mode === 'suspended') await db.user.update({ where: { id: owner }, data: { status: 'BANNED' } })
    return { pass: mode !== 'negative', confidence: mode === 'low' ? 0.89 : 0.95, reasons: [] }
  } })
  expect((await db.linkMediaAsset.findUniqueOrThrow({ where: { id: previous.id } })).status).toBe('APPROVED')
  expect(await db.linkMediaAsset.count({ where: { tenantId: tenant, linkId: link, status: 'PENDING' } })).toBe(1)
})

it('zero mantém blocklist e não chama IA para o anexo bloqueado', async () => {
  await db.blocklistTerm.create({ data: { tenantId: tenant, term: 'Projeto' } })
  try {
    const asset = await attach(), judge = vi.fn(async () => ({ pass: true, confidence: 1, reasons: [] }))
    await settlePendingLinkMedia(db, tenant, link, { judge })
    expect((await db.linkMediaAsset.findUniqueOrThrow({ where: { id: asset.id } })).status).toBe('PENDING')
    expect(judge).not.toHaveBeenCalled()
  } finally { await db.blocklistTerm.deleteMany({ where: { tenantId: tenant } }) }
})
