import type { Order } from '@/domain/payments/order'
import type { OrdersRepository } from '@/repositories/orders-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

interface ExpirePixOrderResponse {
  order: Order
  expired: boolean
}

export class ExpirePixOrderUseCase {
  constructor(
    private ordersRepository: OrdersRepository,
    private now: () => Date = () => new Date(),
  ) {}

  async execute(orderId: string): Promise<ExpirePixOrderResponse> {
    const order = await this.ordersRepository.findById(orderId)

    if (!order) {
      throw new ResourceNotFoundError()
    }

    if (order.method !== 'PIX' || order.status !== 'PENDING_PAYMENT') {
      return { order, expired: false }
    }

    if (order.pixExpiresAt && this.now().getTime() < order.pixExpiresAt.getTime()) {
      return { order, expired: false }
    }

    order.status = 'EXPIRED'
    await this.ordersRepository.save(order)

    return { order, expired: true }
  }
}
