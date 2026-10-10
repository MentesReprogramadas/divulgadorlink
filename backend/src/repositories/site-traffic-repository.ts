import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ConsentChoice = 'marketing' | 'denied'

export type VisitInput = {
  tenantId: string
  day: string
  path: string
  source: string
  medium: string
  campaign: string
  entry: boolean
}

export type TrafficReport = {
  views: number
  entries: number
  daily: Array<{ day: string; views: number; entries: number }>
  paths: Array<{ path: string; views: number; entries: number }>
  campaigns: Array<{ source: string; medium: string; campaign: string; entries: number }>
  consent: { marketing: number; denied: number }
}

export interface SiteTrafficRepository {
  recordVisit(input: VisitInput): Promise<void>
  recordConsent(input: { tenantId: string; day: string; choice: ConsentChoice }): Promise<void>
  report(input: { tenantId: string; from: string; cap: number }): Promise<TrafficReport>
}

type VisitRow = Omit<VisitInput, 'entry'> & { views: number; entries: number }

export class MemorySiteTrafficRepository implements SiteTrafficRepository {
  visits: VisitRow[] = []
  consents: Array<{ tenantId: string; day: string; choice: ConsentChoice; count: number }> = []

  async recordVisit(input: VisitInput): Promise<void> {
    const source = input.entry ? input.source : ''
    const medium = input.entry ? input.medium : ''
    const campaign = input.entry ? input.campaign : ''
    const row = this.visits.find((item) => item.tenantId === input.tenantId && item.day === input.day
      && item.path === input.path && item.source === source && item.medium === medium && item.campaign === campaign)
    if (row) {
      row.views += 1
      row.entries += input.entry ? 1 : 0
      return
    }
    this.visits.push({
      tenantId: input.tenantId, day: input.day, path: input.path, source, medium, campaign,
      views: 1, entries: input.entry ? 1 : 0,
    })
  }

  async recordConsent(input: { tenantId: string; day: string; choice: ConsentChoice }): Promise<void> {
    const row = this.consents.find((item) => item.tenantId === input.tenantId && item.day === input.day && item.choice === input.choice)
    if (row) row.count += 1
    else this.consents.push({ ...input, count: 1 })
  }

  async report(input: { tenantId: string; from: string; cap: number }): Promise<TrafficReport> {
    const rows = this.visits.filter((row) => row.tenantId === input.tenantId && row.day >= input.from)
    const sum = <K extends string>(key: (row: VisitRow) => K) => {
      const map = new Map<K, { views: number; entries: number; row: VisitRow }>()
      for (const row of rows) {
        const current = map.get(key(row)) ?? { views: 0, entries: 0, row }
        current.views += row.views
        current.entries += row.entries
        map.set(key(row), current)
      }
      return [...map.entries()]
    }
    const consents = this.consents.filter((row) => row.tenantId === input.tenantId && row.day >= input.from)
    return {
      views: rows.reduce((total, row) => total + row.views, 0),
      entries: rows.reduce((total, row) => total + row.entries, 0),
      daily: sum((row) => row.day).map(([day, item]) => ({ day, views: item.views, entries: item.entries })).sort((a, b) => a.day.localeCompare(b.day)),
      paths: sum((row) => row.path).map(([path, item]) => ({ path, views: item.views, entries: item.entries }))
        .sort((a, b) => b.views - a.views).slice(0, input.cap),
      campaigns: sum((row) => `${row.source}|${row.medium}|${row.campaign}`)
        .filter(([, item]) => item.row.campaign !== '')
        .map(([, item]) => ({ source: item.row.source, medium: item.row.medium, campaign: item.row.campaign, entries: item.entries }))
        .sort((a, b) => b.entries - a.entries).slice(0, input.cap),
      consent: {
        marketing: consents.filter((row) => row.choice === 'marketing').reduce((total, row) => total + row.count, 0),
        denied: consents.filter((row) => row.choice === 'denied').reduce((total, row) => total + row.count, 0),
      },
    }
  }

