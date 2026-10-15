import type { Order } from '@/domain/payments/order'
import type { OrdersRepository } from '@/repositories/orders-repository'

export class InMemoryOrdersRepository implements OrdersRepository {
  items: Order[] = []

  async findById(id: string): Promise<Order | null> {
    return this.items.find((order) => order.id === id) ?? null
  }

  async save(order: Order): Promise<void> {
    const index = this.items.findIndex((item) => item.id === order.id)
    if (index === -1) {
      this.items.push(order)
      return
    }
    this.items[index] = order
  }
}
