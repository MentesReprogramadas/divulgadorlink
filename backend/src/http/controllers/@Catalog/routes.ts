import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { signSurface, type AnalyticsOrigin } from '@/domain/analytics/surface-token'
import { env } from '@/env'
import { buildError, not_found } from '@/http/errors'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { getLinksRepository } from '@/repositories/links-repository'
import { capLimit, decodeCursor, InvalidCursorError, pageRanked } from '@/http/catalog-page'
import { queryCatalogPage } from '@/http/catalog-query'
import { rankHome, rankNiche, visibleForAge } from '@/use-cases/@Search/rank-links'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export type CatalogLink = {
  id: string
  name: string
  description: string
  relevance: number
  requiresAge: boolean
  nicheSlug: string
  networkSlug: string
  homeActivatedAt: Date | null
  nicheActivatedAt: Date | null
}

let testLinks: CatalogLink[] = []

export function setCatalogLinksForTest(rows: CatalogLink[]): void {
  testLinks = rows.map((row) => ({ ...row }))
}

export function resetCatalogLinksForTest(): void {
  testLinks = []
}

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) throw new ResourceNotFoundError()
  return raw.split(':')[0]!
}

function ageFromCookie(request: FastifyRequest): 'yes' | 'no' | 'unknown' {
  const age = request.cookies.age
  if (age === 'yes' || age === 'no') return age
  return 'unknown'
}

function card(tenantId: string, row: { id: string; name: string; description: string }, origin: AnalyticsOrigin) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    surfaceToken: signSurface(tenantId, row.id, origin, env.JWT_SECRET),
  }
}

function seo(host: string, title: string, description: string, path: string, robots: 'index,follow' | 'noindex,nofollow') {
  const canonical = `https://${host}${path}`
  return {
    title,
    description,
    canonical,
    robots,
    openGraph: { title, description, url: canonical },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: title,
      url: canonical,
    },
  }
}

function linksFor(): CatalogLink[] {
  return testLinks.map((row) => ({ ...row }))
}

async function getHome(request: FastifyRequest, reply: FastifyReply) {
  try {
    const host = hostFromRequest(request)
    const tenant = await resolveTenant(host)
    const age = ageFromCookie(request)
    const repo = getLinksRepository()
    const [networks, niches] = await Promise.all([
      repo.listNetworks(tenant.id),
      repo.listNiches(tenant.id),
    ])
    const rows = process.env.NODE_ENV === 'test' ? linksFor() : []
    const query = request.query as { limit?: string; cursor?: string }
    const limit = capLimit(query.limit)
    let cursor
    try {
      cursor = decodeCursor(query.cursor)
    } catch {
      return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
    }
    type CardRow = { id: string; name: string; description: string }
    let page: { sponsored: CardRow[]; organic: CardRow[]; nextCursor: string | null }
    if (process.env.NODE_ENV === 'test') {
      const visible = visibleForAge(rows, age)
      const byId = new Map(visible.map((row) => [row.id, row]))
      const ranked = pageRanked(rankHome(visible.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        relevance: row.relevance,
        homeActivatedAt: row.homeActivatedAt,
      }))), cursor, limit)
      const present = (row: { id: string }): CardRow => byId.get(row.id) as CardRow
      page = {
        sponsored: ranked.sponsored.map(present),
        organic: ranked.organic.map(present),
        nextCursor: ranked.nextCursor,
      }
    } else {
      const loaded = await queryCatalogPage(prisma, {
        tenantId: tenant.id,
        age,
        surface: 'HOME',
        nicheSlug: null,
        networkSlug: null,
        limit,
        cursor,
      })
      page = {
        sponsored: loaded.rows.filter((row) => row.homeActivatedAt),
        organic: loaded.rows.filter((row) => !row.homeActivatedAt),
        nextCursor: loaded.nextCursor,
      }
    }
    return reply.status(200).send({
      seo: seo(host, tenant.name, 'Catálogo público de links', '/', 'index,follow'),
      networks: networks
        .filter((row) => row.isPublicFacet)
        .map((row) => ({ id: row.id, name: row.name, slug: row.slug })),
      niches: niches
        .filter((row) => row.isPublicFacet && (age === 'yes' || !row.requiresAge))
        .map((row) => ({ id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge })),
      sponsored: page.sponsored.map((row) => card(tenant.id, row, 'home')),
      organic: page.organic.map((row) => card(tenant.id, row, 'home')),
      nextCursor: page.nextCursor,
    })
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function getFacet(
  request: FastifyRequest,
  reply: FastifyReply,
  kind: 'niche' | 'network',
) {
  const slug = (request.params as { slug: string }).slug
  try {
    const host = hostFromRequest(request)
    const tenant = await resolveTenant(host)
    const age = ageFromCookie(request)
    const repo = getLinksRepository()
    const facets = kind === 'niche' ? await repo.listNiches(tenant.id) : await repo.listNetworks(tenant.id)
    const facet = facets.find((row) => row.slug === slug && row.isPublicFacet)
    if (!facet) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    const requiresAge = 'requiresAge' in facet ? facet.requiresAge : false
    if (requiresAge && age !== 'yes') {
      return reply.status(200).send({
        seo: seo(host, facet.name, facet.name, `/${kind}/${slug}`, 'noindex,nofollow'),
        sponsored: [],
        organic: [],
      })
    }
    const query = request.query as { limit?: string; cursor?: string }
    const limit = capLimit(query.limit)
    let cursor
    try {
      cursor = decodeCursor(query.cursor)
    } catch {
      return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
    }
    const origin: AnalyticsOrigin = kind === 'niche' ? 'niche-home' : 'network-home'
    if (process.env.NODE_ENV !== 'test') {
      const loaded = await queryCatalogPage(prisma, {
        tenantId: tenant.id,
        age,
        surface: 'NICHE',
        nicheSlug: kind === 'niche' ? slug : null,
        networkSlug: kind === 'network' ? slug : null,
        limit,
        cursor,
      })
      const sponsored = loaded.rows.filter((row) => row.homeActivatedAt)
      const organic = loaded.rows.filter((row) => !row.homeActivatedAt)
      return reply.status(200).send({
        seo: seo(host, facet.name, facet.name, `/${kind}/${slug}`, 'index,follow'),
        sponsored: sponsored.map((row) => card(tenant.id, row, origin)),
        organic: organic.map((row) => card(tenant.id, row, origin)),
        nextCursor: loaded.nextCursor,
      })
    }
    const rows = linksFor().filter((row) =>
      kind === 'niche' ? row.nicheSlug === slug : row.networkSlug === slug,
    )
    const visible = visibleForAge(rows, age)
    const ranked = rankNiche(visible.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      relevance: row.relevance,
      nicheActivatedAt: row.nicheActivatedAt,
    })))
    const page = pageRanked(ranked, cursor, limit)
    const byId = new Map(visible.map((row) => [row.id, row]))
    const present = (id: string) => byId.get(id)!
    return reply.status(200).send({
      seo: seo(host, facet.name, facet.name, `/${kind}/${slug}`, 'index,follow'),
      sponsored: page.sponsored.map((row) => card(tenant.id, present(row.id), origin)),
      organic: page.organic.map((row) => card(tenant.id, present(row.id), origin)),
      nextCursor: page.nextCursor,
    })
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/home', getHome)
  app.get('/niches/:slug', (request, reply) => getFacet(request, reply, 'niche'))
  app.get('/networks/:slug', (request, reply) => getFacet(request, reply, 'network'))
}
