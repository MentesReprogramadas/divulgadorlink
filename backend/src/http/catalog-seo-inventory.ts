import { approvedPreview, facetCopy, facetExplicit, type SeoEditorial, type SeoText, type SeoCollection } from '@/domain/catalog/seo-editorial'
import { readCatalogSeo } from '@/repositories/catalog-seo'
import { getLinksRepository, type LinkRecord, type NicheRecord, type NetworkRecord } from '@/repositories/links-repository'
import { facetIndexable } from '@/domain/catalog/index-policy'

export type SeoInventory = Awaited<ReturnType<typeof readSeoInventory>>

export async function readSeoInventory(tenantId: string) {
  const repo = getLinksRepository()
  const [state,niches,networks,links] = await Promise.all([readCatalogSeo(tenantId),repo.listNiches(tenantId),repo.listNetworks(tenantId),repo.listSeoLinks(tenantId)])
  return {state,niches,networks,links}
}

export function linkProjection(inventory: {state:SeoEditorial;niches:NicheRecord[];networks:NetworkRecord[]}, link: LinkRecord) {
  const niche = inventory.niches.find(row => row.id===link.nicheId)
  const network = inventory.networks.find(row => row.id===link.networkId)
  const requiresAge = Boolean(niche?.requiresAge || network?.requiresAge)
  const preview = approvedPreview(inventory.state,link)
  // Paid sexual services are outside this editorial acquisition program.
  const publicFacets = Boolean(niche?.isPublicFacet && network?.isPublicFacet && network.slug!=='fatal-model')
  const eligible = publicFacets && (!requiresAge || Boolean(preview))
  return {niche,network,requiresAge,preview,eligible,
    explicit: Boolean(preview?.explicit || facetExplicit(inventory.state,'niche',niche?.slug??'',niche?.name??'') || facetExplicit(inventory.state,'network',network?.slug??'',network?.name??'')),
  }
}

export function facetEditorial(inventory:SeoInventory,kind:'niche'|'network',facet:NicheRecord|NetworkRecord):SeoText {
  const configured = inventory.state.facets[`${kind}:${facet.slug}`]
  const base=facetCopy(kind,facet.slug,facet.name)
  if(configured?.approved)return {...configured,explicit:base.explicit||configured.explicit}
  return {...base,description:!facet.requiresAge&&facet.summary?.trim()?facet.summary.trim():base.description,approved:configured?false:true}
}

export function facetEligible(inventory:SeoInventory,kind:'niche'|'network',facet:NicheRecord|NetworkRecord):boolean {
  const eligible=inventory.links.filter(link => {
    const projection=linkProjection(inventory,link)
    return (kind==='niche'?link.nicheId===facet.id:link.networkId===facet.id) && projection.eligible && (!projection.requiresAge||facet.requiresAge)
  })
  return facetIndexable({isPublicFacet:facet.isPublicFacet,requiresAge:facet.requiresAge===true,
    editorialApproved:facetEditorial(inventory,kind,facet).approved,eligibleCount:eligible.length,
    hasPublicPreview:eligible.some(link=>Boolean(linkProjection(inventory,link).preview))})
}

export function collectionLinks(inventory:SeoInventory,collection:SeoCollection):LinkRecord[] {
  const restricted=collection.explicit||inventory.niches.some(row=>row.slug===collection.nicheSlug&&row.requiresAge)||inventory.networks.some(row=>row.slug===collection.networkSlug&&row.requiresAge)
  return inventory.links.filter(link => {
    const projection=linkProjection(inventory,link)
    return projection.eligible && (!collection.linkIds||collection.linkIds.includes(link.id)) && (!projection.requiresAge||restricted) && (!collection.networkSlug || projection.network?.slug===collection.networkSlug)
      && (!collection.nicheSlug || projection.niche?.slug===collection.nicheSlug)
      && (!collection.explicit || projection.explicit)
  })
}

export function publicCollections(inventory:SeoInventory):SeoCollection[] {
  return inventory.state.collections.filter(row=>row.approved&&collectionLinks(inventory,row).length>0)
}
