import type { Order } from '@/domain/payments/order'

export interface OrdersRepository {
  findById(id: string): Promise<Order | null>
  save(order: Order): Promise<void>
}
