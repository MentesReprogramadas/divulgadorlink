import type { PrismaClient } from '@prisma/client'
import { summaryToApply, type FacetKind } from '../src/domain/catalog/default-facet-summaries'

type OpenRow = {
  id: string
  slug: string
  summary: string | null
  requiresAge: boolean
  isPublicFacet: boolean
}

export async function fillMissingFacetSummaries(prisma: PrismaClient, tenantId: string): Promise<string[]> {
  const [niches, networks] = await Promise.all([
    prisma.niche.findMany({
      where: { tenantId },
      select: { id: true, slug: true, summary: true, requiresAge: true, isPublicFacet: true },
    }),
    prisma.network.findMany({
      where: { tenantId },
      select: { id: true, slug: true, summary: true, requiresAge: true, isPublicFacet: true },
    }),
  ])
  const filled: string[] = []
  for (const row of niches) {
    const slug = await writeMissing(prisma, 'niche', tenantId, row)
    if (slug) filled.push(`niche:${slug}`)
  }
  for (const row of networks) {
    const slug = await writeMissing(prisma, 'network', tenantId, row)
    if (slug) filled.push(`network:${slug}`)
  }
  return filled
}

async function writeMissing(
  prisma: PrismaClient,
  kind: FacetKind,
  tenantId: string,
  row: OpenRow,
): Promise<string | null> {
  const summary = summaryToApply(kind, row)
  if (!summary) return null
  const where = { id: row.id, tenantId, summary: null }
  const updated = kind === 'niche'
    ? await prisma.niche.updateMany({ where, data: { summary } })
    : await prisma.network.updateMany({ where, data: { summary } })
  if (updated.count !== 1) return null
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: null,
      action: 'facet.summary.seed',
      entityType: kind === 'niche' ? 'Niche' : 'Network',
      entityId: row.id,
      before: { summary: null },
      after: { summary },
    },
  })
  return row.slug
}
