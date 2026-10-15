import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { decodeCursor } from '@/http/catalog-page'
import { queryCatalogPage } from '@/http/catalog-query'
import { settleProposedText } from '@/use-cases/@Links/settle-proposed-text'

const url = process.env.CHECKOUT_DATABASE_URL
if (!url) throw new Error('CHECKOUT_DATABASE_URL ausente')

const admin = new PrismaClient({ datasources: { db: { url } } })
let db: PrismaClient

async function allPages(input: { tenantId: string; age: 'yes' | 'no'; limit: number; surface?: 'HOME' | 'NICHE' }) {
  const ids: string[] = []
  let cursor: string | null = null
  let pages = 0
  do {
    const page = await queryCatalogPage(db, {
      tenantId: input.tenantId,
      age: input.age,
      surface: input.surface ?? 'HOME',
      nicheSlug: null,
      networkSlug: null,
      limit: input.limit,
      cursor: decodeCursor(cursor ?? undefined),
    })
    expect(page.rows.length).toBeLessThanOrEqual(input.limit)
    ids.push(...page.rows.map((row) => row.id))
    cursor = page.nextCursor
    pages += 1
  } while (cursor && pages < 50)
  return { ids, pages }
}

async function seedLink(id: string, tenantId: string, nicheId: string, networkId: string) {
  await db.link.create({
    data: {
      id, tenantId, ownerId: `owner-${tenantId}`, nicheId, networkId,
      canonicalUrl: `https://t.me/${id}`, name: id, description: 'd', status: 'PUBLISHED',
    },
  })
}

async function promote(linkId: string, tenantId: string, activatedAt: string, surface: 'HOME' | 'NICHE' = 'HOME') {
  await db.promotion.create({
    data: { tenantId, linkId, surface, status: 'ACTIVE', activatedAt: new Date(activatedAt), expiresAt: new Date('2027-01-01T00:00:00Z') },
  })
}

