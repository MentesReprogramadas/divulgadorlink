import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
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
  totals(input: { tenantId: string; linkId: string; from: string; to: string }): Promise<{ impressions: number; clicks: number }>
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

  async totals(input: { tenantId: string; linkId: string; from: string; to: string }): Promise<{ impressions: number; clicks: number }> {
    const rows = await this.client.$queryRaw<Array<{ kind: string; n: number }>>`
      SELECT kind, COUNT(*)::int AS n
      FROM analytics_events
      WHERE "tenantId" = ${input.tenantId}
        AND "linkId" = ${input.linkId}
        AND day >= ${input.from}::date
        AND day <= ${input.to}::date
      GROUP BY kind
    `
    const impressions = rows.find((row) => row.kind === 'IMPRESSION')?.n ?? 0
    const clicks = rows.find((row) => row.kind === 'CLICK')?.n ?? 0
    return { impressions, clicks }
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

  async totals(input: { tenantId: string; linkId: string; from: string; to: string }): Promise<{ impressions: number; clicks: number }> {
    const rows = this.rows.filter((row) => row.tenantId === input.tenantId && row.linkId === input.linkId && row.day >= input.from && row.day <= input.to)
    return {
      impressions: rows.filter((row) => row.kind === 'IMPRESSION').length,
      clicks: rows.filter((row) => row.kind === 'CLICK').length,
    }
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
