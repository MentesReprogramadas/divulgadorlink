import { readSeoInventory, facetEligible, linkProjection, publicCollections } from '@/http/catalog-seo-inventory'
import type { SeoInventory } from '@/http/catalog-seo-inventory'

export type SitemapEntry = { path: string; updatedAt: string }

export async function indexableEntries(tenantId:string):Promise<SitemapEntry[]> {
  return entriesFrom(await readSeoInventory(tenantId))
}

export function entriesFrom(inventory:SeoInventory):SitemapEntry[] {
  const links=inventory.links.filter(link=>linkProjection(inventory,link).eligible)
  const latest=links.reduce<Date|null>((max,link)=>!max||link.updatedAt>max?link.updatedAt:max,null)
  return [
    {path:'/',updatedAt:latest?.toISOString()??''},
    {path:'/divulgar',updatedAt:''},
    {path:'/privacidade',updatedAt:'2026-10-10T00:00:00.000Z'},
    {path:'/termos',updatedAt:'2026-10-10T00:00:00.000Z'},
    ...inventory.niches.filter(facet=>facetEligible(inventory,'niche',facet)).map(facet=>({path:'/nicho/'+encodeURIComponent(facet.slug),updatedAt:facet.updatedAt.toISOString()})),
    ...inventory.networks.filter(facet=>facetEligible(inventory,'network',facet)).map(facet=>({path:'/rede/'+encodeURIComponent(facet.slug),updatedAt:facet.updatedAt.toISOString()})),
    ...publicCollections(inventory).map(row=>({path:'/descobrir/'+encodeURIComponent(row.slug),updatedAt:''})),
    ...links.map(link=>({path:'/link/'+encodeURIComponent(link.id),updatedAt:link.updatedAt.toISOString()})),
  ]
}