describe('vitrine paginada e moderação no PostgreSQL', () => {
  beforeAll(async () => {
    await admin.$executeRawUnsafe(`ALTER DATABASE divulgador SET timezone TO 'America/Sao_Paulo'`)
    db = new PrismaClient({ datasources: { db: { url } } })
    const zone = await db.$queryRawUnsafe<Array<{ TimeZone: string }>>('SHOW TIME ZONE')
    expect(zone[0]?.TimeZone).toBe('America/Sao_Paulo')
  })

  afterAll(async () => {
    await db.$disconnect()
    await admin.$executeRawUnsafe('ALTER DATABASE divulgador RESET timezone')
    await admin.$disconnect()
  })

  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE TABLE audit_logs, configs, analytics_events, payments, order_events, order_surfaces, orders, promotions, links, niches, networks, user_identifiers, users, tenants CASCADE')
    for (const tenant of ['ta', 'tb']) {
      await db.tenant.create({ data: { id: tenant, host: `${tenant}.example`, name: tenant } })
      await db.user.create({ data: { id: `owner-${tenant}`, tenantId: tenant, name: 'o', passwordHash: 'x', role: 'USER', status: 'ACTIVE' } })
      await db.network.create({ data: { id: `net-${tenant}`, tenantId: tenant, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
      await db.niche.create({ data: { id: `niche-${tenant}`, tenantId: tenant, name: 'Culinária', slug: 'culinaria' } })
    }
    await db.niche.create({ data: { id: 'niche-adulto', tenantId: 'ta', name: 'Adulto', slug: 'adulto', requiresAge: true } })
  })

  it('pagina patrocinados e orgânicos sem duplicar nem pular, mesmo com fuso não UTC e empate de ativação', async () => {
    const sponsored = ['s1', 's2', 's3', 's4', 's5']
    for (const id of sponsored) await seedLink(id, 'ta', 'niche-ta', 'net-ta')
    await promote('s3', 'ta', '2026-09-01T10:00:00.123Z')
    await promote('s1', 'ta', '2026-09-01T10:00:00.123Z')
    await promote('s5', 'ta', '2026-09-02T00:00:00.000Z')
    await promote('s2', 'ta', '2026-09-03T00:00:00.000Z')
    await promote('s4', 'ta', '2026-09-04T00:00:00.000Z')
    const organic = Array.from({ length: 7 }, (_, index) => `o${index}`)
    for (const id of organic) await seedLink(id, 'ta', 'niche-ta', 'net-ta')
    await seedLink('b1', 'tb', 'niche-tb', 'net-tb')

    const { ids } = await allPages({ tenantId: 'ta', age: 'no', limit: 4 })
    expect(ids).toEqual(['s1', 's3', 's5', 's2', 's4', ...organic])
    expect(new Set(ids).size).toBe(12)
    expect(ids).not.toContain('b1')
  })

  it('página cheia só de patrocinados ainda aponta para os orgânicos', async () => {
    for (const id of ['s1', 's2', 'o1']) await seedLink(id, 'ta', 'niche-ta', 'net-ta')
    await promote('s1', 'ta', '2026-09-01T00:00:00Z')
    await promote('s2', 'ta', '2026-09-02T00:00:00Z')
    const { ids, pages } = await allPages({ tenantId: 'ta', age: 'no', limit: 2 })
    expect(ids).toEqual(['s1', 's2', 'o1'])
    expect(pages).toBe(2)
  })

  it('nicho adulto some sem confirmação de idade e promoção de outra superfície não patrocina a home', async () => {
    await seedLink('adulto', 'ta', 'niche-adulto', 'net-ta')
    await seedLink('comum', 'ta', 'niche-ta', 'net-ta')
    await promote('comum', 'ta', '2026-09-01T00:00:00Z', 'NICHE')
    expect((await allPages({ tenantId: 'ta', age: 'no', limit: 10 })).ids).toEqual(['comum'])
    expect((await allPages({ tenantId: 'ta', age: 'yes', limit: 10 })).ids).toEqual(['adulto', 'comum'])
    const niche = await queryCatalogPage(db, {
      tenantId: 'ta', age: 'no', surface: 'NICHE', nicheSlug: 'culinaria', networkSlug: null, limit: 10, cursor: null,
    })
    expect(niche.rows.map((row) => [row.id, Boolean(row.homeActivatedAt)])).toEqual([['comum', true]])
  })

  it('texto proposto publica com veredito acima do limiar do tenant, audita e não reprocessa', async () => {
    await seedLink('l1', 'ta', 'niche-ta', 'net-ta')
    await db.config.create({ data: { tenantId: 'ta', key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0.8' } })
    await db.auditLog.create({
      data: { tenantId: 'ta', action: 'link.text.proposed', entityType: 'link', entityId: 'l1', before: { name: 'l1' }, after: { name: 'Bolos', description: 'caseiros' } },
    })
    const seen: Array<{ name: string; niche: string }> = []
    const judge = async (text: { name: string; description: string; niche: string }) => {
      seen.push({ name: text.name, niche: text.niche })
      return { pass: true, confidence: 0.95, reasons: [] }
    }
    expect(await settleProposedText({ linkId: 'l1', judge, db })).toBe('PUBLISH')
    expect(await settleProposedText({ linkId: 'l1', judge, db })).toBe('SKIPPED')
    expect(seen).toEqual([{ name: 'Bolos', niche: 'Culinária' }])
    const link = await db.link.findUniqueOrThrow({ where: { id: 'l1' } })
    expect(link).toMatchObject({ name: 'Bolos', description: 'caseiros', approvedName: 'Bolos', embeddingState: 'PENDING' })
    const verdict = await db.auditLog.findFirstOrThrow({ where: { entityId: 'l1', action: 'link.text.verdict' } })
    expect(verdict.after).toMatchObject({ decision: 'PUBLISH', provider: 'adapter', confidence: 0.95, threshold: 0.8 })
  })

  it('sem provedor ou com falha do provedor o texto vai para revisão humana sem publicar', async () => {
    await seedLink('l2', 'ta', 'niche-ta', 'net-ta')
    await seedLink('l3', 'ta', 'niche-ta', 'net-ta')
    await db.config.create({ data: { tenantId: 'ta', key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: '0.8' } })
    for (const id of ['l2', 'l3']) {
      await db.auditLog.create({
        data: { tenantId: 'ta', action: 'link.text.proposed', entityType: 'link', entityId: id, before: {}, after: { name: 'Novo', description: 'x' } },
      })
    }
    expect(await settleProposedText({ linkId: 'l2', db })).toBe('ADMIN')
    expect(await settleProposedText({
      linkId: 'l3',
      db,
      judge: async () => { throw new Error('timeout') },
    })).toBe('ADMIN')
    const links = await db.link.findMany({ where: { id: { in: ['l2', 'l3'] } }, orderBy: { id: 'asc' } })
    expect(links.map((row) => row.name)).toEqual(['l2', 'l3'])
    const verdicts = await db.auditLog.findMany({ where: { action: 'link.text.verdict' }, orderBy: { entityId: 'asc' } })
    expect(verdicts.map((row) => (row.after as { provider: string }).provider)).toEqual(['unavailable', 'error'])
  })

  it('sem limiar configurado a moderação falha em vez de inventar valor', async () => {
    await seedLink('l4', 'ta', 'niche-ta', 'net-ta')
    await db.auditLog.create({
      data: { tenantId: 'ta', action: 'link.text.proposed', entityType: 'link', entityId: 'l4', before: {}, after: { name: 'Novo', description: 'x' } },
    })
    await expect(settleProposedText({ linkId: 'l4', db, judge: async () => ({ pass: true, confidence: 1, reasons: [] }) })).rejects.toThrow()
    expect((await db.link.findUniqueOrThrow({ where: { id: 'l4' } })).name).toBe('l4')
  })
})
