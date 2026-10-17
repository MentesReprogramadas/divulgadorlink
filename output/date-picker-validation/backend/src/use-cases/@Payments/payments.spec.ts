import { describe, expect, it } from 'vitest'
import type { PaymentGateway, RefundResult } from '@/domain/payments/payment-gateway'
import type { Order } from '@/domain/payments/order'
import { ConfirmGatewayPaymentUseCase } from './confirm-gateway-payment'
import { ExpirePixOrderUseCase } from './expire-pix-order'
import { InMemoryOrdersRepository } from './in-memory-orders-repository'
import { RegisterRefundResolvedUseCase } from './register-refund-resolved'
import { RequestPixRefundUseCase } from './request-pix-refund'
import { RefundActivationForbiddenError } from '@/use-cases/errors/refund-activation-forbidden-error'

function pixOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    method: 'PIX',
    status: 'PENDING_PAYMENT',
    amountCents: 1990,
    pixExpiresAt: new Date('2026-09-29T15:30:00.000Z'),
    gatewayChargeId: 'charge-1',
    refundCorrelationId: null,
    refundAttempts: 0,
    processedEventIds: [],
    ...overrides,
  }
}

function gateway(status: 'PENDING' | 'PAID' | 'EXPIRED', refund?: RefundResult): PaymentGateway {
  return {
    method: 'PIX',
    async getCharge() {
      return { status, paidAt: status === 'PAID' ? new Date('2026-09-29T15:10:00.000Z') : null }
    },
    async refund(input) {
      if (refund) return refund
      return { refundId: input.correlationId, status: 'PROCESSING' }
    },
  }
}

describe('pagamento', () => {
  it('ativa a promoção quando o Pix é confirmado dentro do prazo', async () => {
    const orders = new InMemoryOrdersRepository()
    await orders.save(pixOrder())
    const activated: string[] = []

    const useCase = new ConfirmGatewayPaymentUseCase(
      orders,
      gateway('PAID'),
      { async activateFromPaidOrder(orderId) { activated.push(orderId) } },
      { async scheduleRetry() {} },
      () => new Date('2026-09-29T15:10:00.000Z'),
    )

    const result = await useCase.execute({ orderId: 'order-1', eventId: 'evt-1' })

    expect(result.activated).toBe(true)
    expect(result.order.status).toBe('PAID')
    expect(activated).toEqual(['order-1'])
  })

  it('não ativa promoção quando o Pix chega depois do prazo e pede estorno uma vez', async () => {
    const orders = new InMemoryOrdersRepository()
    await orders.save(pixOrder({ status: 'EXPIRED' }))
    const activated: string[] = []
    const retries: string[] = []

    const useCase = new ConfirmGatewayPaymentUseCase(
      orders,
      gateway('PAID'),
      { async activateFromPaidOrder(orderId) { activated.push(orderId) } },
      { async scheduleRetry(orderId) { retries.push(orderId) } },
      () => new Date('2026-09-29T16:00:00.000Z'),
    )

    await useCase.execute({ orderId: 'order-1', eventId: 'evt-1' })
    await useCase.execute({ orderId: 'order-1', eventId: 'evt-1' })

    const saved = await orders.findById('order-1')
    expect(saved?.status).toBe('PAID_LATE')
    expect(activated).toEqual([])
    expect(retries).toEqual(['order-1'])
  })

  it('não pede segundo estorno quando o eventId já foi processado', async () => {
    const orders = new InMemoryOrdersRepository()
    const late = pixOrder({ status: 'EXPIRED' })
    await orders.save(late)
    const scheduler = { calls: 0, scheduleRetry: async () => { scheduler.calls += 1 } }
    const useCase = new ConfirmGatewayPaymentUseCase(
      orders,
      gateway('PAID'),
      { async activateFromPaidOrder() {} },
      scheduler,
      () => new Date('2026-09-29T16:00:00.000Z'),
    )

    await useCase.execute({ orderId: late.id, eventId: 'evt-1' })
    await useCase.execute({ orderId: late.id, eventId: 'evt-1' })

    expect(scheduler.calls).toBe(1)
  })

  it('expira o Pix pendente e libera a superfície sem criar promoção', async () => {
    const orders = new InMemoryOrdersRepository()
    await orders.save(pixOrder())

    const useCase = new ExpirePixOrderUseCase(
      orders,
      () => new Date('2026-09-29T15:30:01.000Z'),
    )

    const result = await useCase.execute('order-1')

    expect(result.expired).toBe(true)
    expect(result.order.status).toBe('EXPIRED')
  })

  it('marca REFUND_FAILED na terceira falha e não pede a quarta', async () => {
    const orders = new InMemoryOrdersRepository()
    await orders.save(pixOrder({
      status: 'PAID_LATE',
      refundCorrelationId: 'refund-order-1',
    }))
    const retries: string[] = []
    const failingGateway: PaymentGateway = {
      method: 'PIX',
      async getCharge() {
        return { status: 'PAID', paidAt: null }
      },
      async refund() {
        throw new Error('gateway down')
      },
    }
    const useCase = new RequestPixRefundUseCase(orders, failingGateway, {
      async scheduleRetry(orderId) { retries.push(orderId) },
    })

    await useCase.execute('order-1')
    await useCase.execute('order-1')
    const third = await useCase.execute('order-1')
    const fourth = await useCase.execute('order-1')

    expect(third.order.status).toBe('REFUND_FAILED')
    expect(third.order.refundAttempts).toBe(3)
    expect(retries).toHaveLength(2)
    expect(fourth.attempted).toBe(false)
    expect(third.order.refundCorrelationId).toBe('refund-order-1')
  })

  it('reusa o mesmo correlationID em todas as tentativas de estorno', async () => {
    const orders = new InMemoryOrdersRepository()
    await orders.save(pixOrder({ status: 'PAID_LATE' }))
    const correlationIds: string[] = []
    const useCase = new RequestPixRefundUseCase(orders, {
      method: 'PIX',
      async getCharge() {
        return { status: 'PAID', paidAt: null }
      },
      async refund(input) {
        correlationIds.push(input.correlationId)
        return { refundId: input.correlationId, status: 'FAILED' }
      },
    }, { async scheduleRetry() {} })

    await useCase.execute('order-1')
    await useCase.execute('order-1')

    expect(correlationIds).toEqual(['refund-order-1', 'refund-order-1'])
  })

  it('admin só registra REFUNDED a partir de REFUND_FAILED', async () => {
    const orders = new InMemoryOrdersRepository()
    await orders.save(pixOrder({ status: 'REFUND_FAILED' }))
    const useCase = new RegisterRefundResolvedUseCase(orders)

    const resolved = await useCase.execute('order-1')
    expect(resolved.status).toBe('REFUNDED')

    await orders.save(pixOrder({ id: 'order-2', status: 'PAID_LATE' }))
    await expect(useCase.execute('order-2')).rejects.toBeInstanceOf(RefundActivationForbiddenError)
  })
})
