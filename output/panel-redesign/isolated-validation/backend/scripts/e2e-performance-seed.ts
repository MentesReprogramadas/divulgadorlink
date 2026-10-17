import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { analyticsDay, analyticsDayStart, shiftAnalyticsDay } from '../src/domain/analytics/day'
import { activatePaidWithInvestment } from '../src/use-cases/@Promotions/activate-paid-with-investment'

export async function seedPerformance(db: PrismaClient, input: { tenantId: string; ownerId: string; networkId: string; nicheId: string }) {
  const to = shiftAnalyticsDay(analyticsDay(new Date()), -1), from = shiftAnalyticsDay(to, -6)
  const start = analyticsDayStart(from)
  const link = await db.link.create({ data: { ...input, id: 'f01-report-link', canonicalUrl: 'https://example.com/report-fixture', name: 'Comunidade Aprender', description: 'Relatório determinístico', status: 'PUBLISHED', everPublished: true } })
  const campaigns: string[] = []
  for (const surface of ['HOME', 'SEARCH'] as const) {
    const order = await db.order.create({ data: { tenantId: input.tenantId, userId: input.ownerId, linkId: link.id, status: 'PAID', method: 'PIX', productCode: surface, durationDays: 7, amountCents: 1000, savingsCents: 0, paidAt: start, surfaces: { create: { linkId: link.id, surface } } } })
    await activatePaidWithInvestment(db, order.id, start)
    campaigns.push((await db.promotionInvestment.findFirstOrThrow({ where: { orderId: order.id } })).promotionId)
    const previous = new Date(start.getTime() - 6 * 86400000)
    for (const [at, impressions, clicks] of [[new Date(start.getTime() + 3600000), 100, surface === 'SEARCH' ? 10 : 0], [previous, 50, 5]] as const) {
      await db.analyticsEvent.createMany({ data: [...Array.from({ length: impressions }, () => ({ kind: 'IMPRESSION' })), ...Array.from({ length: clicks }, () => ({ kind: 'CLICK' }))].map(event => ({ ...event, id: randomUUID(), tenantId: input.tenantId, linkId: link.id, sessionId: randomUUID(), surface, day: new Date(analyticsDay(at) + 'T00:00Z'), createdAt: at, updatedAt: at })) })
    }
  }
  return { linkId: link.id, from, to, home: campaigns[0]!, search: campaigns[1]! }
}
