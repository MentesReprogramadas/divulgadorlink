import type { Order } from '@/domain/payments/order'
import type { PaymentGateway } from '@/domain/payments/payment-gateway'
import type { RefundScheduler } from '@/domain/payments/refund-scheduler'
import type { OrdersRepository } from '@/repositories/orders-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export const MAX_REFUND_ATTEMPTS = 3

interface RequestPixRefundResponse {
  order: Order
  attempted: boolean
}

export class RequestPixRefundUseCase {
  constructor(
    private ordersRepository: OrdersRepository,
    private gateway: PaymentGateway,
    private refundScheduler: RefundScheduler,
  ) {}

  async execute(orderId: string): Promise<RequestPixRefundResponse> {
    const order = await this.ordersRepository.findById(orderId)

    if (!order || !order.gatewayChargeId) {
      throw new ResourceNotFoundError()
    }

    if (order.status !== 'PAID_LATE' && order.status !== 'REFUND_PENDING') {
      return { order, attempted: false }
    }

    if (order.refundAttempts >= MAX_REFUND_ATTEMPTS) {
      order.status = 'REFUND_FAILED'
      await this.ordersRepository.save(order)
      return { order, attempted: false }
    }

    const correlationId = order.refundCorrelationId ?? `refund-${order.id}`
    order.refundCorrelationId = correlationId

    try {
      const result = await this.gateway.refund({
        gatewayChargeId: order.gatewayChargeId,
        correlationId,
        amountCents: order.amountCents,
      })

      if (result.status === 'FAILED') {
        return await this.registerFailure(order)
      }

      order.status = result.status === 'CONFIRMED' ? 'REFUNDED' : 'REFUND_PENDING'
      await this.ordersRepository.save(order)
      return { order, attempted: true }
    } catch {
      return await this.registerFailure(order)
    }
  }

  private async registerFailure(order: Order): Promise<RequestPixRefundResponse> {
    order.refundAttempts += 1

    if (order.refundAttempts >= MAX_REFUND_ATTEMPTS) {
      order.status = 'REFUND_FAILED'
      await this.ordersRepository.save(order)
      return { order, attempted: true }
    }

    order.status = 'REFUND_PENDING'
    await this.ordersRepository.save(order)
    await this.refundScheduler.scheduleRetry(order.id)
    return { order, attempted: true }
  }
}
