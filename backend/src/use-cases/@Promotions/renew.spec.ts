import { describe, expect, it } from 'vitest'
import { getCheckoutStore, resetCheckoutStoreForTest } from '@/use-cases/@Promotions/checkout-store'
import { renew } from '@/use-cases/@Promotions/renew'

describe('renovação', () => {
  it('estende o fim e preserva a ativação', () => {
    const result = renew({
      status: 'ACTIVE',
      activatedAt: new Date('2026-09-01T00:00:00.000Z'),
      expiresAt: new Date('2026-09-29T00:00:00.000Z'),
      durationDays: 28,
    })
    expect(result.activatedAt.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(result.expiresAt.toISOString()).toBe('2026-10-27T00:00:00.000Z')
    expect(result.createdNewPromotion).toBe(false)
  })

  it('não renova promoção expirada', () => {
    expect(() => renew({
      status: 'EXPIRED',
      activatedAt: new Date('2026-09-01T00:00:00.000Z'),
      expiresAt: new Date('2026-09-29T00:00:00.000Z'),
      durationDays: 28,
    })).toThrow(/expirada/)
  })

  it('estende todas as superfícies do pacote sem nova ativação', async () => {
    resetCheckoutStoreForTest()
    const store = getCheckoutStore()
    const activatedAt = new Date('2026-09-01T00:00:00.000Z')
    store.promotions.push(
      { id: 'p1', linkId: 'link-1', surface: 'SEARCH', status: 'ACTIVE', activatedAt, expiresAt: new Date('2026-09-08T00:00:00.000Z') },
      { id: 'p2', linkId: 'link-1', surface: 'NICHE', status: 'ACTIVE', activatedAt, expiresAt: new Date('2026-09-08T00:00:00.000Z') },
    )
    const pending = await store.createPending({
      tenantId: 't1',
      userId: 'u1',
      linkId: 'link-1',
      method: 'PIX',
      surfaces: ['SEARCH', 'NICHE'],
      durationDays: 14,
      productCode: 'SEARCH_NICHE',
      amountCents: 2990,
      savingsCents: 290,
      idempotencyKey: null,
      renewal: true,
      pixExpiresAt: null,
    })
    pending.order.status = 'PAID'
    await store.activatePaid(pending.order.id, new Date('2026-09-05T00:00:00.000Z'))
    const rows = await store.listPromotions('link-1')
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.activatedAt.toISOString() === activatedAt.toISOString())).toBe(true)
    expect(rows.every((row) => row.expiresAt.toISOString() === '2026-09-22T00:00:00.000Z')).toBe(true)
  })
})