  reset(): void {
    this.visits = []
    this.consents = []
  }
}

export class PrismaSiteTrafficRepository implements SiteTrafficRepository {
  constructor(private readonly client: PrismaClient) {}

  async recordVisit(input: VisitInput): Promise<void> {
    const entry = input.entry ? 1 : 0
    await this.client.$executeRaw`
      INSERT INTO site_traffic_daily (id, "tenantId", day, path, source, medium, campaign, views, entries)
      VALUES (
        ${randomUUID()}, ${input.tenantId}, ${input.day}::date, ${input.path},
        ${input.entry ? input.source : ''}, ${input.entry ? input.medium : ''}, ${input.entry ? input.campaign : ''},
        1, ${entry}
      )
      ON CONFLICT ("tenantId", day, path, source, medium, campaign)
      DO UPDATE SET views = site_traffic_daily.views + 1, entries = site_traffic_daily.entries + ${entry}
    `
  }

  async recordConsent(input: { tenantId: string; day: string; choice: ConsentChoice }): Promise<void> {
    await this.client.$executeRaw`
      INSERT INTO consent_daily (id, "tenantId", day, choice, count)
      VALUES (${randomUUID()}, ${input.tenantId}, ${input.day}::date, ${input.choice}, 1)
      ON CONFLICT ("tenantId", day, choice) DO UPDATE SET count = consent_daily.count + 1
    `
  }

  async report(input: { tenantId: string; from: string; cap: number }): Promise<TrafficReport> {
    const [daily, paths, campaigns, consent] = await Promise.all([
      this.client.$queryRaw<Array<{ day: string; views: number; entries: number }>>`
        SELECT to_char(day, 'YYYY-MM-DD') AS day, SUM(views)::int AS views, SUM(entries)::int AS entries
        FROM site_traffic_daily
        WHERE "tenantId" = ${input.tenantId} AND day >= ${input.from}::date
        GROUP BY day
        ORDER BY day
      `,
      this.client.$queryRaw<Array<{ path: string; views: number; entries: number }>>`
        SELECT path, SUM(views)::int AS views, SUM(entries)::int AS entries
        FROM site_traffic_daily
        WHERE "tenantId" = ${input.tenantId} AND day >= ${input.from}::date
        GROUP BY path
        ORDER BY views DESC
        LIMIT ${input.cap}
      `,
      this.client.$queryRaw<Array<{ source: string; medium: string; campaign: string; entries: number }>>`
        SELECT source, medium, campaign, SUM(entries)::int AS entries
        FROM site_traffic_daily
        WHERE "tenantId" = ${input.tenantId} AND day >= ${input.from}::date AND campaign <> ''
        GROUP BY source, medium, campaign
        ORDER BY entries DESC
        LIMIT ${input.cap}
      `,
      this.client.$queryRaw<Array<{ choice: string; n: number }>>`
        SELECT choice, SUM(count)::int AS n
        FROM consent_daily
        WHERE "tenantId" = ${input.tenantId} AND day >= ${input.from}::date
        GROUP BY choice
      `,
    ])
    const numeric = <T extends { views: number; entries: number }>(row: T) => ({ ...row, views: Number(row.views), entries: Number(row.entries) })
    return {
      views: daily.reduce((total, row) => total + Number(row.views), 0),
      entries: daily.reduce((total, row) => total + Number(row.entries), 0),
      daily: daily.map(numeric),
      paths: paths.map(numeric),
      campaigns: campaigns.map((row) => ({ ...row, entries: Number(row.entries) })),
      consent: {
        marketing: Number(consent.find((row) => row.choice === 'marketing')?.n ?? 0),
        denied: Number(consent.find((row) => row.choice === 'denied')?.n ?? 0),
      },
    }
  }
}

const memory = new MemorySiteTrafficRepository()

export function getSiteTrafficRepository(): SiteTrafficRepository {
  return process.env.NODE_ENV === 'test' ? memory : new PrismaSiteTrafficRepository(prisma)
}

export function resetSiteTrafficForTest(): void {
  memory.reset()
}
