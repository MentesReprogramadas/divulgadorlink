import { describe, expect, it } from 'vitest'
import { orderMachine, promotionMachine, transition } from '@/domain/state/transition'

describe('pedido', () => {
  it('não deixa REFUND_FAILED virar PAID', () => {
    expect(() => transition(orderMachine, 'REFUND_FAILED', 'PAID')).toThrow(/transição/)
    expect(transition(orderMachine, 'REFUND_FAILED', 'REFUNDED')).toBe('REFUNDED')
  })

  it('não religa promoção cancelada', () => {
    expect(() => transition(promotionMachine, 'CANCELLED', 'ACTIVE')).toThrow(/transição/)
  })
})
