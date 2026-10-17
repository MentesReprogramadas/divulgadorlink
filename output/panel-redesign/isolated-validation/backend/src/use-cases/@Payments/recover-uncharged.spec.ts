import { describe, expect, it } from 'vitest'
import { InMemoryCheckoutStore } from '@/use-cases/@Promotions/checkout-store'
import type { CheckoutGateway } from '@/use-cases/@Promotions/start-checkout'
import { recoverUnchargedOrder } from '@/use-cases/@Payments/recover-uncharged'

function gateway(calls: string[]): CheckoutGateway {
  return {
    method: 'PIX',
    async createCharge(input) {
      calls.push(input.orderId)
      return { gatewayChargeId: input.orderId, brCode: '000201' }
    },
  }
}

function idempotentCard(provider: Map<string, string>, calls: string[], failures = { remaining: 0 }): CheckoutGateway {
  return {
    method: 'CARD',
    async createCharge(input) {
      calls.push(input.orderId)
      const key = `card-${input.orderId}`
      const existing = provider.get(key) ?? `pi_${provider.size + 1}`
      provider.set(key, existing)
      if (failures.remaining > 0) {
        failures.remaining -= 1
        throw new Error('timeout')
      }
      return { gatewayChargeId: existing, clientSecret: `${existing}_secret` }
    },
  }
}

async function pending(store: InMemoryCheckoutStore, pixExpiresAt: Date | null, method: 'PIX' | 'CARD' = 'PIX') {
  return store.createPending({
    tenantId: 't',
    userId: 'u',
    linkId: 'link',
    method,
    surfaces: ['SEARCH'],
    durationDays: 7,
    productCode: 'SEARCH',
    amountCents: 790,
    savingsCents: 0,
    idempotencyKey: null,
    renewal: false,
    pixExpiresAt,
  })
}

describe('recuperação de pedido sem charge', () => {
  it('cobra uma vez e a segunda chamada não duplica', async () => {
    const store = new InMemoryCheckoutStore()
    const calls: string[] = []
    const created = await pending(store, new Date(Date.now() + 60_000))
    const first = await recoverUnchargedOrder({ store, orderId: created.order.id, gateway: gateway(calls), claim: async () => true })
    const second = await recoverUnchargedOrder({ store, orderId: created.order.id, gateway: gateway(calls), claim: async () => true })
    expect(first).toBe('charged')
    expect(second).toBe('skipped')
    expect(calls).toEqual([created.order.id])
    expect((await store.findCommercial(created.order.id))?.order.gatewayChargeId).toBe(created.order.id)
    expect(await store.listPromotions(created.linkId)).toEqual([])
  })

  it('expira sem cobrar e libera o hold quando o prazo passou antes do charge', async () => {
    const store = new InMemoryCheckoutStore()
    const calls: string[] = []
    const created = await pending(store, new Date(Date.now() - 1_000))
    const result = await recoverUnchargedOrder({
      store,
      orderId: created.order.id,
      gateway: gateway(calls),
      now: new Date(),
    })
    expect(result).toBe('expired')
    expect(calls).toEqual([])
    expect((await store.findCommercial(created.order.id))?.order.status).toBe('EXPIRED')
    expect(store.holds[0]?.hold).toBe('RELEASED')
    expect(await store.listPromotions(created.linkId)).toEqual([])
  })

  it('cartão sem gateway configurado não é cobrado pelo gateway Pix', async () => {
    const store = new InMemoryCheckoutStore()
    const calls: string[] = []
    const created = await pending(store, null, 'CARD')
    const result = await recoverUnchargedOrder({ store, orderId: created.order.id, gateway: gateway(calls) })
    expect(result).toBe('skipped')
    expect(calls).toEqual([])
    expect((await store.findCommercial(created.order.id))?.order.gatewayChargeId).toBeNull()
  })

  it('cartão recupera com o gateway CARD e a segunda passada não duplica', async () => {
    const store = new InMemoryCheckoutStore()
    const provider = new Map<string, string>()
    const pixCalls: string[] = []
    const cardCalls: string[] = []
    const created = await pending(store, null, 'CARD')
    const input = {
      store,
      orderId: created.order.id,
      gateway: gateway(pixCalls),
      gateways: { CARD: idempotentCard(provider, cardCalls) },
      claim: async () => true,
    }
    expect(await recoverUnchargedOrder(input)).toBe('charged')
    expect(await recoverUnchargedOrder(input)).toBe('skipped')
    expect(pixCalls).toEqual([])
    expect(cardCalls).toEqual([created.order.id])
    expect(provider.size).toBe(1)
    expect((await store.findCommercial(created.order.id))?.order.gatewayChargeId).toBe('pi_1')
  })

  it('timeout do provedor libera o lock e o retry reaproveita a mesma intenção', async () => {
    const store = new InMemoryCheckoutStore()
    const provider = new Map<string, string>()
    const cardCalls: string[] = []
    const failures = { remaining: 1 }
    const released: string[] = []
    const created = await pending(store, null, 'CARD')
    const input = {
      store,
      orderId: created.order.id,
      gateway: gateway([]),
      gateways: { CARD: idempotentCard(provider, cardCalls, failures) },
      claim: async () => true,
      release: async () => { released.push(created.order.id) },
    }
    await expect(recoverUnchargedOrder(input)).rejects.toThrow('timeout')
    expect(released).toEqual([created.order.id])
    expect((await store.findCommercial(created.order.id))?.order.gatewayChargeId).toBeNull()
    expect(await recoverUnchargedOrder(input)).toBe('charged')
    expect(provider.size).toBe(1)
    expect((await store.findCommercial(created.order.id))?.order.gatewayChargeId).toBe('pi_1')
  })

  it('lock ocupado por outro worker não chama o provedor', async () => {
    const store = new InMemoryCheckoutStore()
    const cardCalls: string[] = []
    const created = await pending(store, null, 'CARD')
    const result = await recoverUnchargedOrder({
      store,
      orderId: created.order.id,
      gateway: gateway([]),
      gateways: { CARD: idempotentCard(new Map(), cardCalls) },
      claim: async () => false,
    })
    expect(result).toBe('skipped')
    expect(cardCalls).toEqual([])
  })

  it('pedido já pago ou com charge não volta ao provedor', async () => {
    const store = new InMemoryCheckoutStore()
    const cardCalls: string[] = []
    const created = await pending(store, null, 'CARD')
    await store.attachCharge(created.order.id, { gatewayChargeId: 'pi_existente', clientSecret: 's' })
    const result = await recoverUnchargedOrder({
      store,
      orderId: created.order.id,
      gateway: gateway([]),
      gateways: { CARD: idempotentCard(new Map(), cardCalls) },
    })
    expect(result).toBe('skipped')
    expect(cardCalls).toEqual([])
  })
})
