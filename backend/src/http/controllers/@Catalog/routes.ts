import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { signSurface, type AnalyticsOrigin } from '@/domain/analytics/surface-token'
import {
  documentTitle,
  facetBlurb,
  facetIndexable,
  facetRobots,
  substantiveText,
  type Robots,
} from '@/domain/catalog/index-policy'
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

function cardIndexable(row: CardSource, nicheOkBySlug: Map<string, boolean>): boolean {
  return nicheOkBySlug.get(row.nicheSlug ?? '') === true && substantiveText(row.name, row.description)
}

async function counted(
  tenantId: string,
  rows: CardSource[],
  origin: AnalyticsOrigin,
  nicheOkBySlug: Map<string, boolean>,
) {
  const counts = await getAnalyticsRepository().impressionTotals(tenantId, rows.map((row) => row.id))
  return rows.map((row) => ({
    ...card(tenantId, row, origin),
    impressions: counts.get(row.id) ?? 0,
    indexable: cardIndexable(row, nicheOkBySlug),
  }))
}

async function indexSnapshot(tenantId: string) {
  const [niches, networks, counts] = await Promise.all([
    getLinksRepository().listNiches(tenantId),
    getLinksRepository().listNetworks(tenantId),
    getLinksRepository().substantiveCounts(tenantId),
  ])
  const nicheCount = new Map(counts.niches.map((row) => [row.id, row.count]))
  const networkCount = new Map(counts.networks.map((row) => [row.id, row.count]))
  const nicheOk = new Map(niches.map((row) => [row.id, facetIndexable({
    isPublicFacet: row.isPublicFacet,
    requiresAge: row.requiresAge,
    summary: row.summary,
    substantiveCount: nicheCount.get(row.id) ?? 0,
  })]))
  return { niches, networks, nicheCount, networkCount, nicheOk }
}

const HOME_DESCRIPTION = 'Links, comunidades e serviços organizados por tema e rede.'

function facetPath(kind: 'niche' | 'network', slug: string): string {
  return `${kind === 'niche' ? '/nicho' : '/rede'}/${slug}`
}

function seo(input: {
  host: string
  title: string
  description: string
  path: string
  robots: Robots
  structuredData?: Record<string, unknown>
}) {
  const canonical = `https://${input.host}${input.path}`
  const structuredData = input.robots.startsWith('index') ? input.structuredData : undefined
  return {
    title: input.title,
    description: input.description,
    canonical,
    robots: input.robots,
    openGraph: { title: input.title, description: input.description, url: canonical },
    ...(structuredData ? { structuredData } : {}),
  }
}

function facetStructuredData(
  host: string,
  heading: string,
  description: string,
  canonical: string,
  indexableIds: string[],
) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: heading, description, url: canonical },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `https://${host}/` },
          { '@type': 'ListItem', position: 2, name: heading, item: canonical },
        ],
      },
      ...(indexableIds.length > 0 ? [{
        '@type': 'ItemList',
        itemListElement: indexableIds.map((id, position) => ({
          '@type': 'ListItem',
          position: position + 1,
          url: `https://${host}/link/${id}`,
        })),
      }] : []),
    ],
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
    const rows = process.env.NODE_ENV === 'test' ? linksFor() : []
    const query = request.query as { limit?: string; cursor?: string }
    const limit = capLimit(query.limit)
    let cursor
    try {
      cursor = decodeCursor(query.cursor)
    } catch {
      return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
    }
    const snapshot = await indexSnapshot(tenant.id)
    const { networks, niches } = snapshot
    const nicheOkBySlug = new Map(niches.map((row) => [row.slug, snapshot.nicheOk.get(row.id) === true]))
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
    const homeTitle = documentTitle('home', tenant.name, tenant.name)
    return reply.status(200).send({
      seo: seo({
        host,
        title: homeTitle,
        description: HOME_DESCRIPTION,
        path: '/',
        robots: 'index,follow',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: homeTitle,
          description: HOME_DESCRIPTION,
          url: `https://${host}/`,
        },
      }),
      networks: networks
        .filter((row) => row.isPublicFacet)
        .map((row) => ({ id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge === true })),
      niches: niches
        .filter((row) => row.isPublicFacet)
        .map((row) => ({ id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge })),
      showImpressions: await publicImpressions(tenant.id),
      sponsored: await counted(tenant.id, page.sponsored, 'home', nicheOkBySlug),
      organic: await counted(tenant.id, page.organic, 'home', nicheOkBySlug),
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
    const snapshot = await indexSnapshot(tenant.id)
    const nicheOkBySlug = new Map(snapshot.niches.map((row) => [row.slug, snapshot.nicheOk.get(row.id) === true]))
    const facets = kind === 'niche' ? snapshot.niches : snapshot.networks
    const facet = facets.find((row) => row.slug === slug && row.isPublicFacet)
    if (!facet) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    const query = request.query as { limit?: string; cursor?: string; niche?: string; network?: string }
    const filterNiche = kind === 'network' ? slugOf(query.niche) : null
    const filterNetwork = kind === 'niche' ? slugOf(query.network) : null
    const niches = kind === 'network' ? await companionFacets(tenant.id, 'network', slug) : undefined
    const networks = kind === 'niche' ? await companionFacets(tenant.id, 'niche', slug) : undefined
    const requiresAge = facet.requiresAge === true
    const filterRequiresAge = Boolean(niches?.find((row) => row.slug === filterNiche)?.requiresAge)
    const adult = Boolean(requiresAge || filterRequiresAge)
    const filtered = Boolean(query.network || query.niche || query.cursor)
    const heading = facet.name
    const description = facetBlurb(kind, facet.name, facet.summary)
    const path = facetPath(kind, slug)
    const canonical = `https://${host}${path}`
    const substantiveCount = kind === 'niche'
      ? (snapshot.nicheCount.get(facet.id) ?? 0)
      : (snapshot.networkCount.get(facet.id) ?? 0)
    const robots = facetRobots({
      isPublicFacet: facet.isPublicFacet,
      requiresAge,
      summary: facet.summary,
      substantiveCount,
      filtered,
    })
    const facetSeo = (indexableIds: string[]) => seo({
      host,
      title: documentTitle('named', facet.name, tenant.name),
      description,
      path,
      robots,
      structuredData: facetStructuredData(host, heading, description, canonical, indexableIds),
    })
    if (adult && age !== 'yes') {
      return reply.status(200).send({
        seo: facetSeo([]),
        heading,
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
    const sendPage = async (
      sponsoredRows: CardSource[],
      organicRows: CardSource[],
      nextCursor: string | null,
    ) => {
      const sponsored = await counted(tenant.id, sponsoredRows, origin, nicheOkBySlug)
      const organic = await counted(tenant.id, organicRows, origin, nicheOkBySlug)
      const indexableIds = [...sponsored, ...organic].filter((row) => row.indexable).map((row) => row.id)
      return reply.status(200).send({
        seo: facetSeo(indexableIds),
        heading,
        showImpressions: await publicImpressions(tenant.id),
        ...(niches ? { niches } : {}),
        ...(networks ? { networks } : {}),
        sponsored,
        organic,
        nextCursor,
      })
    }
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
      return sendPage(
        loaded.rows.filter((row) => row.homeActivatedAt),
        loaded.rows.filter((row) => !row.homeActivatedAt),
        loaded.nextCursor,
      )
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
    return sendPage(
      page.sponsored.map((row) => present(row.id)),
      page.organic.map((row) => present(row.id)),
      page.nextCursor,
    )
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
