import { prisma } from '@/lib/prisma'
import { Prisma, type PrismaClient } from '@prisma/client'
import { hasSearchSample, SEARCH_DAILY_LIMIT, SEARCH_RETENTION_DAYS, SEARCH_SAMPLE_THRESHOLD } from '@/domain/search/search-observation'

let testDb: PrismaClient | null = null
export function setSearchObservationDbForTest(db: PrismaClient | null) { if (process.env.NODE_ENV === 'test') testDb = db }
export function searchObservationDb() { return testDb ?? prisma }

export type SearchObservationInput = {
  tenantId: string; term: string; sessionKey: string; day: Date
  outcome: 'SUCCESS' | 'FAILED' | 'GATED'; resultIds: string[]
  nicheIds: string[]; networkIds: string[]; now: Date
}
export async function recordSearchObservation(db: PrismaClient, input: SearchObservationInput): Promise<string | null> {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.tenantId + ':' + input.sessionKey}, 0))`
    const where = { tenantId: input.tenantId, sessionKey: input.sessionKey, day: input.day }
    const existing = await tx.searchObservation.findUnique({ where: { tenantId_sessionKey_day_term_outcome: { ...where, term: input.term, outcome: input.outcome } } })
    if (existing) return input.outcome === 'SUCCESS' && existing.resultIds.length === input.resultIds.length && existing.resultIds.every(id => input.resultIds.includes(id)) ? existing.id : null
    if (await tx.searchObservation.count({ where }) >= SEARCH_DAILY_LIMIT) return null
    const { now, ...data } = input
    const row = await tx.searchObservation.create({ data: {
      ...data, createdAt: now,
      resultCount: input.outcome === 'SUCCESS' ? input.resultIds.length : null,
    } })
    return input.outcome === 'SUCCESS' ? row.id : null
  })
}
export async function associateSearchClick(db: PrismaClient, input: { tenantId: string; sessionKey: string; queryId: string; linkId: string; now: Date }) {
  return db.searchObservation.updateMany({ where: {
    id: input.queryId, tenantId: input.tenantId, sessionKey: input.sessionKey,
    outcome: 'SUCCESS', resultIds: { has: input.linkId }, clickedAt: null,
    createdAt: { gte: new Date(input.now.getTime() - 86400000), lte: input.now },
  }, data: { clickedAt: input.now } })
}
export async function purgeSearchObservations(db: PrismaClient, now = new Date()) {
  return db.searchObservation.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - SEARCH_RETENTION_DAYS * 86400000) } } })
}
export async function searchOpportunities(db: PrismaClient, input: { tenantId: string; start: Date; end: Date; networkId?: string; nicheId?: string; opportunity?: 'NO_RESULTS' | 'LOW_INTERACTION'; page: number; now: Date }) {
  const cutoff = new Date(input.now.getTime() - SEARCH_RETENTION_DAYS * 86400000)
  const start = input.start > cutoff ? input.start : cutoff
  const network = input.networkId ? Prisma.sql`AND ${input.networkId} = ANY("networkIds")` : Prisma.empty
  const niche = input.nicheId ? Prisma.sql`AND ${input.nicheId} = ANY("nicheIds")` : Prisma.empty
  const bucket = input.opportunity === 'NO_RESULTS' ? Prisma.sql`WHERE "withResults" = 0` : input.opportunity === 'LOW_INTERACTION' ? Prisma.sql`WHERE "withResults" > 0 AND exits::float / "withResults" <= 0.1` : Prisma.empty
  const grouped = Prisma.sql`WITH eligible AS (
      SELECT term, COUNT(*)::int AS searches,
        COUNT(*) FILTER (WHERE "resultCount" = 0)::int AS empty,
        COUNT(*) FILTER (WHERE "clickedAt" IS NOT NULL)::int AS exits,
        COUNT(*) FILTER (WHERE "resultCount" > 0)::int AS "withResults"
      FROM search_observations WHERE "tenantId" = ${input.tenantId}
        AND "createdAt" >= ${start} AND "createdAt" < ${input.end} AND outcome = 'SUCCESS' ${network} ${niche}
      GROUP BY term HAVING COUNT(*) >= ${SEARCH_SAMPLE_THRESHOLD}
    )`
  const rows = await db.$queryRaw<Array<{ term: string; searches: number; empty: number; exits: number; withResults: number; total: bigint }>>(Prisma.sql`${grouped}
    SELECT *, COUNT(*) OVER () AS total FROM eligible ${bucket}
    ORDER BY searches DESC, term ASC LIMIT 25 OFFSET ${(input.page - 1) * 25}`)
  const total = rows[0]?.total ?? (input.page > 1 ? (await db.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`${grouped} SELECT COUNT(*) AS total FROM eligible ${bucket}`))[0]?.total : 0)

  // Coverage is aggregate only. Do not expose small error/gated groups or raw observations.
  const outcomes = await db.searchObservation.groupBy({ by: ['outcome'], where: {
    tenantId: input.tenantId, createdAt: { gte: start, lt: input.end },
    ...(input.networkId ? { networkIds: { has: input.networkId } } : {}),
    ...(input.nicheId ? { nicheIds: { has: input.nicheId } } : {}),
  }, _count: true })
  return {
    threshold: SEARCH_SAMPLE_THRESHOLD, retentionDays: SEARCH_RETENTION_DAYS,
    page: input.page, total: Number(total ?? 0),
    coverage: outcomes.map(row => ({ outcome: row.outcome, count: hasSearchSample(row._count) ? row._count : null })),
    items: rows.map(({ total: _total, ...row }) => ({ ...row,
      exitRate: row.withResults ? Math.round(row.exits / row.withResults * 1000) / 10 : 0,
      opportunity: row.withResults === 0 ? 'NO_RESULTS' : row.exits / row.withResults <= .1 ? 'LOW_INTERACTION' : 'OBSERVE',
    })),
  }
}
