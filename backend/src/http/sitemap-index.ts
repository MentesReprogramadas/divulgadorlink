import { facetIndexable } from '@/domain/catalog/index-policy'
import {
  getLinksRepository,
  type NicheRecord,
  type NetworkRecord,
  type SitemapLinkRef,
} from '@/repositories/links-repository'

export type SitemapEntry = { path: string; updatedAt: string }

export async function indexableEntries(tenantId: string): Promise<SitemapEntry[]> {
  const repo = getLinksRepository()
  const [niches, networks, counts, links] = await Promise.all([
    repo.listNiches(tenantId),
    repo.listNetworks(tenantId),
    repo.substantiveCounts(tenantId),
    repo.listSubstantiveSitemapLinks(tenantId),
  ])
  return entriesFrom(niches, networks, counts, links)
}

export function entriesFrom(
  niches: NicheRecord[],
  networks: NetworkRecord[],
  counts: { niches: Array<{ id: string; count: number }>; networks: Array<{ id: string; count: number }> },
  links: SitemapLinkRef[],
): SitemapEntry[] {
  const nicheCount = new Map(counts.niches.map((row) => [row.id, row.count]))
  const networkCount = new Map(counts.networks.map((row) => [row.id, row.count]))
  const nicheOk = new Map(niches.map((row) => [row.id, facetIndexable({
    isPublicFacet: row.isPublicFacet,
    requiresAge: row.requiresAge,
    summary: row.summary,
    substantiveCount: nicheCount.get(row.id) ?? 0,
  })]))
  const indexableLinks = links.filter((link) => nicheOk.get(link.nicheId) === true)
  const latest = indexableLinks.reduce<Date | null>(
    (max, link) => (max === null || link.updatedAt > max ? link.updatedAt : max),
    null,
  )
  const entries: SitemapEntry[] = [
    { path: '/', updatedAt: latest ? latest.toISOString() : '' },
    { path: '/privacidade', updatedAt: '2026-10-10T00:00:00.000Z' },
    { path: '/termos', updatedAt: '2026-10-10T00:00:00.000Z' },
  ]
  for (const niche of niches) {
    if (nicheOk.get(niche.id) !== true) continue
    entries.push({ path: `/nicho/${encodeURIComponent(niche.slug)}`, updatedAt: niche.updatedAt.toISOString() })
  }
  for (const network of networks) {
    const ok = facetIndexable({
      isPublicFacet: network.isPublicFacet,
      requiresAge: network.requiresAge === true,
      summary: network.summary,
      substantiveCount: networkCount.get(network.id) ?? 0,
    })
    if (!ok) continue
    entries.push({ path: `/rede/${encodeURIComponent(network.slug)}`, updatedAt: network.updatedAt.toISOString() })
  }
  const linkEntries = indexableLinks.map((link) => ({ path: `/link/${link.id}`, updatedAt: link.updatedAt.toISOString() }))
  return [...entries, ...linkEntries]
}
