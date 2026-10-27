import { approvedMediaForCards } from '@/http/link-media-projection'
import {createHash} from 'node:crypto'
import {readSeoInventory,facetEditorial,facetEligible,linkProjection,publicCollections,collectionLinks} from '@/http/catalog-seo-inventory'
import {ZodError} from 'zod'
import {cityById,parseDiscovery,matchesDiscovery,type DiscoveryMetadata} from '@/domain/catalog/discovery-metadata'
import {discoveryCursorContext,tagDiscoveryCursor} from '@/http/catalog-page'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { signSurface, type AnalyticsOrigin } from '@/domain/analytics/surface-token'
import {
  documentTitle,
  type Robots,
} from '@/domain/catalog/index-policy'
import { PUBLIC_LINK_FILTER } from '@/domain/catalog/public-link'
import { env } from '@/env'
import { buildError, not_found } from '@/http/errors'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { impressionsEnabled } from '@/domain/config/read-config'
import { getAnalyticsRepository } from '@/repositories/analytics-repository'
import { getConfigsRepository } from '@/repositories/configs-repository'
import { getLinksRepository } from '@/repositories/links-repository'
import { capLimit, decodeCursor, encodeCursor, InvalidCursorError, pageRanked } from '@/http/catalog-page'
import { hasRestrictedCatalogContent, queryCatalogPage } from '@/http/catalog-query'
import { indexableEntries } from '@/http/sitemap-index'
import { rankHome, rankNiche, visibleForAge } from '@/use-cases/@Search/rank-links'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export type CatalogLink = Partial<DiscoveryMetadata> & {
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
  return normalizeTenantHost(raw)
}

function ageFromCookie(request: FastifyRequest): 'yes' | 'no' | 'unknown' {
  const age = request.cookies.age
  if (age === 'yes' || age === 'no') return age
  return 'unknown'
}

type CardSource = Partial<DiscoveryMetadata> & {
  id: string
  name: string
  description: string
  nicheName?: string | null
  nicheSlug?: string | null
  networkName?: string | null
  networkSlug?: string | null
  requiresAge?: boolean
}

function card(tenantId: string, row: CardSource, origin: AnalyticsOrigin) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    discovery: { city: cityById(row.cityId), languageTag: row.languageTag ?? null, modality: row.modality ?? null },
    surfaceToken: signSurface(tenantId, row.id, origin, env.JWT_SECRET),
    niche: row.nicheName ? { name: row.nicheName, slug: row.nicheSlug ?? '' } : null,
    network: row.networkName ? { name: row.networkName, slug: row.networkSlug ?? '' } : null,
  }
}

function cardIndexable(row: CardSource, nicheOkBySlug: Map<string, boolean>): boolean {
  return row.requiresAge !== true && nicheOkBySlug.get(row.nicheSlug ?? '') === true
}

async function counted(
  tenantId: string,
  rows: CardSource[],
  origin: AnalyticsOrigin,
  nicheOkBySlug: Map<string, boolean>,
) {
  const counts = await getAnalyticsRepository().impressionTotals(tenantId, rows.map((row) => row.id))
  const media = await approvedMediaForCards(tenantId, rows)
  return rows.map((row) => ({
    ...card(tenantId, row, origin),
    ...media.get(row.id),
    impressions: counts.get(row.id) ?? 0,
    indexable: cardIndexable(row, nicheOkBySlug),
  }))
}

async function indexSnapshot(tenantId: string) {
  const inventory=await readSeoInventory(tenantId)
  const {niches}=inventory
  const nicheOk = new Map(niches.map((row) => [row.id,facetEligible(inventory,'niche',row)]))
  return { ...inventory, nicheOk }
}

