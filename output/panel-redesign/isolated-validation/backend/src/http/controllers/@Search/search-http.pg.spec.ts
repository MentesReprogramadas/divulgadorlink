import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { readSurface } from '@/domain/analytics/surface-token'
import {
  composeSearchForTest,
  resetSearchCandidatesForTest,
  sqlCandidateSource,
} from '@/http/controllers/@Search/routes'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaConfigsRepository, setConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { PrismaLinksRepository, setLinksRepositoryForTest } from '@/repositories/links-repository'
import {
  blendVectors,
  DeterministicTestEmbeddingService,
  deterministicVector,
} from '@/test-support/deterministic-test-embedding'

const url = process.env.SEARCH_DATABASE_URL
if (!url) throw new Error('SEARCH_DATABASE_URL ausente')

const db = new PrismaClient({ datasources: { db: { url } } })
const HOST_A = 'temlinkaqui.com'
const HOST_B = 'outro.example'
const TENANT_A = 'e2e-search-a'
const TENANT_B = 'e2e-search-b'
const SECRET = 'test-jwt-secret-min-16'
const QUERY = 'receitas de bolo'

type Item = {
  id: string
  surfaceToken: string
  textScore: number
  semanticScore: number | null
  relevanceScore: number
  embeddingState: string
}

const query = deterministicVector(QUERY)
const noise = (id: string) => deterministicVector(`ruido-${id}`)
const literal = (vector: number[]) => `[${vector.join(',')}]`
let embedding: DeterministicTestEmbeddingService

function search(host: string, cookie?: string) {
  return app.inject({
    method: 'GET',
    url: `/api/v1/search?q=${encodeURIComponent(QUERY)}`,
    headers: { host, ...(cookie ? { cookie } : {}) },
  })
}

