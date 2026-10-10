import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  analyticsToPurge,
  cutoffInstant,
  purgeBefore,
  type RetentionEvent,
  type RetentionStore,
} from '@/use-cases/@Analytics/purge-old-events'

export type RetentionView = RetentionStore & {
  pending(now: Date): Promise<number>
}

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export class MemoryRetentionStore implements RetentionView {
  rows: RetentionEvent[] = []

  async takeExpired(before: Date, limit: number): Promise<RetentionEvent[]> {
    return analyticsToPurge(this.rows, before).slice(0, limit)
  }

  async deleteIds(ids: string[]): Promise<void> {
    const drop = new Set(ids)
    this.rows = this.rows.filter((row) => !drop.has(row.id))
  }

  async pending(now: Date): Promise<number> {
    return analyticsToPurge(this.rows, purgeBefore(now)).length
  }
}

export class PrismaRetentionView implements RetentionView {
  constructor(private readonly client: PrismaClient) {}

  async takeExpired(before: Date, limit: number): Promise<RetentionEvent[]> {
    const day = before.toISOString().slice(0, 10)
    const rows = await this.client.analyticsEvent.findMany({
      where: { day: { lt: new Date(`${day}T00:00:00.000Z`) } },
      select: { id: true, day: true },
      take: limit,
    })
    return rows.map((row) => ({ id: row.id, day: dayKey(row.day) }))
  }

  async deleteIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.client.analyticsEvent.deleteMany({ where: { id: { in: ids } } })
  }

  async pending(now: Date): Promise<number> {
    return this.client.analyticsEvent.count({ where: { day: { lt: cutoffInstant(now) } } })
  }
}

const memory = new MemoryRetentionStore()

export function resetRetentionViewForTest(): void {
  memory.rows = []
}

export function retentionView(): RetentionView {
  if (process.env.NODE_ENV === 'test') return memory
  return new PrismaRetentionView(prisma)
}

export function prismaRetentionView(): RetentionView {
  return new PrismaRetentionView(prisma)
}
