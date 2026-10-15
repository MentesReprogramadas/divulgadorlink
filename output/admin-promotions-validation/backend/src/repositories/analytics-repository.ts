import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
