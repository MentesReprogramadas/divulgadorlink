import { describe, expect, it } from 'vitest'
import { PRICE_ROWS } from '@/domain/promotions/price-for'
import { CheckoutConflictError, getCheckoutStore, resetCheckoutStoreForTest } from '@/use-cases/@Promotions/checkout-store'
import { assertCheckout, startCheckout, type CheckoutGateway } from '@/use-cases/@Promotions/start-checkout'

const base = {
  account: 'ACTIVE' as const,
  link: 'PUBLISHED' as const,
  requiresAge: false,
  surfaces: ['SEARCH' as const],
  activeSurfaces: [] as string[],
  pendingSurfaces: [] as string[],
}

function gateway(): CheckoutGateway & { calls: number } {
  return {
    method: 'PIX',
    calls: 0,
    async createCharge(input) {
      this.calls += 1
      return { gatewayChargeId: `charge-${input.orderId}`, brCode: '000201' }
    },
  }
}

describe('checkout', () => {
  it('recusa pacote se SEARCH já está ativo', () => {
    expect(() => assertCheckout({ ...base, surfaces: ['SEARCH', 'NICHE'], activeSurfaces: ['SEARCH'] })).toThrow(/SEARCH/)
  })

  it('recusa HOME para nicho com idade', () => {
    expect(() => assertCheckout({ ...base, requiresAge: true, surfaces: ['HOME'] })).toThrow(/HOME/)
    expect(() => assertCheckout({ ...base, requiresAge: true, surfaces: ['SEARCH', 'NICHE', 'HOME'] })).toThrow(/HOME/)
  })

  it('recusa pendência da mesma superfície e conta banida', () => {
    expect(() => assertCheckout({ ...base, pendingSurfaces: ['SEARCH'] })).toThrow(/pendente/)
    expect(() => assertCheckout({ ...base, account: 'BANNED' })).toThrow(/conta/)
  })

  it('aceita SEARCH em nicho com idade', () => {
    expect(assertCheckout({ ...base, requiresAge: true, surfaces: ['SEARCH'] })).toBe(true)
    expect(assertCheckout({ ...base, requiresAge: true, surfaces: ['NICHE'] })).toBe(true)
    expect(assertCheckout({ ...base, requiresAge: true, surfaces: ['SEARCH', 'NICHE'] })).toBe(true)
  })

  it('recusa Home para +18 também na renovação, antes de reservar ou cobrar', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore(), pix = gateway()
    await expect(startCheckout({ tenantId: 't1', userId: 'u1', linkId: 'adult-link', account: 'ACTIVE', link: 'PUBLISHED', requiresAge: true, surfaces: ['HOME'], durationDays: 7, method: 'PIX', rows: PRICE_ROWS, idempotencyKey: null, requestId: 'adult-renew', renewal: true, store, gateway: pix })).rejects.toThrow(/HOME/)
    expect(pix.calls).toBe(0)
  })

  it('não reapresenta cobrança Home antiga se o nicho passou a ser +18', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore(), pix = gateway()
    const input = { tenantId: 't1', userId: 'u1', linkId: 'changed-link', account: 'ACTIVE' as const, link: 'PUBLISHED' as const, requiresAge: false, surfaces: ['HOME' as const], durationDays: 7, method: 'PIX' as const, rows: PRICE_ROWS, idempotencyKey: 'age-change', requestId: 'adult-replay', store, gateway: pix }
    await startCheckout(input)
    await expect(startCheckout({ ...input, requiresAge: true, surfaces: ['SEARCH'] })).rejects.toThrow(/HOME/)
    expect(pix.calls).toBe(1)
  })

  it('não troca SEARCH_HOME por outro produto', () => {
    expect(() => assertCheckout({ ...base, surfaces: ['SEARCH', 'HOME'] })).toThrow(/disponível/)
  })

  it('grava o preço vigente e não o valor enviado por fora', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore()
    const pix = gateway()
    const result = await startCheckout({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      account: 'ACTIVE',
      link: 'PUBLISHED',
      requiresAge: false,
      surfaces: ['SEARCH'],
      durationDays: 7,
      method: 'PIX',
      rows: PRICE_ROWS,
      idempotencyKey: null,
      requestId: 'req-1',
      store,
      gateway: pix,
    })
    expect(result.amountCents).toBe(790)
    expect(result.code).toBe('SEARCH')
    const saved = await store.findCommercial(result.orderId)
    expect(saved?.order.amountCents).toBe(790)
    const changed = PRICE_ROWS.map((row) => row.code === 'SEARCH' && row.durationDays === 7 ? { ...row, amountCents: 1 } : row)
    expect(saved?.order.amountCents).toBe(790)
    expect(changed[0]?.amountCents).toBe(1)
    expect(pix.calls).toBe(1)
  })

  it('não cobra conta banida', async () => {
    resetCheckoutStoreForTest()
    const pix = gateway()
    await expect(startCheckout({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      account: 'BANNED',
      link: 'PUBLISHED',
      requiresAge: false,
      surfaces: ['SEARCH'],
      durationDays: 7,
      method: 'PIX',
      rows: PRICE_ROWS,
      idempotencyKey: null,
      requestId: 'req-1',
      store: getCheckoutStore(),
      gateway: pix,
    })).rejects.toThrow(/conta/)
    expect(pix.calls).toBe(0)
  })

  it('duas compras simultâneas da mesma superfície deixam um pedido', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore()
    const run = () => startCheckout({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      account: 'ACTIVE',
      link: 'PUBLISHED',
      requiresAge: false,
      surfaces: ['SEARCH'],
      durationDays: 7,
      method: 'PIX',
      rows: PRICE_ROWS,
      idempotencyKey: null,
      requestId: 'req-1',
      store,
      gateway: gateway(),
    })
    const results = await Promise.allSettled([run(), run()])
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect(results.some((item) => item.status === 'rejected' && item.reason instanceof CheckoutConflictError)).toBe(true)
    expect(store.orders).toHaveLength(1)
  })

  it('repete a mesma chave sem segunda cobrança', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore()
    const pix = gateway()
    const first = await startCheckout({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      account: 'ACTIVE',
      link: 'PUBLISHED',
      requiresAge: false,
      surfaces: ['SEARCH'],
      durationDays: 14,
      method: 'PIX',
      rows: PRICE_ROWS,
      idempotencyKey: 'same',
      requestId: 'req-1',
      store,
      gateway: pix,
    })
    const second = await startCheckout({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      account: 'ACTIVE',
      link: 'PUBLISHED',
      requiresAge: false,
      surfaces: ['SEARCH'],
      durationDays: 14,
      method: 'PIX',
      rows: PRICE_ROWS,
      idempotencyKey: 'same',
      requestId: 'req-2',
      store,
      gateway: pix,
    })
    expect(second.orderId).toBe(first.orderId)
    expect(pix.calls).toBe(1)
  })

  it('pacote nasce com o mesmo fim nas duas superfícies', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore()
    const result = await startCheckout({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      account: 'ACTIVE',
      link: 'PUBLISHED',
      requiresAge: false,
      surfaces: ['SEARCH', 'NICHE'],
      durationDays: 28,
      method: 'CARD',
      rows: PRICE_ROWS,
      idempotencyKey: null,
      requestId: 'req-1',
      store,
      gateway: {
        method: 'CARD',
        async createCharge() {
          return { gatewayChargeId: 'pi_1', clientSecret: 'secret' }
        },
      },
    })
    expect(result.amountCents).toBe(3990)
    expect(result.savingsCents).toBe(990)
    const saved = await store.findCommercial(result.orderId)
    saved!.order.status = 'PAID'
    const now = new Date('2026-09-29T12:00:00.000Z')
    await store.activatePaid(result.orderId, now)
    const promotions = await store.listPromotions('link-1')
    expect(promotions.map((row) => row.expiresAt?.toISOString())).toEqual([
      '2026-10-27T12:00:00.000Z',
      '2026-10-27T12:00:00.000Z',
    ])
  })

  it('provider indisponível não ativa promoção', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore()
    await expect(startCheckout({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      account: 'ACTIVE',
      link: 'PUBLISHED',
      requiresAge: false,
      surfaces: ['HOME'],
      durationDays: 7,
      method: 'CARD',
      rows: PRICE_ROWS,
      idempotencyKey: null,
      requestId: 'req-1',
      store,
      gateway: {
        method: 'CARD',
        async createCharge() {
          throw new Error('timeout')
        },
      },
    })).rejects.toThrow(/timeout/)
    expect(await store.listPromotions('link-1')).toHaveLength(0)
  })
})