describe('busca HTTP de ponta a ponta: rota → embedding injetado → SQL real no PostgreSQL → rankSearch', () => {
  beforeAll(async () => {
    setTenantsRepositoryForTest({
      async findByHost(host: string) {
        const tenant = await db.tenant.findUnique({ where: { host } })
        return tenant ? { id: tenant.id, host: tenant.host, name: tenant.name } : null
      },
    })
    setLinksRepositoryForTest(new PrismaLinksRepository(db))
    setConfigsRepositoryForTest(new PrismaConfigsRepository(db))
    await app.ready()
    await db.$executeRawUnsafe('TRUNCATE TABLE promotions, links, niches, networks, configs, tenants CASCADE')

    await db.tenant.create({ data: { id: TENANT_A, host: HOST_A, name: 'A' } })
    await db.tenant.create({ data: { id: TENANT_B, host: HOST_B, name: 'B' } })
    for (const tenantId of [TENANT_A, TENANT_B]) {
      await db.config.createMany({
        data: [
          { tenantId, key: 'SEARCH_RELEVANCE_THRESHOLD', value: '0.35' },
          { tenantId, key: 'SEARCH_TEXT_WEIGHT', value: '0.4' },
          { tenantId, key: 'SEARCH_SEMANTIC_WEIGHT', value: '0.6' },
        ],
      })
    }
    await db.network.create({ data: { id: 's-net-a', tenantId: TENANT_A, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.network.create({ data: { id: 's-net-b', tenantId: TENANT_B, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.niche.create({ data: { id: 's-livre', tenantId: TENANT_A, name: 'Culinária', slug: 'culinaria' } })
    await db.niche.create({ data: { id: 's-adulto', tenantId: TENANT_A, name: 'Adulto', slug: 'adulto', requiresAge: true, isPublicFacet: false } })
    await db.niche.create({ data: { id: 's-livre-b', tenantId: TENANT_B, name: 'Culinária', slug: 'culinaria' } })

    const link = async (input: {
      id: string
      name: string
      description: string
      vector: number[]
      tenantId?: string
      nicheId?: string
      status?: 'PUBLISHED' | 'DRAFT'
    }) => {
      const tenantId = input.tenantId ?? TENANT_A
      await db.link.create({
        data: {
          id: input.id,
          tenantId,
          canonicalUrl: `https://t.me/${input.id}`,
          name: input.name,
          description: input.description,
          networkId: tenantId === TENANT_A ? 's-net-a' : 's-net-b',
          nicheId: input.nicheId ?? (tenantId === TENANT_A ? 's-livre' : 's-livre-b'),
          status: input.status ?? 'PUBLISHED',
        },
      })
      await db.$executeRawUnsafe(
        `UPDATE links SET embedding = $1::vector, "embeddingState" = 'READY' WHERE id = $2`,
        literal(input.vector),
        input.id,
      )
    }
    const tieVector = blendVectors(query, noise('empate'), 0.7)
    await link({ id: 'org-alta', name: 'Confeitaria fina', description: 'doces finos', vector: query })
    await link({ id: 'org-media', name: 'Receitas caseiras', description: 'cozinha', vector: blendVectors(query, noise('media'), 0.8) })
    await link({ id: 'tie-b', name: 'Empate', description: 'igual', vector: tieVector })
    await link({ id: 'tie-a', name: 'Empate', description: 'igual', vector: tieVector })
    await link({ id: 'pago-2', name: 'Pago dois', description: 'loja', vector: blendVectors(query, noise('pago-2'), 0.9) })
    await link({ id: 'pago-1', name: 'Pago um', description: 'loja', vector: blendVectors(query, noise('pago-1'), 0.9) })
    await link({ id: 'pago-fraco', name: 'Pago fraco', description: 'loja', vector: noise('pago-fraco') })
    await link({ id: 'fraco', name: 'Fraco', description: 'longe', vector: noise('fraco') })
    await link({ id: 'rascunho', name: 'Rascunho', description: 'oculto', vector: query, status: 'DRAFT' })
    await link({ id: 'adulto', name: 'Adulto', description: 'oculto', vector: query, nicheId: 's-adulto' })
    await link({ id: 'outro', name: 'Outro tenant', description: 'oculto', vector: query, tenantId: TENANT_B })

    const promotion = (id: string, linkId: string, status: 'ACTIVE' | 'EXPIRED', activatedAt: string) =>
      db.promotion.create({
        data: {
          id, tenantId: TENANT_A, linkId, status, surface: 'SEARCH',
          activatedAt: new Date(activatedAt), expiresAt: new Date('2027-01-01'),
        },
      })
    await promotion('p-2', 'pago-2', 'ACTIVE', '2026-09-10T00:00:00Z')
    await promotion('p-1', 'pago-1', 'ACTIVE', '2026-09-01T00:00:00Z')
    await promotion('p-fraco', 'pago-fraco', 'ACTIVE', '2026-08-01T00:00:00Z')
    await promotion('p-expirada', 'org-media', 'EXPIRED', '2026-08-15T00:00:00Z')
  })

  beforeEach(() => {
    resetSearchCandidatesForTest()
    embedding = new DeterministicTestEmbeddingService()
    composeSearchForTest({ embedding: () => embedding, candidates: sqlCandidateSource(db) })
  })

  afterAll(async () => {
    resetSearchCandidatesForTest()
    await db.$disconnect()
  })

  it('atravessa embedding, SQL e ranking e devolve o JSON final ordenado', async () => {
    const response = await search(HOST_A)

    expect(response.statusCode).toBe(200)
    expect(embedding.calls).toEqual([QUERY])
    const body = response.json() as { target: unknown; threshold: number; sponsored: Item[]; organic: Item[] }
    expect(body.target).toEqual({ kind: 'results', slug: null, name: null })
    expect(body.threshold).toBe(0.35)
    expect(body.sponsored.map((row) => row.id)).toEqual(['pago-1', 'pago-2'])
    expect(body.organic.map((row) => row.id)).toEqual(['org-alta', 'org-media', 'tie-a', 'tie-b'])

    for (const row of [...body.sponsored, ...body.organic]) {
      expect(row.embeddingState).toBe('READY')
      expect(row.relevanceScore).toBeCloseTo(0.4 * row.textScore + 0.6 * (row.semanticScore ?? 0), 10)
      expect(row.relevanceScore).toBeGreaterThanOrEqual(0.35)
      expect(readSurface(TENANT_A, row.id, row.surfaceToken, SECRET)).toBe('search')
    }
    const byId = new Map(body.organic.map((row) => [row.id, row]))
    expect(byId.get('org-alta')!.semanticScore).toBeCloseTo(1, 6)
    expect(byId.get('org-alta')!.textScore).toBeLessThan(1e-10)
    expect(byId.get('org-media')!.textScore).toBeGreaterThan(0)
    expect(byId.get('org-media')!.semanticScore).toBeCloseTo(0.8, 1)
    expect(byId.get('tie-a')!.relevanceScore).toBe(byId.get('tie-b')!.relevanceScore)

    const json = response.body
    for (const absent of ['outro', 'rascunho', 'adulto', 'fraco', 'pago-fraco']) {
      expect(json).not.toContain(`"id":"${absent}"`)
    }
  })

  it('adulto entra só com idade confirmada e empata com org-alta, saindo por id', async () => {
    const confirmed = await search(HOST_A, 'age=yes')
    const refused = await search(HOST_A, 'age=no')

    expect(embedding.calls).toEqual([QUERY, QUERY])
    expect(confirmed.json().organic.map((row: Item) => row.id)).toEqual(['adulto', 'org-alta', 'org-media', 'tie-a', 'tie-b'])
    expect(refused.json().organic.map((row: Item) => row.id)).toEqual(['org-alta', 'org-media', 'tie-a', 'tie-b'])
  })

  it('outro host só vê o próprio tenant', async () => {
    const response = await search(HOST_B)

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.sponsored).toEqual([])
    expect(body.organic.map((row: Item) => row.id)).toEqual(['outro'])
    expect(readSurface(TENANT_B, 'outro', body.organic[0].surfaceToken, SECRET)).toBe('search')
  })

  it('falha do provedor de embedding vira 503 e o SQL não roda', async () => {
    let sqlCalls = 0
    const real = sqlCandidateSource(db)
    composeSearchForTest({
      embedding: () => ({ embed: async () => { throw new Error('provedor fora') } }),
      candidates: async (input) => {
        sqlCalls += 1
        return real(input)
      },
    })

    const response = await search(HOST_A)

    expect(response.statusCode).toBe(503)
    expect(response.json()).toMatchObject({ code: 'provider_error' })
    expect(sqlCalls).toBe(0)
  })
})
