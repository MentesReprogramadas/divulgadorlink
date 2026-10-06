import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { signSurface, type AnalyticsOrigin } from '@/domain/analytics/surface-token'
import { PUBLIC_LINK_FILTER } from '@/domain/catalog/public-link'
import { env } from '@/env'
import { buildError, not_found } from '@/http/errors'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { impressionsEnabled } from '@/domain/config/read-config'
import { getAnalyticsRepository } from '@/repositories/analytics-repository'
import { getConfigsRepository } from '@/repositories/configs-repository'
import { getLinksRepository } from '@/repositories/links-repository'
import { capLimit, decodeCursor, InvalidCursorError, pageRanked } from '@/http/catalog-page'
import { queryCatalogPage } from '@/http/catalog-query'
import { indexableEntries } from '@/http/sitemap-index'
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

async function publicImpressions(tenantId: string): Promise<boolean> {
  const row = await getConfigsRepository().findByTenantAndKey(tenantId, 'SHOW_IMPRESSIONS')
  return impressionsEnabled(row?.value)
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

type CardSource = {
  id: string
  name: string
  description: string
  nicheName?: string | null
  nicheSlug?: string | null
  networkName?: string | null
  networkSlug?: string | null
}

function card(tenantId: string, row: CardSource, origin: AnalyticsOrigin) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    surfaceToken: signSurface(tenantId, row.id, origin, env.JWT_SECRET),
    niche: row.nicheName ? { name: row.nicheName, slug: row.nicheSlug ?? '' } : null,
    network: row.networkName ? { name: row.networkName, slug: row.networkSlug ?? '' } : null,
  }
}

async function counted(tenantId: string, rows: CardSource[], origin: AnalyticsOrigin) {
  const counts = await getAnalyticsRepository().impressionTotals(tenantId, rows.map((row) => row.id))
  return rows.map((row) => ({
    ...card(tenantId, row, origin),
    impressions: counts.get(row.id) ?? 0,
  }))
}

const HOME_DESCRIPTION = 'Links, comunidades e serviços organizados por tema e rede.'

function facetPath(kind: 'niche' | 'network', slug: string): string {
  return `${kind === 'niche' ? '/nicho' : '/rede'}/${slug}`
}

function facetDescription(kind: 'niche' | 'network', name: string): string {
  return kind === 'niche'
    ? `Links de ${name} organizados por rede.`
    : `Links publicados em ${name}.`
}

