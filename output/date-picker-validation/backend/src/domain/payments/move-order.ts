import type { Order, OrderStatus } from '@/domain/payments/order'
import { orderMachine, transition } from '@/domain/state/transition'

export function moveOrder(order: Order, to: OrderStatus): void {
  if (order.status === to) return
  if (to === 'PAID_LATE' && order.status === 'PENDING_PAYMENT') {
    order.status = transition(orderMachine, order.status, 'EXPIRED')
  }
  if (to === 'REFUNDED' && order.status === 'PAID_LATE') {
    order.status = transition(orderMachine, order.status, 'REFUND_PENDING')
  }
  order.status = transition(orderMachine, order.status, to)
}
