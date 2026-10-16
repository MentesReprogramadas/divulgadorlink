import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { analyticsDayStart } from '@/domain/analytics/day'
import { purgeBefore } from '@/use-cases/@Analytics/purge-old-events'
import type { PerformanceQuery, PerformanceSeriesRow } from '@/use-cases/@Analytics/promotion-performance'

export type AnalyticsKind = 'IMPRESSION' | 'CLICK'

export type AnalyticsInsert = {
  tenantId: string
  sessionId: string
  linkId: string
  surface: string
  day: string
  kind: AnalyticsKind
}

export interface AnalyticsRepository {
  insert(event: AnalyticsInsert): Promise<'inserted' | 'duplicate'>
  totals(input: { tenantId: string; linkId: string; from?: string; to?: string }): Promise<{ impressions: number; clicks: number }>
  impressionTotals(tenantId: string, linkIds: string[]): Promise<Map<string, number>>
}

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly client: PrismaClient) {}

  async performanceSeries(query: PerformanceQuery): Promise<PerformanceSeriesRow[]> {
    const currentEnd = new Date(Math.min(query.end.getTime(), query.now.getTime()))
    const comparisonStart = analyticsDayStart(query.comparisonFrom)
    const comparisonEnd = new Date(comparisonStart.getTime() + currentEnd.getTime() - query.start.getTime())
    const sql = [
      'SELECT a.day::text AS day, a.surface,',
      "COUNT(*) FILTER (WHERE a.kind = 'IMPRESSION')::int AS impressions,",
      "COUNT(*) FILTER (WHERE a.kind = 'CLICK')::int AS clicks,",
      "COUNT(*) FILTER (WHERE a.kind = 'CLICK' AND EXISTS (",
      'SELECT 1 FROM promotions p WHERE p."tenantId" = a."tenantId" AND p."linkId" = a."linkId"',
      'AND p.surface::text = a.surface AND p."activatedAt" <= a."createdAt" AND (p."expiresAt" IS NULL OR p."expiresAt" > a."createdAt")',
        'AND NOT EXISTS (SELECT 1 FROM promotion_pauses gap WHERE gap."promotionId"=p.id AND gap."tenantId"=p."tenantId" AND gap."startsAt"<=a."createdAt" AND (gap."endsAt" IS NULL OR gap."endsAt">a."createdAt"))',
      'AND ($7::text IS NULL OR p.id = $7)))::int AS "paidClicks"',
      'FROM analytics_events a WHERE a."tenantId" = $1 AND a."linkId" = $2 AND a.day >= $8::date',
      'AND ((a."createdAt" >= $3 AND a."createdAt" < $4) OR (a."createdAt" >= $5 AND a."createdAt" < $6))',
      'AND ($7::text IS NULL OR EXISTS (SELECT 1 FROM promotions selected WHERE selected.id = $7',
      'AND selected."tenantId" = a."tenantId" AND selected."linkId" = a."linkId" AND selected.surface::text = a.surface',
        'AND (a."createdAt" < $5 OR (a."createdAt" >= selected."activatedAt" AND (selected."expiresAt" IS NULL OR a."createdAt" < selected."expiresAt")',
        'AND NOT EXISTS (SELECT 1 FROM promotion_pauses gap WHERE gap."promotionId"=selected.id AND gap."tenantId"=selected."tenantId" AND gap."startsAt"<=a."createdAt" AND (gap."endsAt" IS NULL OR gap."endsAt">a."createdAt"))))))',
      'GROUP BY a.day, a.surface ORDER BY a.day, a.surface',
    ].join(' ')
    return this.client.$queryRawUnsafe<PerformanceSeriesRow[]>(sql, query.tenantId, query.linkId, comparisonStart, comparisonEnd, query.start, currentEnd, query.promotionId ?? null, purgeBefore(query.now).toISOString().slice(0, 10))
  }

  async insert(event: AnalyticsInsert): Promise<'inserted' | 'duplicate'> {
    const written = await this.client.$executeRaw`
      INSERT INTO analytics_events (
        id, "tenantId", "sessionId", "linkId", surface, day, kind, "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${event.tenantId}, ${event.sessionId}, ${event.linkId},
        ${event.surface}, ${event.day}::date, ${event.kind}, NOW(), NOW()
      )
      ON CONFLICT ("sessionId", "linkId", surface, day, kind) DO NOTHING
    `
    return written === 0 ? 'duplicate' : 'inserted'
  }

  async totals(input: { tenantId: string; linkId: string; from?: string; to?: string }): Promise<{ impressions: number; clicks: number }> {
    const from = input.from ? Prisma.sql`AND day >= ${input.from}::date` : Prisma.empty
    const to = input.to ? Prisma.sql`AND day <= ${input.to}::date` : Prisma.empty
    const rows = await this.client.$queryRaw<Array<{ kind: string; n: number }>>`
      SELECT kind, COUNT(*)::int AS n
      FROM analytics_events
      WHERE "tenantId" = ${input.tenantId}
        AND "linkId" = ${input.linkId}
        ${from}
        ${to}
      GROUP BY kind
    `
    const impressions = Number(rows.find((row) => row.kind === 'IMPRESSION')?.n ?? 0)
    const clicks = Number(rows.find((row) => row.kind === 'CLICK')?.n ?? 0)
    return { impressions, clicks }
  }

  async impressionTotals(tenantId: string, linkIds: string[]): Promise<Map<string, number>> {
    const ids = [...new Set(linkIds)]
    if (ids.length === 0) return new Map()
    const rows = await this.client.$queryRaw<Array<{ linkId: string; n: number }>>`
      SELECT "linkId", COUNT(*)::int AS n
      FROM analytics_events
      WHERE "tenantId" = ${tenantId}
        AND kind = 'IMPRESSION'
        AND "linkId" IN (${Prisma.join(ids)})
      GROUP BY "linkId"
    `
    return new Map(rows.map((row) => [row.linkId, Number(row.n)]))
  }
}

