import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { approvedPreview, facetCopy, facetExplicit, linkFingerprint, seoCollectionSchema, seoFacetsSchema, seoLinkIdSchema, seoTextSchema } from '@/domain/catalog/seo-editorial'
import { buildError } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { publicLinkView } from '@/http/public-link-view'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { readCatalogSeo, writeCatalogSeo, CatalogSeoConflictError } from '@/repositories/catalog-seo'
import { getLinksRepository } from '@/repositories/links-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const version = z.number().int().nonnegative().max(2147483645)
const editorialInput = z.object({ expectedVersion: version, facets: seoFacetsSchema, collections: z.array(seoCollectionSchema).max(100) }).strict()
const previewInput = seoTextSchema.extend({ expectedVersion: version }).strict()
const idInput = z.object({ id: seoLinkIdSchema })

async function run(request: FastifyRequest, reply: FastifyReply, operation: (tenantId: string) => Promise<unknown>) {
  reply.header('cache-control', 'private, no-store')
  try {
    const tenant = await resolveTenant(normalizeTenantHost(request.headers.host ?? ''))
    if (request.user.tenantId !== tenant.id) return reply.code(404).send(buildError({ code: 'not_found', message: 'Recurso não encontrado.', request_id: request.id }))
    const actor = await getLinksRepository().findSubmitter(tenant.id, request.user.sub)
    if (request.user.role !== 'ADMIN' || !actor || actor.role !== 'ADMIN' || actor.status !== 'ACTIVE') return reply.code(403).send(buildError({ code: 'forbidden', message: 'Acesso negado.', request_id: request.id }))
    return await operation(tenant.id)
  } catch (error) {
    if (error instanceof CatalogSeoConflictError) return reply.code(409).send(buildError({ code: 'conflict', message: error.message, request_id: request.id }))
    if (error instanceof ResourceNotFoundError) return reply.code(404).send(buildError({ code: 'not_found', message: 'Recurso não encontrado.', request_id: request.id }))
    throw error
  }
}

async function currentLink(tenantId: string, id: string) {
  const repo = getLinksRepository(), link = await repo.findLinkById(id)
  if (!link || link.tenantId !== tenantId || !(await publicLinkView(link)).visible) throw new ResourceNotFoundError()
  const [niche, network] = await Promise.all([repo.findNiche(tenantId, link.nicheId), repo.findNetwork(tenantId, link.networkId)])
  if (!niche?.isPublicFacet || !network?.isPublicFacet) throw new ResourceNotFoundError()
  const state=await readCatalogSeo(tenantId)
  return { link, requiresAge: niche.requiresAge || network.requiresAge === true, explicit: facetExplicit(state,'niche', niche.slug, niche.name) || facetExplicit(state,'network', network.slug, network.name) }
}

export async function registerCatalogSeoRoutes(app: FastifyInstance) {
  app.get('/admin/catalog-seo', { onRequest: [verifyJWT] }, (request, reply) => run(request, reply, tenantId => readCatalogSeo(tenantId)))
  app.put('/admin/catalog-seo', { onRequest: [verifyJWT] }, (request, reply) => run(request, reply, async tenantId => {
    const input = editorialInput.parse(request.body), repo = getLinksRepository()
    const [state, niches, networks] = await Promise.all([readCatalogSeo(tenantId), repo.listNiches(tenantId), repo.listNetworks(tenantId)])
    for (const [key, text] of Object.entries(input.facets)) {
      const [kind, slug] = key.split(':')
      const facet = (kind === 'niche' ? niches : networks).find(row => row.slug === slug && row.isPublicFacet)
      if (!facet || text.explicit && !facet.requiresAge || !text.explicit && facetCopy(kind as 'niche' | 'network', facet.slug, facet.name).explicit) return reply.code(400).send({ message: 'Confira a faceta e sua classificação de conteúdo e idade antes de aprovar o editorial.' })
    }
    for (const collection of input.collections) {
      const network = networks.find(row => row.slug === collection.networkSlug && row.isPublicFacet)
      const niche = niches.find(row => row.slug === collection.nicheSlug && row.isPublicFacet)
      if (collection.networkSlug !== null && !network || collection.nicheSlug !== null && !niche) return reply.code(400).send({ message: 'Escolha uma rede e um nicho públicos deste catálogo.' })
      const requiresAge = network?.requiresAge || niche?.requiresAge
      const proposed={...state,facets:input.facets}
      const explicit = Boolean(network && facetExplicit(proposed,'network', network.slug, network.name) || niche && facetExplicit(proposed,'niche', niche.slug, niche.name))
      if (collection.explicit && !requiresAge || explicit && !collection.explicit) return reply.code(400).send({ message: 'A classificação da coleção precisa corresponder ao conteúdo e à restrição de idade dos filtros.' })
      for (const id of collection.linkIds ?? []) {
        const selected = await currentLink(tenantId, id)
        if (network && selected.link.networkId !== network.id || niche && selected.link.nicheId !== niche.id) return reply.code(400).send({ message: 'As publicações selecionadas precisam corresponder aos filtros da coleção.' })
        const selectedExplicit = selected.explicit || approvedPreview(state, selected.link)?.explicit === true
        if (selected.requiresAge && !requiresAge || selectedExplicit !== collection.explicit) return reply.code(400).send({ message: 'As publicações selecionadas precisam corresponder à classificação de conteúdo e idade da coleção.' })
      }
    }
    return writeCatalogSeo(tenantId, input.expectedVersion, { ...state, facets: input.facets, collections: input.collections }, request.user.sub, request.id)
  }))
  app.get('/admin/catalog-seo/links/:id', { onRequest: [verifyJWT] }, (request, reply) => run(request, reply, async tenantId => {
    const { id } = idInput.parse(request.params), { link, requiresAge } = await currentLink(tenantId, id), state = await readCatalogSeo(tenantId)
    const stored = state.links[id]
    return { version: state.version, preview: stored ? { ...stored, approved: approvedPreview(state, link) !== null } : null, name: link.name, description: link.description, requiresAge }
  }))
  app.put('/admin/catalog-seo/links/:id', { onRequest: [verifyJWT] }, (request, reply) => run(request, reply, async tenantId => {
    const { id } = idInput.parse(request.params), input = previewInput.parse(request.body), { link, requiresAge, explicit } = await currentLink(tenantId, id)
    if (input.explicit && !requiresAge || explicit && !input.explicit) return reply.code(400).send({ message: 'A prévia precisa corresponder à classificação de conteúdo e à restrição de idade do anúncio.' })
    const state = await readCatalogSeo(tenantId)
    const { expectedVersion, ...text } = input
    return writeCatalogSeo(tenantId, expectedVersion, { ...state, links: { ...state.links, [id]: { ...text, fingerprint: linkFingerprint(link) } } }, request.user.sub, request.id)
  }))
}