it('replay revalida conta, link e payload antes de devolver dados privados do cartão',async()=>{
 resetCheckoutStoreForTest()
 const store=getCheckoutStore()
 const input={tenantId:'t1',userId:'u1',linkId:'original',account:'ACTIVE' as const,link:'PUBLISHED' as const,requiresAge:false,surfaces:['SEARCH' as const],durationDays:7,method:'CARD' as const,rows:PRICE_ROWS,idempotencyKey:'private-replay',requestId:'replay',store,gateway:{method:'CARD' as const,createCharge:async()=>({gatewayChargeId:'pi_private',clientSecret:'private_secret'})}}
 const original=await startCheckout(input)
 await expect(startCheckout({...input,account:'BANNED'})).rejects.toThrow('conta')
 await expect(startCheckout({...input,link:'UNAVAILABLE'})).rejects.toThrow('link')
 for(const changed of [{linkId:'another-link'},{surfaces:['NICHE' as const]},{durationDays:14},{method:'PIX' as const},{renewal:true}]) await expect(startCheckout({...input,...changed})).rejects.toThrow()
 expect((await startCheckout(input)).orderId).toBe(original.orderId)
 store.orders[0].order.status='PAID'
 expect((await startCheckout(input)).orderId).toBe(original.orderId)
 expect(store.orders).toHaveLength(1)
})
