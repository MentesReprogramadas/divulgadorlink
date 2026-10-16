import { Prisma, type PrismaClient } from '@prisma/client'
import { PUBLIC_LINK_FILTER } from '@/domain/catalog/public-link'
import { RELATED_PAGE_SIZE, decodeRelatedCursor, encodeRelatedCursor, relatedRank, selectRelated, type RelatedSource, type RelatedCandidate } from '@/domain/catalog/related-links'
import { signSurface } from '@/domain/analytics/surface-token'
import { impressionsEnabled } from '@/domain/config/read-config'
import { PrismaConfigsRepository } from './configs-repository'
import { PrismaAnalyticsRepository } from './analytics-repository'

type Source = RelatedSource & { requiresAge: boolean }
type Row = RelatedCandidate & { name: string; description: string; nicheName: string; nicheSlug: string; networkName: string; networkSlug: string; rank: number }
export async function readRelatedLinks(db: PrismaClient, input: { tenantId: string; linkId: string; age: 'yes' | 'no' | 'unknown'; cursor?: string; secret: string }) {
  return db.$transaction(async tx => {
  const source = (await tx.$queryRaw<Source[]>`SELECT l.id,l."tenantId",l."canonicalUrl",l."nicheId",l."networkId",(n."requiresAge" OR net."requiresAge") AS "requiresAge" FROM links l JOIN niches n ON n.id=l."nicheId" AND n."tenantId"=l."tenantId" JOIN networks net ON net.id=l."networkId" AND net."tenantId"=l."tenantId" LEFT JOIN users owner ON owner.id=l."ownerId" AND owner."tenantId"=l."tenantId" WHERE l.id=${input.linkId} AND l."tenantId"=${input.tenantId} AND ${Prisma.raw(PUBLIC_LINK_FILTER)} AND (l."ownerId" IS NULL OR owner.id IS NOT NULL)`)[0]
  if (!source) return null
  const context = { ...source, age: input.age }, cursor = decodeRelatedCursor(input.cursor, context, input.secret)
  if (source.requiresAge && input.age !== 'yes') return { items: [], nextCursor: null, showImpressions: false }
  const rows = await tx.$queryRaw<Row[]>`WITH eligible AS (
    SELECT l.id,l."tenantId",l."canonicalUrl",l."nicheId",l."networkId",l.status::text,l.name,l.description,owner.status::text AS "ownerStatus",(n."requiresAge" OR net."requiresAge") AS "requiresAge",n.name AS "nicheName",n.slug AS "nicheSlug",net.name AS "networkName",net.slug AS "networkSlug",
      CASE WHEN l."nicheId"=${source.nicheId} THEN CASE WHEN l."networkId"=${source.networkId} THEN 0 ELSE 1 END ELSE 2 END AS rank
    FROM links l JOIN niches n ON n.id=l."nicheId" AND n."tenantId"=l."tenantId" JOIN networks net ON net.id=l."networkId" AND net."tenantId"=l."tenantId" LEFT JOIN users owner ON owner.id=l."ownerId" AND owner."tenantId"=l."tenantId"
    WHERE l."tenantId"=${input.tenantId} AND ${Prisma.raw(PUBLIC_LINK_FILTER)} AND (l."ownerId" IS NULL OR owner.id IS NOT NULL)
      AND l.id<>${source.id} AND l."canonicalUrl"<>${source.canonicalUrl}
      AND (l."nicheId"=${source.nicheId} OR l."networkId"=${source.networkId}) AND (${input.age}='yes' OR NOT (n."requiresAge" OR net."requiresAge"))
  ), unique_urls AS (SELECT DISTINCT ON ("canonicalUrl") * FROM eligible ORDER BY "canonicalUrl",rank,id COLLATE "C")
  SELECT * FROM unique_urls WHERE (${cursor?.rank ?? null}::int IS NULL OR rank>${cursor?.rank ?? null} OR (rank=${cursor?.rank ?? null} AND id COLLATE "C">${cursor?.id ?? null} COLLATE "C")) ORDER BY rank,id COLLATE "C" LIMIT ${RELATED_PAGE_SIZE + 1}`
  const selected = selectRelated(rows, source, input.age), page = selected.slice(0, RELATED_PAGE_SIZE), last = page.at(-1)
  const config = await new PrismaConfigsRepository(tx).findByTenantAndKey(input.tenantId, 'SHOW_IMPRESSIONS'), showImpressions = impressionsEnabled(config?.value)
  const counts = showImpressions ? await new PrismaAnalyticsRepository(tx).impressionTotals(input.tenantId, page.map(r => r.id)) : new Map<string, number>()
  return { items: page.map(r => ({ id: r.id, name: r.name, description: r.description, niche: { name: r.nicheName, slug: r.nicheSlug }, network: { name: r.networkName, slug: r.networkSlug }, sponsored: false, surfaceToken: signSurface(input.tenantId, r.id, 'related', input.secret), ...(showImpressions ? { impressions: counts.get(r.id) ?? 0 } : {}) })), showImpressions, nextCursor: selected.length > RELATED_PAGE_SIZE && last ? encodeRelatedCursor({ rank: relatedRank(source, last)!, id: last.id }, context, input.secret) : null }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