export class RecordingAnalyticsRepository implements AnalyticsRepository {
  readonly rows: AnalyticsInsert[] = []

  async insert(event: AnalyticsInsert): Promise<'inserted' | 'duplicate'> {
    const exists = this.rows.some((row) =>
      row.sessionId === event.sessionId
      && row.linkId === event.linkId
      && row.surface === event.surface
      && row.day === event.day
      && row.kind === event.kind,
    )
    if (exists) return 'duplicate'
    this.rows.push(event)
    return 'inserted'
  }

  async totals(input: { tenantId: string; linkId: string; from?: string; to?: string }): Promise<{ impressions: number; clicks: number }> {
    const rows = this.rows.filter((row) => {
      if (row.tenantId !== input.tenantId || row.linkId !== input.linkId) return false
      if (input.from && row.day < input.from) return false
      if (input.to && row.day > input.to) return false
      return true
    })
    return {
      impressions: rows.filter((row) => row.kind === 'IMPRESSION').length,
      clicks: rows.filter((row) => row.kind === 'CLICK').length,
    }
  }

  async impressionTotals(tenantId: string, linkIds: string[]): Promise<Map<string, number>> {
    const wanted = new Set(linkIds)
    const counts = new Map<string, number>()
    for (const row of this.rows) {
      if (row.tenantId !== tenantId || row.kind !== 'IMPRESSION' || !wanted.has(row.linkId)) continue
      counts.set(row.linkId, (counts.get(row.linkId) ?? 0) + 1)
    }
    return counts
  }
}

let analyticsRepository: AnalyticsRepository =
  process.env.NODE_ENV === 'test'
    ? new RecordingAnalyticsRepository()
    : new PrismaAnalyticsRepository(prisma)

export function getAnalyticsRepository(): AnalyticsRepository {
  return analyticsRepository
}

export function setAnalyticsRepositoryForTest(repository: AnalyticsRepository): void {
  if (process.env.NODE_ENV !== 'test') return
  analyticsRepository = repository
}
