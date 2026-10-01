import type { CheckoutGateway } from '@/use-cases/@Promotions/start-checkout'
import { pixExpiresInSeconds } from '@/domain/payments/pix-expiration'
import type { CheckoutStore } from '@/use-cases/@Promotions/checkout-store'
import { ExpirePixOrderUseCase } from '@/use-cases/@Payments/expire-pix-order'

export async function recoverUnchargedOrder(input: {
  store: CheckoutStore
  orderId: string
  gateway: CheckoutGateway
  gateways?: Partial<Record<'PIX' | 'CARD', CheckoutGateway>>
  now?: Date
  claim?: () => Promise<boolean>
  release?: () => Promise<void>
  scheduleExpire?: (orderId: string, delayMs: number) => Promise<void>
}): Promise<'charged' | 'expired' | 'skipped'> {
  const row = await input.store.findCommercial(input.orderId)
  if (!row || row.order.status !== 'PENDING_PAYMENT' || row.order.gatewayChargeId) return 'skipped'
  const now = input.now ?? new Date()
  if (row.order.method === 'PIX' && row.order.pixExpiresAt && now.getTime() >= row.order.pixExpiresAt.getTime()) {
    const orders = {
      async findById(id: string) {
        return (await input.store.findCommercial(id))?.order ?? null
      },
      save: (order: import('@/domain/payments/order').Order) => input.store.saveOrder(order),
    }
    await new ExpirePixOrderUseCase(orders, () => now).execute(input.orderId)
    return 'expired'
  }
  const gateway = input.gateway.method === row.order.method
    ? input.gateway
    : input.gateways?.[row.order.method]
  if (!gateway || gateway.method !== row.order.method) return 'skipped'
  const claimed = await (input.claim?.() ?? Promise.resolve(true))
  if (!claimed) return 'skipped'
  const ttlSeconds = pixExpiresInSeconds()
  try {
    const charge = await gateway.createCharge({
      orderId: row.order.id,
      amountCents: row.order.amountCents,
      expiresInSeconds: ttlSeconds,
    })
    await input.store.attachCharge(row.order.id, {
      gatewayChargeId: charge.gatewayChargeId,
      brCode: charge.brCode,
      clientSecret: charge.clientSecret,
      expiresAt: charge.expiresAt,
    })
    if (row.order.method === 'PIX' && input.scheduleExpire) {
      await input.scheduleExpire(row.order.id, ttlSeconds * 1000)
    }
    return 'charged'
  } finally {
    await input.release?.()
  }
}
