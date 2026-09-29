export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'EXPIRED',
  'PAID_LATE',
  'REFUND_PENDING',
  'REFUNDED',
  'REFUND_FAILED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type PaymentMethod = 'PIX' | 'CARD'

export interface Order {
  id: string
  method: PaymentMethod
  status: OrderStatus
  amountCents: number
  pixExpiresAt: Date | null
  gatewayChargeId: string | null
  refundCorrelationId: string | null
  refundAttempts: number
  processedEventIds: string[]
}

export function isPixLate(order: Order, now: Date): boolean {
  if (order.method !== 'PIX') return false
  if (order.status === 'EXPIRED' || order.status === 'PAID_LATE') return true
  if (!order.pixExpiresAt) return false
  return now.getTime() > order.pixExpiresAt.getTime()
}
