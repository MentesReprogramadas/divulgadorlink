import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PrismaAnalyticsRepository } from './analytics-repository'
import type { PerformanceQuery, PromotionPerformanceRepository } from '@/use-cases/@Analytics/promotion-performance'

export class PrismaPromotionPerformanceRepository implements PromotionPerformanceRepository {
  constructor(private readonly db: PrismaClient) {}
  async authorizedLink(tenantId: string, linkId: string, actorId: string) {
    const actor = await this.db.user.findFirst({ where: { id: actorId, tenantId, status: 'ACTIVE' }, select: { role: true } })
    if (!actor) return null
    return this.db.link.findFirst({ where: { id: linkId, tenantId, ...(actor.role === 'ADMIN' ? {} : { ownerId: actorId }) }, select: { id: true, name: true } })
  }
  async read(query: PerformanceQuery) {
    const [rows, campaigns] = await Promise.all([
      new PrismaAnalyticsRepository(this.db).performanceSeries(query),
      this.db.promotion.findMany({ where: { tenantId: query.tenantId, linkId: query.linkId }, orderBy: [{ activatedAt: 'desc' }, { id: 'asc' }], select: {
        id: true, surface: true, status: true, activatedAt: true, expiresAt: true, administrative: true,
        investments: { where: { order: { status: 'PAID' } }, select: { amountCents: true, startsAt: true, endsAt: true, pauseRevision: true } },
        pauses: { select: { revision: true, startsAt: true, endsAt: true }, orderBy: { revision: 'asc' } },
      } }),
    ])
    return { rows, campaigns }
  }
}

let repository: PromotionPerformanceRepository | null = null
export function getPromotionPerformanceRepository(): PromotionPerformanceRepository { return repository ?? new PrismaPromotionPerformanceRepository(prisma) }
export function setPromotionPerformanceRepositoryForTest(value: PromotionPerformanceRepository | null): void {
  if (process.env.NODE_ENV === 'test') repository = value
}
