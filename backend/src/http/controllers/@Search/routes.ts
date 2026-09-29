import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { readConfig, type ConfigKey } from '@/domain/config/read-config'
import { OpenAiEmbeddingService } from '@/adapters/embeddings/openai-embedding-service'
import { env } from '@/env'
import { buildError, provider_error } from '@/http/errors'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { getConfigsRepository } from '@/repositories/configs-repository'
import { getLinksRepository } from '@/repositories/links-repository'
import type { EmbeddingService } from '@/domain/embeddings/embedding-service'
import {
  autocompleteIds,
  hybridSearchSql,
  rankSearch,
  relevanceScore,
  resolveSearchTarget,
  visibleForAge,
} from '@/use-cases/@Search/rank-links'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export type SearchCandidate = {
  id: string
  name: string
  description: string
  relevance: number
  textScore: number
  semanticScore: number | null
  embeddingState: 'ABSENT' | 'PENDING' | 'READY' | 'FAILED'
  searchActivatedAt: Date | null
  requiresAge: boolean
}

let testCandidates: SearchCandidate[] = []

export function setSearchCandidatesForTest(rows: SearchCandidate[]): void {
  testCandidates = rows.map((row) => ({ ...row }))
}

export function resetSearchCandidatesForTest(): void {
  testCandidates = []
}

function ageFromCookie(request: FastifyRequest): 'yes' | 'no' | 'unknown' {
  const age = request.cookies.age
  if (age === 'yes' || age === 'no') return age
  return 'unknown'
}

async function configRows(tenantId: string): Promise<Partial<Record<ConfigKey, string>>> {
  const repo = getConfigsRepository()
  const keys: ConfigKey[] = ['SEARCH_RELEVANCE_THRESHOLD', 'SEARCH_TEXT_WEIGHT', 'SEARCH_SEMANTIC_WEIGHT']
  const rows: Partial<Record<ConfigKey, string>> = {}
  for (const key of keys) {
    const row = await repo.findByTenantAndKey(tenantId, key)
    if (row) rows[key] = row.value
  }
  return rows
}

function toDto(row: SearchCandidate, threshold: number) {
  return {
    id: row.id,
    textScore: row.textScore,
    semanticScore: row.semanticScore,
    relevanceScore: row.relevance,
    embeddingState: row.embeddingState,
    threshold,
  }
}

async function loadCandidates(
  tenantId: string,
  query: string,
  age: 'yes' | 'no' | 'unknown',
  textWeight: number,
  semanticWeight: number,
  threshold: number,
  embedding: EmbeddingService,
): Promise<SearchCandidate[]> {
  if (process.env.NODE_ENV === 'test') {
    return testCandidates.map((row) => ({
      ...row,
      relevance: relevanceScore(row.textScore, row.semanticScore ?? 0, textWeight, semanticWeight),
    }))
  }

  const vector = await embedding.embed(query)
  const literal = `[${vector.join(',')}]`
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string
    text_score: number
    semantic_score: number | null
    embeddingState: SearchCandidate['embeddingState']
    search_activated_at: Date | null
  }>>(hybridSearchSql(), query, literal, tenantId, age, textWeight, semanticWeight, threshold)

  return rows.map((row) => ({
    id: row.id,
    name: '',
    description: '',
    textScore: Number(row.text_score),
    semanticScore: row.semantic_score === null ? null : Number(row.semantic_score),
    embeddingState: row.embeddingState,
    relevance: relevanceScore(
      Number(row.text_score),
      row.semantic_score === null ? 0 : Number(row.semantic_score),
      textWeight,
      semanticWeight,
    ),
    searchActivatedAt: row.search_activated_at,
    requiresAge: false,
  }))
}

export async function getSearch(request: FastifyRequest, reply: FastifyReply) {
  const query = typeof (request.query as { q?: string }).q === 'string' ? (request.query as { q: string }).q : ''
  try {
    const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0] || '')
    const rows = await configRows(tenant.id)
    const threshold = readConfig(rows, 'SEARCH_RELEVANCE_THRESHOLD')
    const textWeight = readConfig(rows, 'SEARCH_TEXT_WEIGHT')
    const semanticWeight = readConfig(rows, 'SEARCH_SEMANTIC_WEIGHT')
    const niches = await getLinksRepository().listNiches(tenant.id)
    const target = resolveSearchTarget(
      query,
      niches.filter((niche) => niche.isPublicFacet).map((niche) => ({ slug: niche.slug, name: niche.name })),
      [],
    )
    const age = ageFromCookie(request)
    const matched = niches.find((niche) => niche.slug === target.slug)
    if (target.kind !== 'results') {
      if (matched?.requiresAge && age !== 'yes') {
        return reply.status(200).send({ target, threshold, sponsored: [], organic: [] })
      }
      return reply.status(200).send({ target, threshold, sponsored: [], organic: [] })
    }

    const embedding = new OpenAiEmbeddingService(env.OPENAI_API_KEY ?? '')
    let candidates: SearchCandidate[]
    try {
      candidates = await loadCandidates(tenant.id, query, age, textWeight, semanticWeight, threshold, embedding)
    } catch {
      return reply.status(503).send(buildError({ code: provider_error, message: 'Busca indisponível.', request_id: request.id }))
    }

    const visible = visibleForAge(candidates, age)
    const ranked = rankSearch(visible, threshold)
    return reply.status(200).send({
      target,
      threshold,
      sponsored: ranked.sponsored.map((row) => toDto(row, threshold)),
      organic: ranked.organic.map((row) => toDto(row, threshold)),
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function getSuggest(request: FastifyRequest, reply: FastifyReply) {
  const query = typeof (request.query as { q?: string }).q === 'string' ? (request.query as { q: string }).q : ''
  const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0] || '')
  const rows = await configRows(tenant.id)
  const threshold = readConfig(rows, 'SEARCH_RELEVANCE_THRESHOLD')
  const textWeight = readConfig(rows, 'SEARCH_TEXT_WEIGHT')
  const semanticWeight = readConfig(rows, 'SEARCH_SEMANTIC_WEIGHT')
  const age = ageFromCookie(request)
  const needle = query.trim().toLowerCase()
  const source = process.env.NODE_ENV === 'test'
    ? testCandidates
      .filter((row) => row.name.toLowerCase().includes(needle))
      .map((row) => ({
        ...row,
        relevance: relevanceScore(row.textScore, row.semanticScore ?? 0, textWeight, semanticWeight),
      }))
    : await prisma.$queryRawUnsafe<SearchCandidate[]>(
      `
        SELECT l."id", l."name", '' AS description, 1 AS relevance, 1 AS "textScore", NULL AS "semanticScore",
          l."embeddingState", NULL::timestamp AS "searchActivatedAt", n."requiresAge"
        FROM "links" l
        JOIN "niches" n ON n."id" = l."nicheId"
        WHERE l."tenantId" = $1 AND l."status" = 'PUBLISHED'
          AND ($2::text = 'yes' OR n."requiresAge" = false)
          AND l."name" ILIKE '%' || $3 || '%'
        LIMIT 8
      `,
      tenant.id,
      age,
      query.trim(),
    )
  const visible = visibleForAge(source, age)
  return reply.status(200).send({
    ids: autocompleteIds(visible, threshold, 8),
  })
}

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search', getSearch)
  app.get('/search/suggest', getSuggest)
}
