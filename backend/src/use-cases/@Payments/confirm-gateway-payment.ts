import { isPixLate, type Order } from '@/domain/payments/order'
import type { PaymentGateway } from '@/domain/payments/payment-gateway'
import type { PromotionActivator } from '@/domain/payments/promotion-activator'
import type { RefundScheduler } from '@/domain/payments/refund-scheduler'
import type { OrdersRepository } from '@/repositories/orders-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

interface ConfirmGatewayPaymentRequest {
  orderId: string
  eventId: string
}

interface ConfirmGatewayPaymentResponse {
  order: Order
  activated: boolean
}

const REFUND_STATUSES = new Set([
  'PAID_LATE',
  'REFUND_PENDING',
  'REFUNDED',
  'REFUND_FAILED',
])

export class ConfirmGatewayPaymentUseCase {
  constructor(
    private ordersRepository: OrdersRepository,
    private gateway: PaymentGateway,
    private promotionActivator: PromotionActivator,
    private refundScheduler: RefundScheduler,
    private now: () => Date = () => new Date(),
  ) {}

  async execute({
    orderId,
    eventId,
  }: ConfirmGatewayPaymentRequest): Promise<ConfirmGatewayPaymentResponse> {
    const order = await this.ordersRepository.findById(orderId)

    if (!order || !order.gatewayChargeId) {
      throw new ResourceNotFoundError()
    }

    if (order.processedEventIds.includes(eventId)) {
      return { order, activated: false }
    }

    const charge = await this.gateway.getCharge(order.gatewayChargeId)
    order.processedEventIds = [...order.processedEventIds, eventId]

    if (charge.status !== 'PAID') {
      await this.ordersRepository.save(order)
      return { order, activated: false }
    }

    if (order.status === 'PAID') {
      await this.ordersRepository.save(order)
      return { order, activated: false }
    }

    if (REFUND_STATUSES.has(order.status) || isPixLate(order, this.now())) {
      const shouldRequestRefund =
        order.status === 'PENDING_PAYMENT' || order.status === 'EXPIRED'

      if (shouldRequestRefund) {
        order.status = 'PAID_LATE'
      }

      await this.ordersRepository.save(order)

      if (shouldRequestRefund) {
        await this.refundScheduler.scheduleRetry(order.id)
      }

      return { order, activated: false }
    }

    order.status = 'PAID'
    await this.ordersRepository.save(order)
    await this.promotionActivator.activateFromPaidOrder(order.id)

    return { order, activated: true }
  }
}
