import { enqueueRefundNotification } from '@/adapters/queues/enqueue-payment-job'
import type { PaymentGateway } from '@/domain/payments/payment-gateway'
import { logDomainEvent } from '@/observability/logger'
import { ExpirePixOrderUseCase } from '@/use-cases/@Payments/expire-pix-order'
import { RequestPixRefundUseCase } from '@/use-cases/@Payments/request-pix-refund'
import { getCheckoutStore, StoreOrdersRepository } from '@/use-cases/@Promotions/checkout-store'
import { PrismaCheckoutStore, runtimeCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'

const notices: string[] = []

export function refundFailureNotices(): readonly string[] {
  return notices
}

export function resetRefundFailureNotices(): void {
  notices.length = 0
}

function ordersForJobs() {
  const store = runtimeCheckoutStore()
  if (store instanceof PrismaCheckoutStore) {
    return {
      async findById(id: string) {
        return (await store.findCommercial(id))?.order ?? null
      },
      async save(order: import('@/domain/payments/order').Order) {
        await store.saveOrder(order)
      },
    }
  }
  return new StoreOrdersRepository(getCheckoutStore())
}

export async function runExpirePix(orderId: string, now = new Date()): Promise<void> {
  const orders = ordersForJobs()
  const result = await new ExpirePixOrderUseCase(orders, () => now).execute(orderId)
  if (result.expired) {
    logDomainEvent('payment.expired', { orderId, result: 'expired' })
  }
}

export async function runRefundPix(orderId: string, gateway: PaymentGateway): Promise<void> {
  const orders = ordersForJobs()
  const result = await new RequestPixRefundUseCase(orders, gateway, {
    async scheduleRetry() {
      return undefined
    },
  }).execute(orderId)
  if (result.order.status === 'REFUND_FAILED') {
    await enqueueRefundNotification(orderId)
  }
  if (result.order.status === 'REFUNDED') {
    logDomainEvent('refund.confirmed', { orderId, result: 'refunded' })
  }
}

export async function runNotifyRefundFailed(orderId: string): Promise<void> {
  const row = await runtimeCheckoutStore().findCommercial(orderId)
  if (!row || notices.includes(orderId)) return
  notices.push(orderId)
  logDomainEvent('refund.failed', {
    orderId,
    attempt: row.order.refundAttempts,
    result: 'failed',
  })
}

export function refundFailureMessage(orderId: string): string {
  return `Pedido ${orderId}: o Pix chegou depois do prazo, a promoção não foi ativada e o estorno não foi concluído.`
}
