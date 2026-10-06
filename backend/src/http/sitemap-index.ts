import { prisma } from '@/lib/prisma'
import { getLinksRepository, InMemoryLinksRepository } from '@/repositories/links-repository'

export type SitemapEntry = { path: string; updatedAt: string }

const LINK_CAP = 49_000

export async function indexableEntries(tenantId: string): Promise<SitemapEntry[]> {
  if (process.env.NODE_ENV === 'test') return memoryEntries(tenantId)
  return databaseEntries(tenantId)
}

async function memoryEntries(tenantId: string): Promise<SitemapEntry[]> {
  const repo = getLinksRepository()
  const now = new Date().toISOString()
  if (!(repo instanceof InMemoryLinksRepository)) return [{ path: '/', updatedAt: now }]
  const niches = await repo.listNiches(tenantId)
  const networks = await repo.listNetworks(tenantId)
  const nicheById = new Map(niches.map((row) => [row.id, row]))
  const entries: SitemapEntry[] = [{ path: '/', updatedAt: now }]
  for (const niche of niches) {
    if (niche.isPublicFacet && !niche.requiresAge) entries.push({ path: `/nicho/${niche.slug}`, updatedAt: now })
  }
  for (const network of networks) {
    if (network.isPublicFacet && network.requiresAge !== true) entries.push({ path: `/rede/${network.slug}`, updatedAt: now })
  }
  for (const link of repo.links) {
    if (link.tenantId !== tenantId || link.status !== 'PUBLISHED') continue
    const niche = nicheById.get(link.nicheId)
    if (!niche || niche.requiresAge) continue
    if (link.ownerId) {
      const owner = await repo.findSubmitter(tenantId, link.ownerId)
      if (owner?.status === 'BANNED') continue
    }
    entries.push({ path: `/link/${link.id}`, updatedAt: link.updatedAt.toISOString() })
  }
  return entries
}

async function databaseEntries(tenantId: string): Promise<SitemapEntry[]> {
  const [niches, networks, links] = await Promise.all([
    prisma.niche.findMany({
      where: { tenantId, isPublicFacet: true, requiresAge: false },
      select: { slug: true, updatedAt: true },
      orderBy: { slug: 'asc' },
    }),
    prisma.network.findMany({
      where: { tenantId, isPublicFacet: true, requiresAge: false },
      select: { slug: true, updatedAt: true },
      orderBy: { slug: 'asc' },
    }),
    prisma.link.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        niche: { requiresAge: false },
        OR: [{ ownerId: null }, { owner: { status: { not: 'BANNED' } } }],
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: LINK_CAP,
    }),
  ])
  const newest = links[0]?.updatedAt ?? new Date()
  return [
    { path: '/', updatedAt: newest.toISOString() },
    ...niches.map((row) => ({ path: `/nicho/${encodeURIComponent(row.slug)}`, updatedAt: row.updatedAt.toISOString() })),
    ...networks.map((row) => ({ path: `/rede/${encodeURIComponent(row.slug)}`, updatedAt: row.updatedAt.toISOString() })),
    ...links.map((row) => ({ path: `/link/${row.id}`, updatedAt: row.updatedAt.toISOString() })),
  ]
}
