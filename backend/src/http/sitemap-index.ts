import { facetIndexable, substantiveText } from '@/domain/catalog/index-policy'
import { prisma } from '@/lib/prisma'
import { getLinksRepository, InMemoryLinksRepository } from '@/repositories/links-repository'

export type SitemapEntry = { path: string; updatedAt: string }

const LINK_CAP = 49_000

type SitemapLink = {
  id: string
  name: string
  description: string
  nicheId: string
  updatedAt: Date
  status: string
  ownerStatus: string | null
}

export async function indexableEntries(tenantId: string): Promise<SitemapEntry[]> {
  return entriesFrom(tenantId, await loadLinks(tenantId))
}

async function loadLinks(tenantId: string): Promise<SitemapLink[]> {
  if (process.env.NODE_ENV === 'test') {
    const repo = getLinksRepository()
    if (!(repo instanceof InMemoryLinksRepository)) return []
    const rows: SitemapLink[] = []
    for (const link of repo.links) {
      if (link.tenantId !== tenantId) continue
      const owner = link.ownerId ? await repo.findSubmitter(tenantId, link.ownerId) : null
      rows.push({
        id: link.id,
        name: link.name,
        description: link.description,
        nicheId: link.nicheId,
        updatedAt: link.updatedAt,
        status: link.status,
        ownerStatus: owner?.status ?? null,
      })
    }
    return rows
  }
  const rows = await prisma.link.findMany({
    where: { tenantId, status: 'PUBLISHED' },
    select: {
      id: true,
      name: true,
      description: true,
      nicheId: true,
      updatedAt: true,
      owner: { select: { status: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: LINK_CAP,
  })
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    nicheId: row.nicheId,
    updatedAt: row.updatedAt,
    status: 'PUBLISHED',
    ownerStatus: row.owner?.status ?? null,
  }))
}

async function entriesFrom(tenantId: string, links: SitemapLink[]): Promise<SitemapEntry[]> {
  const repo = getLinksRepository()
  const now = new Date().toISOString()
  const [niches, networks, counts] = await Promise.all([
    repo.listNiches(tenantId),
    repo.listNetworks(tenantId),
    repo.substantiveCounts(tenantId),
  ])
  const nicheCount = new Map(counts.niches.map((row) => [row.id, row.count]))
  const networkCount = new Map(counts.networks.map((row) => [row.id, row.count]))
  const nicheOk = new Map(niches.map((row) => [row.id, facetIndexable({
    isPublicFacet: row.isPublicFacet,
    requiresAge: row.requiresAge,
    summary: row.summary,
    substantiveCount: nicheCount.get(row.id) ?? 0,
  })]))
  const entries: SitemapEntry[] = [{ path: '/', updatedAt: now }]
  for (const niche of niches) {
    if (nicheOk.get(niche.id) !== true) continue
    entries.push({ path: `/nicho/${encodeURIComponent(niche.slug)}`, updatedAt: now })
  }
  for (const network of networks) {
    const ok = facetIndexable({
      isPublicFacet: network.isPublicFacet,
      requiresAge: network.requiresAge === true,
      summary: network.summary,
      substantiveCount: networkCount.get(network.id) ?? 0,
    })
    if (!ok) continue
    entries.push({ path: `/rede/${encodeURIComponent(network.slug)}`, updatedAt: now })
  }
  for (const link of links) {
    if (link.status !== 'PUBLISHED' || link.ownerStatus === 'BANNED') continue
    if (!substantiveText(link.name, link.description)) continue
    if (nicheOk.get(link.nicheId) !== true) continue
    entries.push({ path: `/link/${link.id}`, updatedAt: link.updatedAt.toISOString() })
  }
  return entries
}