const HOME_DESCRIPTION = 'Encontre grupos de WhatsApp, canais do Telegram, servidores Discord, perfis e sites por tema. Explore ofertas, comunidades e conteúdos publicados no catálogo.'

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
  explicit?:boolean
}) {
  const canonical = `https://${input.host}${input.path}`
  const structuredData = input.robots.startsWith('index') ? input.structuredData : undefined
  return {
    title: input.title,
    description: input.description,
    canonical,
    robots: input.robots,
    ...(input.explicit?{rating:'adult' as const}:{}),
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
  breadcrumbs?:Array<{name:string;path:string}>,
) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: heading, description, url: canonical },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs?breadcrumbs.map((row,index)=>({'@type':'ListItem',position:index+1,name:row.name,item:`https://${host}${row.path}`})):[
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
  reply.header('cache-control', 'no-store')
  try {
    const host = hostFromRequest(request)
    const tenant = await resolveTenant(host)
    const age = ageFromCookie(request)
    const rows = process.env.NODE_ENV === 'test' ? linksFor() : []
    const query = request.query as { limit?: string; cursor?: string };const filters=parseDiscovery(query)
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
      const visible = visibleForAge(rows, age).filter(row=>matchesDiscovery(row,filters))
      const byId = new Map(visible.map((row) => [row.id, row]))
      const filterKey=discoveryCursorContext(filters,[tenant.id,age,'HOME',null,null],cursor)
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
        nextCursor: tagDiscoveryCursor(ranked.nextCursor,filterKey),
      }
    } else {
      const loaded = await queryCatalogPage(prisma, {
        tenantId: tenant.id,
        age,
        surface: 'HOME',
        nicheSlug: null,
        networkSlug: null,
        limit,
        cursor,filters,
      })
      page = {
        sponsored: loaded.rows.filter((row) => row.homeActivatedAt),
        organic: loaded.rows.filter((row) => !row.homeActivatedAt),
        nextCursor: loaded.nextCursor,
      }
    }
    const homeTitle = `Grupos, canais e links por categoria | ${tenant.name}`
    return reply.status(200).send({
      seo: seo({
        host,
        title: homeTitle,
        description: HOME_DESCRIPTION,
        path: cursor&&!Object.values(filters).some(Boolean)?'/?'+new URLSearchParams({cursor:query.cursor!}):'/',
        robots: Object.values(filters).some(Boolean)?'noindex,follow':'index,follow',
        explicit:age==='yes'&&[...page.sponsored,...page.organic].some(row=>{const link=snapshot.links.find(link=>link.id===row.id);return link?linkProjection(snapshot,link).explicit:false}),
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: tenant.name,
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
      nextCursor: page.nextCursor,activeFilters:filters,
    })
  } catch (error) {
    if(error instanceof ZodError)return reply.status(400).send(buildError({code:'validation',message:'Confira a cidade, o idioma e o formato.',request_id:request.id}))
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
      .map((row) => ({ id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge === true }))
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
      : { id: row.id, name: row.name, slug: row.slug, requiresAge: row.requiresAge }
  ))
}

