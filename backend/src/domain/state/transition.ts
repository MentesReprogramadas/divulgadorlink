export function transition<T extends string>(machine: Record<string, readonly T[]>, from: T, to: T): T {
  if (!machine[from]?.includes(to)) throw new Error('transição inválida')
  return to
}

export const orderMachine = {
  PENDING_PAYMENT: ['PAID', 'EXPIRED'],
  EXPIRED: ['PAID_LATE'],
  PAID_LATE: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED', 'REFUND_FAILED'],
  REFUND_FAILED: ['REFUNDED'],
  PAID: [],
  REFUNDED: [],
} as const

export const promotionMachine = {
  ACTIVE: ['EXPIRED', 'CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
} as const

export const linkMachine = {
  DRAFT: ['PENDING_MODERATION', 'UNAVAILABLE'],
  PENDING_MODERATION: ['PUBLISHED', 'PRE_REJECTED', 'UNAVAILABLE'],
  PRE_REJECTED: ['PENDING_MODERATION', 'UNAVAILABLE'],
  PUBLISHED: ['UNAVAILABLE'],
  UNAVAILABLE: [],
} as const
