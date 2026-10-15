import { moveOrder } from '@/domain/payments/move-order'
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
      moveOrder(order, 'REFUND_FAILED')
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
        return await this.registerFailure(order, 'gateway recusou')
      }

      if (result.status === 'CONFIRMED') {
        order.refundIds = [...(order.refundIds ?? []), result.refundId]
        moveOrder(order, 'REFUNDED')
      } else {
        moveOrder(order, 'REFUND_PENDING')
      }
      await this.ordersRepository.save(order)
      return { order, attempted: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'gateway'
      return await this.registerFailure(order, message)
    }
  }

  private async registerFailure(order: Order, message: string): Promise<RequestPixRefundResponse> {
    order.refundAttempts += 1
    order.refundErrors = [...(order.refundErrors ?? []), message]

    if (order.refundAttempts >= MAX_REFUND_ATTEMPTS) {
      moveOrder(order, 'REFUND_FAILED')
      await this.ordersRepository.save(order)
      return { order, attempted: true }
    }

    moveOrder(order, 'REFUND_PENDING')
    await this.ordersRepository.save(order)
    await this.refundScheduler.scheduleRetry(order.id, order.refundAttempts)
    return { order, attempted: true }
  }
}