function seo(
  host: string,
  title: string,
  description: string,
  path: string,
  robots: 'index,follow' | 'noindex,nofollow',
  type: 'WebSite' | 'CollectionPage' | 'WebPage',
) {
  const canonical = `https://${host}${path}`
  return {
    title,
    description,
    canonical,
    robots,
    openGraph: { title, description, url: canonical },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': type,
      name: title,
      description,
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
    type CardRow = { id: string; name: string; description: string; nicheName?: string | null; nicheSlug?: string | null; networkName?: string | null; networkSlug?: string | null }
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
      seo: seo(host, tenant.name, HOME_DESCRIPTION, '/', 'index,follow', 'WebSite'),
      networks: networks
        .filter((row) => row.isPublicFacet)
        .map((row) => ({ id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge === true })),
      niches: niches
        .filter((row) => row.isPublicFacet)
        .map((row) => ({ id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge })),
      showImpressions: await publicImpressions(tenant.id),
      sponsored: await counted(tenant.id, page.sponsored, 'home'),
      organic: await counted(tenant.id, page.organic, 'home'),
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

function slugOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const slug = value.trim()
  return /^[a-z0-9-]{1,80}$/.test(slug) ? slug : null
}

async function companionFacets(
  tenantId: string,
  kind: 'niche' | 'network',
  slug: string,
): Promise<Array<{ id: string; name: string; slug: string; requiresAge?: boolean }>> {
  const repo = getLinksRepository()
  if (process.env.NODE_ENV === 'test') {
    const rows = linksFor().filter((row) => kind === 'network' ? row.networkSlug === slug : row.nicheSlug === slug)
    if (kind === 'network') {
      const wanted = new Set(rows.map((row) => row.nicheSlug))
      return (await repo.listNiches(tenantId))
        .filter((row) => row.isPublicFacet && wanted.has(row.slug))
        .map((row) => ({ id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge }))
    }
    const wanted = new Set(rows.map((row) => row.networkSlug))
    return (await repo.listNetworks(tenantId))
      .filter((row) => row.isPublicFacet && wanted.has(row.slug))
      .map((row) => ({ id: row.id, name: row.name, slug: row.slug }))
  }
  const opposite = kind === 'network' ? 'niche' : 'network'
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; slug: string; requiresAge: boolean }>>(
    opposite === 'niche'
      ? `
        SELECT DISTINCT n."id", n."name", n."slug", n."requiresAge"
        FROM "links" l
        JOIN "niches" n ON n."id" = l."nicheId"
        JOIN "networks" net ON net."id" = l."networkId"
        WHERE l."tenantId" = $1 AND ${PUBLIC_LINK_FILTER} AND net."slug" = $2 AND n."isPublicFacet" = true
        ORDER BY n."name" ASC
      `
      : `
        SELECT DISTINCT net."id", net."name", net."slug", net."requiresAge"
        FROM "links" l
        JOIN "niches" n ON n."id" = l."nicheId"
        JOIN "networks" net ON net."id" = l."networkId"
        WHERE l."tenantId" = $1 AND ${PUBLIC_LINK_FILTER} AND n."slug" = $2 AND net."isPublicFacet" = true
        ORDER BY net."name" ASC
      `,
    tenantId,
    slug,
  )
  return rows.map((row) => (
    opposite === 'niche'
      ? { id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge }
      : { id: row.id, name: row.name, slug: row.slug }
  ))
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
    const query = request.query as { limit?: string; cursor?: string; niche?: string; network?: string }
    const filterNiche = kind === 'network' ? slugOf(query.niche) : null
    const filterNetwork = kind === 'niche' ? slugOf(query.network) : null
    const niches = kind === 'network' ? await companionFacets(tenant.id, 'network', slug) : undefined
    const networks = kind === 'niche' ? await companionFacets(tenant.id, 'niche', slug) : undefined
    const requiresAge = 'requiresAge' in facet ? facet.requiresAge : false
    const filterRequiresAge = Boolean(niches?.find((row) => row.slug === filterNiche)?.requiresAge)
    const adult = Boolean(requiresAge || filterRequiresAge)
    const facetSeo = seo(
      host,
      facet.name,
      facetDescription(kind, facet.name),
      facetPath(kind, slug),
      adult ? 'noindex,nofollow' : 'index,follow',
      adult ? 'WebPage' : 'CollectionPage',
    )
    if (adult && age !== 'yes') {
      return reply.status(200).send({
        seo: facetSeo,
        ageRequired: age === 'unknown',
        ...(age === 'no' ? { blocked: true } : {}),
        showImpressions: await publicImpressions(tenant.id),
        ...(niches ? { niches } : {}),
        ...(networks ? { networks } : {}),
        sponsored: [],
        organic: [],
      })
    }
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
        nicheSlug: kind === 'niche' ? slug : filterNiche,
        networkSlug: kind === 'network' ? slug : filterNetwork,
        limit,
        cursor,
      })
      const sponsored = loaded.rows.filter((row) => row.homeActivatedAt)
      const organic = loaded.rows.filter((row) => !row.homeActivatedAt)
      return reply.status(200).send({
        seo: facetSeo,
        showImpressions: await publicImpressions(tenant.id),
        ...(niches ? { niches } : {}),
        ...(networks ? { networks } : {}),
        sponsored: await counted(tenant.id, sponsored, origin),
        organic: await counted(tenant.id, organic, origin),
        nextCursor: loaded.nextCursor,
      })
    }
    const rows = linksFor().filter((row) => {
      if (kind === 'niche') return row.nicheSlug === slug && (!filterNetwork || row.networkSlug === filterNetwork)
      return row.networkSlug === slug && (!filterNiche || row.nicheSlug === filterNiche)
    })
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
      seo: facetSeo,
      showImpressions: await publicImpressions(tenant.id),
      ...(niches ? { niches } : {}),
      ...(networks ? { networks } : {}),
      sponsored: await counted(tenant.id, page.sponsored.map((row) => present(row.id)), origin),
      organic: await counted(tenant.id, page.organic.map((row) => present(row.id)), origin),
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

async function setAge(request: FastifyRequest, reply: FastifyReply) {
  const choice = (request.body as { choice?: unknown } | null)?.choice
  if (choice !== 'yes' && choice !== 'no') {
    return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
  }
  reply.setCookie('age', choice, {
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  })
  return reply.status(204).send()
}

async function getSitemap(request: FastifyRequest, reply: FastifyReply) {
  try {
    const host = hostFromRequest(request)
    const tenant = await resolveTenant(host)
    return reply.status(200).send({ entries: await indexableEntries(tenant.id) })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/home', getHome)
  app.get('/sitemap', getSitemap)
  app.post('/age', setAge)
  app.get('/niches/:slug', (request, reply) => getFacet(request, reply, 'niche'))
  app.get('/networks/:slug', (request, reply) => getFacet(request, reply, 'network'))
}
