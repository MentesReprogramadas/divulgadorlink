import { moveOrder } from '@/domain/payments/move-order'
import type { Order } from '@/domain/payments/order'
import type { OrdersRepository } from '@/repositories/orders-repository'
import { RefundActivationForbiddenError } from '@/use-cases/errors/refund-activation-forbidden-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export class RegisterRefundResolvedUseCase {
  constructor(private ordersRepository: OrdersRepository) {}

  async execute(orderId: string): Promise<Order> {
    const order = await this.ordersRepository.findById(orderId)

    if (!order) {
      throw new ResourceNotFoundError()
    }

    if (order.status !== 'REFUND_FAILED') {
      throw new RefundActivationForbiddenError()
    }

    moveOrder(order, 'REFUNDED')
    await this.ordersRepository.save(order)
    return order
  }
}