async function getFacet(
  request: FastifyRequest,
  reply: FastifyReply,
  kind: 'niche' | 'network',
) {
  reply.header('cache-control', 'no-store')
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
    const query = request.query as { limit?: string; cursor?: string; niche?: string; network?: string };const filters=parseDiscovery(query)
    const filterNiche = kind === 'network' ? slugOf(query.niche) : null
    const filterNetwork = kind === 'niche' ? slugOf(query.network) : null
    const niches = kind === 'network' ? await companionFacets(tenant.id, 'network', slug) : undefined
    const networks = kind === 'niche' ? await companionFacets(tenant.id, 'niche', slug) : undefined
    const requiresAge = facet.requiresAge === true
    const companionRequiresAge = kind === 'network'
      ? snapshot.niches.some((row) => row.slug === filterNiche && row.requiresAge)
      : snapshot.networks.some((row) => row.slug === filterNetwork && row.requiresAge === true)
    const ageRestricted = requiresAge || companionRequiresAge
    const filtered = Boolean(query.network || query.niche || Object.values(filters).some(Boolean))
    const editorial=facetEditorial(snapshot,kind,facet)
    const eligible=facetEligible(snapshot,kind,facet)
    const heading = editorial.title
    const description = editorial.description
    const cleanPath = facetPath(kind, slug)
    const cursor=decodeCursor(query.cursor)
    const path = cursor&&!filtered?`${cleanPath}?${new URLSearchParams({cursor:query.cursor!})}`:cleanPath
    const canonical = `https://${host}${path}`
    const robots:Robots = eligible&&!filtered?'index,follow':ageRestricted&&!eligible?'noindex,nofollow':'noindex,follow'
    const breadcrumbs=[{name:'Início',path:'/'},{name:heading,path:cleanPath}]
    const previews=ageRestricted?snapshot.links.filter(link=>{
      const projected=linkProjection(snapshot,link)
      return projected.eligible&&projected.preview&&matchesDiscovery(parseDiscovery(link),filters)
        &&(kind==='niche'?link.nicheId===facet.id&&(!filterNetwork||projected.network?.slug===filterNetwork):link.networkId===facet.id&&(!filterNiche||projected.niche?.slug===filterNiche))
    }).map(link=>{const preview=linkProjection(snapshot,link).preview!;return {id:link.id,name:preview.title,description:preview.description}}):[]
    const facetSeo = (indexableIds: string[], emptyPage=false) => seo({
      host,
      title: documentTitle('named', heading, tenant.name),
      description,
      path,
      robots:emptyPage?'noindex,follow':robots,
      explicit:editorial.explicit||previews.some(row=>snapshot.state.links[row.id]?.explicit)||(age==='yes'&&snapshot.links.some(link=>{
        const projection=linkProjection(snapshot,link)
        return projection.explicit&&(kind==='niche'?link.nicheId===facet.id:link.networkId===facet.id)
      })),
      structuredData: facetStructuredData(host, heading, description, canonical, indexableIds),
    })
    if (ageRestricted && age !== 'yes') {
      const scope=createHash('sha256').update(JSON.stringify([tenant.id,age,kind,slug,filterNiche,filterNetwork,filters])).digest('hex')
      if(cursor&&cursor.filterKey!==scope)throw new InvalidCursorError()
      const ranked=pageRanked(rankHome(previews.map(row=>({...row,relevance:0,homeActivatedAt:null}))),cursor?{...cursor,filterKey:undefined}:null,capLimit(query.limit))
      const byId=new Map(previews.map(row=>[row.id,row]))
      const pagePreviews=ranked.organic.map(row=>byId.get(row.id)!)
      const nextCursor=ranked.nextCursor?encodeCursor({...decodeCursor(ranked.nextCursor)!,filterKey:scope}):null
      return reply.status(200).send({
        seo: facetSeo(pagePreviews.map(row=>row.id),Boolean(cursor)&&!pagePreviews.length),
        heading,
        breadcrumbs,previews:pagePreviews,nextCursor,
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
    const hasRestrictedContent = age === 'unknown' && (process.env.NODE_ENV === 'test'
      ? linksFor().some(row => row.requiresAge && matchesDiscovery(row,filters)
        && (kind === 'niche' ? row.nicheSlug === slug && (!filterNetwork || row.networkSlug === filterNetwork) : row.networkSlug === slug && (!filterNiche || row.nicheSlug === filterNiche)))
      : await hasRestrictedCatalogContent(prisma,{tenantId:tenant.id,nicheSlug:kind==='niche'?slug:filterNiche,networkSlug:kind==='network'?slug:filterNetwork,filters}))
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
        seo: facetSeo(indexableIds,Boolean(cursor)&&!sponsored.length&&!organic.length),
        heading,
        breadcrumbs,
        ...(hasRestrictedContent ? {ageRequired:true} : {}),
        showImpressions: await publicImpressions(tenant.id),
        ...(niches ? { niches } : {}),
        ...(networks ? { networks } : {}),
        sponsored,
        organic,
        nextCursor,activeFilters:filters,
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
        cursor,filters,
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
    const visible = visibleForAge(rows, age).filter(row=>matchesDiscovery(row,filters))
    const ranked = rankNiche(visible.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      relevance: row.relevance,
      nicheActivatedAt: row.nicheActivatedAt,
    })))
    const key=discoveryCursorContext(filters,[tenant.id,age,'NICHE',kind==='niche'?slug:filterNiche,kind==='network'?slug:filterNetwork],cursor)
    const page = pageRanked(ranked, cursor, limit)
    const byId = new Map(visible.map((row) => [row.id, row]))
    const present = (id: string) => byId.get(id)!
    return sendPage(
      page.sponsored.map((row) => present(row.id)),
      page.organic.map((row) => present(row.id)),
      tagDiscoveryCursor(page.nextCursor,key),
    )
  } catch (error) {
    if(error instanceof ZodError)return reply.status(400).send(buildError({code:'validation',message:'Confira a cidade, o idioma e o formato.',request_id:request.id}))
    if (error instanceof InvalidCursorError) {
      return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function getCollections(request:FastifyRequest,reply:FastifyReply) {
  reply.header('cache-control','private, no-store').header('vary','Cookie')
  const tenant=await resolveTenant(hostFromRequest(request))
  const inventory=await readSeoInventory(tenant.id)
  return {collections:publicCollections(inventory).map(({slug,title,description,explicit,networkSlug,nicheSlug})=>({slug,title,description,explicit,networkSlug,nicheSlug}))}
}

async function getCollection(request:FastifyRequest,reply:FastifyReply) {
  reply.header('cache-control','private, no-store').header('vary','Cookie')
  try {
    const host=hostFromRequest(request),tenant=await resolveTenant(host),age=ageFromCookie(request)
    const inventory=await readSeoInventory(tenant.id)
    const {slug}=request.params as {slug:string}
    const collection=inventory.state.collections.find(row=>row.slug===slug&&row.approved)
    if(!collection)return reply.code(404).send(buildError({code:not_found,message:'Coleção não encontrada.',request_id:request.id}))
    const query=request.query as {cursor?:string;limit?:string}
    const filters=parseDiscovery(query),filtered=Object.values(filters).some(Boolean)
    const scope=createHash('sha256').update(JSON.stringify([tenant.id,age,collection,filters])).digest('hex')
    const cursor=decodeCursor(query.cursor)
    if(cursor&&cursor.filterKey!==scope)throw new InvalidCursorError()
    const limit=capLimit(query.limit)
    const bind=(next:string|null)=>next?encodeCursor({...decodeCursor(next)!,filterKey:scope}):null
    const path='/descobrir/'+encodeURIComponent(slug)
    const canonicalPath=cursor&&!filtered?path+'?'+new URLSearchParams({cursor:query.cursor!}):path
    const eligible=collectionLinks(inventory,collection)
    const candidates=eligible.filter(row=>matchesDiscovery(parseDiscovery(row),filters))
    const niche=inventory.niches.find(row=>row.slug===collection.nicheSlug)
    const network=inventory.networks.find(row=>row.slug===collection.networkSlug)
    if(collection.nicheSlug&&!niche?.isPublicFacet||collection.networkSlug&&!network?.isPublicFacet)return reply.code(404).send(buildError({code:not_found,message:'Coleção não encontrada.',request_id:request.id}))
    const restricted=Boolean(collection.explicit||niche?.requiresAge||network?.requiresAge)
    const explicit=collection.explicit||candidates.some(link=>linkProjection(inventory,link).explicit)
    const robots:Robots=eligible.length&&!filtered?'index,follow':'noindex,follow'
    const breadcrumbs=[{name:'Início',path:'/'},...(network?[{name:network.name,path:'/rede/'+network.slug}]:[]),{name:collection.title,path}]
    const makeSeo=(ids:string[],shownExplicit=false)=>seo({host,title:documentTitle('named',collection.title,tenant.name),description:collection.description,path:canonicalPath,robots,explicit:explicit||shownExplicit,
      structuredData:facetStructuredData(host,collection.title,collection.description,'https://'+host+canonicalPath,ids,breadcrumbs)})
    const base={heading:collection.title,breadcrumbs,showImpressions:await publicImpressions(tenant.id),activeFilters:filters}
    if(restricted&&age!=='yes'){
      const queryCursor=cursor?{...cursor,filterKey:undefined}:null
      const ranked=pageRanked(rankHome(candidates.map(row=>({id:row.id,name:'',description:'',relevance:0,homeActivatedAt:null}))),queryCursor,limit)
      const previews=ranked.organic.map(row=>{const candidate=candidates.find(item=>item.id===row.id)!,preview=linkProjection(inventory,candidate).preview;return {id:row.id,name:preview?.title??candidate.name,description:preview?.description??candidate.description}})
      return {...base,seo:makeSeo(previews.map(row=>row.id)),previews,sponsored:[],organic:[],nextCursor:bind(ranked.nextCursor),...(age==='no'?{blocked:true}:{ageRequired:true})}
    }
    let rows:CardSource[],nextCursor:string|null
    if(process.env.NODE_ENV==='test'){
      const selected=linksFor().filter(row=>(!collection.linkIds||collection.linkIds.includes(row.id))&&(!collection.nicheSlug||row.nicheSlug===collection.nicheSlug)&&(!collection.networkSlug||row.networkSlug===collection.networkSlug)&&matchesDiscovery(row,filters))
      const visible=visibleForAge(selected,age)
      const ranked=pageRanked(rankNiche(visible),cursor?{...cursor,filterKey:undefined}:null,limit)
      const byId=new Map(visible.map(row=>[row.id,row]))
      rows=[...ranked.sponsored,...ranked.organic].map(row=>({...byId.get(row.id)!,homeActivatedAt:row.homeActivatedAt}));nextCursor=ranked.nextCursor
    }else{
      const key=discoveryCursorContext(filters,[tenant.id,age,'NICHE',collection.nicheSlug,collection.networkSlug],null)
      const page=await queryCatalogPage(prisma,{tenantId:tenant.id,age,surface:'NICHE',nicheSlug:collection.nicheSlug,networkSlug:collection.networkSlug,filters,limit,linkIds:collection.linkIds,cursor:cursor?{...cursor,filterKey:key}:null})
      rows=page.rows;nextCursor=page.nextCursor
    }
    const nicheOk=new Map(inventory.niches.map(row=>[row.slug,facetEligible(inventory,'niche',row)]))
    const origin:AnalyticsOrigin=collection.nicheSlug?'niche-home':'network-home'
    const sponsored=await counted(tenant.id,rows.filter(row=>Boolean((row as {homeActivatedAt?:Date|null}).homeActivatedAt)),origin,nicheOk)
    const organic=await counted(tenant.id,rows.filter(row=>!(row as {homeActivatedAt?:Date|null}).homeActivatedAt),origin,nicheOk)
    const shownExplicit=rows.some(row=>{const link=inventory.links.find(link=>link.id===row.id);return link?linkProjection(inventory,link).explicit:false})
    return {...base,seo:makeSeo([...sponsored,...organic].filter(row=>row.indexable).map(row=>row.id),shownExplicit),sponsored,organic,nextCursor:bind(nextCursor)}
  }catch(error){
    if(error instanceof InvalidCursorError||error instanceof ZodError)return reply.code(400).send(buildError({code:'validation',message:'Confira os filtros e a página solicitada.',request_id:request.id}))
    if(error instanceof ResourceNotFoundError)return reply.code(404).send(buildError({code:not_found,message:'Coleção não encontrada.',request_id:request.id}))
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
  app.get('/catalog-collections',getCollections)
  app.get('/catalog-collections/:slug',getCollection)
  app.get('/home', getHome)
  app.get('/sitemap', getSitemap)
  app.post('/age', setAge)
  app.get('/niches/:slug', (request, reply) => getFacet(request, reply, 'niche'))
  app.get('/networks/:slug', (request, reply) => getFacet(request, reply, 'network'))
}
