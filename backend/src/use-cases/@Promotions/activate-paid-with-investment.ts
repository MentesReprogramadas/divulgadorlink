import type { PrismaClient } from '@prisma/client'
import { allocateSurfaceCents } from '@/domain/analytics/performance'
import { renew } from './renew'

export async function activatePaidWithInvestment(db: PrismaClient, orderId: string, now: Date): Promise<void> {
  await db.$transaction(async tx => {
    await tx.$queryRawUnsafe('SELECT id FROM orders WHERE id = $1 FOR UPDATE', orderId)
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { surfaces: true } })
    if (!order || order.status !== 'PAID') return
    // Different paid orders can renew the same promotion concurrently.
    await tx.$queryRawUnsafe('SELECT id FROM links WHERE id = $1 AND "tenantId" = $2 FOR UPDATE', order.linkId, order.tenantId)
    const surfaces = [...new Set(order.surfaces.map(row => row.surface))]
    if (!surfaces.length) return
    const amounts = allocateSurfaceCents(order.amountCents, surfaces)
    await tx.orderSurface.updateMany({ where: { orderId }, data: { hold: 'RELEASED' } })
    for (const surface of surfaces) {
      if (await tx.promotionInvestment.findUnique({ where: { orderId_surface: { orderId, surface } } })) continue
      let promotion, startsAt: Date, endsAt: Date
      if (order.renewal) {
        const current = await tx.promotion.findFirst({ where: { tenantId: order.tenantId, linkId: order.linkId, surface, status: 'ACTIVE' }, orderBy: { activatedAt: 'desc' } })
        if (!current) continue
        const next = renew({ ...current, durationDays: order.durationDays })
        startsAt = current.expiresAt!
        endsAt = next.expiresAt
        promotion = await tx.promotion.update({ where: { id: current.id }, data: { expiresAt: endsAt } })
      } else {
        startsAt = now
        endsAt = new Date(now.getTime() + order.durationDays * 86400000)
        promotion = await tx.promotion.create({ data: { tenantId: order.tenantId, linkId: order.linkId, surface, status: 'ACTIVE', activatedAt: startsAt, expiresAt: endsAt } })
      }
      await tx.promotionInvestment.create({ data: { tenantId: order.tenantId, orderId, promotionId: promotion.id, surface, amountCents: amounts[surface]!, startsAt, endsAt } })
    }
  }, { timeout: 15000 })
}
