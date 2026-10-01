import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { signWooviTestBody } from '@/adapters/payments/woovi-test-signing'
import { app } from '@/app'
import { getPaymentJobsForTest, resetPaymentJobsForTest } from '@/adapters/queues/enqueue-payment-job'
import { setPaymentGatewayForTest } from '@/http/controllers/@Payments/routes'
import { getLinksRepository, InMemoryLinksRepository, resetLinksRepositoryForTest } from '@/repositories/links-repository'
import { runExpirePix } from '@/use-cases/@Payments/payment-jobs'
import { getCheckoutStore, resetCheckoutStoreForTest } from '@/use-cases/@Promotions/checkout-store'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'

function repo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) throw new Error('memória')
  return current
}

function token(sub: string, role: 'USER' | 'ADMIN' = 'USER', tenantId = TENANT_ID) {
  return app.jwt.sign({ sub, role, tenantId, typ: 'access' }, { expiresIn: '5m' })
}

describe('checkout e webhook', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    resetCheckoutStoreForTest()
    resetPaymentJobsForTest()
    setPaymentGatewayForTest(null)
    const confirmedAt = new Date('2026-09-01T00:00:00Z')
    repo().addUser({
      id: 'ana',
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [
        { id: 'email', kind: 'EMAIL', normalizedValue: 'ana@example.com', confirmedAt, replacedAt: null },
        { id: 'phone', kind: 'PHONE', normalizedValue: '+5511999999999', confirmedAt, replacedAt: null },
      ],
    })
    repo().addLink({ id: 'link-1', tenantId: TENANT_ID, ownerId: 'ana', status: 'PUBLISHED', nicheId: 'niche-jogos' })
  })

  it('ignora preço do cliente e grava o preço do backend', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}`, 'idempotency-key': 'k1' },
      payload: { linkId: 'link-1', surfaces: ['SEARCH'], durationDays: 7, method: 'PIX', amountCents: 1 },
    })
    expect(response.statusCode).toBe(400)

    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}`, 'idempotency-key': 'k1' },
      payload: { linkId: 'link-1', surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' },
    })
    expect(ok.statusCode).toBe(201)
    expect(ok.json()).toMatchObject({ code: 'SEARCH', amountCents: 790, savingsCents: 0 })
    expect(getPaymentJobsForTest().find((job) => job.name === 'expire-pix')).toMatchObject({ delay: 1_800_000 })
    expect(getPaymentJobsForTest().some((job) => job.name === 'charge-order' && job.orderId === ok.json().orderId)).toBe(true)
  })

  it('não deixa outro usuário comprar o link', async () => {
    repo().addUser({
      id: 'bia',
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [
        { id: 'bia-email', kind: 'EMAIL', normalizedValue: 'bia@example.com', confirmedAt: new Date('2026-09-01T00:00:00Z'), replacedAt: null },
        { id: 'bia-phone', kind: 'PHONE', normalizedValue: '+5511888888888', confirmedAt: new Date('2026-09-01T00:00:00Z'), replacedAt: null },
      ],
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('bia')}` },
      payload: { linkId: 'link-1', surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' },
    })
    expect(response.statusCode).toBe(404)
    expect(getCheckoutStore().orders).toHaveLength(0)
  })

  it('recusa tenant do token diferente do host', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('ana', 'USER', 'outro-tenant')}` },
      payload: { linkId: 'link-1', surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' },
    })
    expect(response.statusCode).toBe(403)
  })

  it('webhook sem assinatura não ativa e o replay não duplica', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}` },
      payload: { linkId: 'link-1', surfaces: ['NICHE'], durationDays: 7, method: 'PIX' },
    })
    const orderId = created.json().orderId as string
    setPaymentGatewayForTest({
      method: 'PIX',
      async getCharge() {
        return { status: 'PAID', paidAt: new Date() }
      },
      async refund() {
        return { refundId: 'r1', status: 'PROCESSING' }
      },
    })

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/woovi/webhook',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ eventId: 'evt-1', charge: { correlationID: orderId } }),
    })
    expect(invalid.statusCode).toBe(400)
    expect(await getCheckoutStore().listPromotions('link-1')).toHaveLength(0)

    const body = JSON.stringify({ eventId: 'evt-1', charge: { correlationID: orderId } })
    const headers = { 'content-type': 'application/json', 'x-webhook-signature': signWooviTestBody(body) }
    const first = await app.inject({ method: 'POST', url: '/api/v1/payments/woovi/webhook', headers, payload: body })
    const second = await app.inject({ method: 'POST', url: '/api/v1/payments/woovi/webhook', headers, payload: body })
    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    expect(await getCheckoutStore().listPromotions('link-1')).toHaveLength(1)
  })

  it('Pix pago depois do prazo não ativa e libera a superfície', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}` },
      payload: { linkId: 'link-1', surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' },
    })
    const orderId = created.json().orderId as string
    const row = await getCheckoutStore().findCommercial(orderId)
    row!.order.status = 'EXPIRED'
    row!.order.pixExpiresAt = new Date('2020-01-01T00:00:00.000Z')
    setPaymentGatewayForTest({
      method: 'PIX',
      async getCharge() {
        return { status: 'PAID', paidAt: new Date() }
      },
      async refund() {
        return { refundId: 'r1', status: 'PROCESSING' }
      },
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/woovi/webhook',
      headers: { 'content-type': 'application/json', 'x-webhook-signature': signWooviTestBody(JSON.stringify({ eventId: 'evt-late', charge: { correlationID: orderId } })) },
      payload: JSON.stringify({ eventId: 'evt-late', charge: { correlationID: orderId } }),
    })
    expect(response.statusCode).toBe(200)
    expect((await getCheckoutStore().findCommercial(orderId))?.order.status).toBe('PAID_LATE')
    expect(await getCheckoutStore().listPromotions('link-1')).toHaveLength(0)
    expect(await getCheckoutStore().pendingSurfaces('link-1')).toHaveLength(0)
  })

  it('expira o Pix pendente pelo job e admin não transforma REFUND_FAILED em promoção', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}` },
      payload: { linkId: 'link-1', surfaces: ['HOME'], durationDays: 7, method: 'PIX' },
    })
    const orderId = created.json().orderId as string
    const row = await getCheckoutStore().findCommercial(orderId)
    row!.order.pixExpiresAt = new Date('2020-01-01T00:00:00.000Z')
    await runExpirePix(orderId, new Date())
    expect((await getCheckoutStore().findCommercial(orderId))?.order.status).toBe('EXPIRED')
    expect(await getCheckoutStore().pendingSurfaces('link-1')).toHaveLength(0)

    row!.order.status = 'REFUND_FAILED'
    const admin = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/refunds/${orderId}/resolved`,
      headers: { host: HOST, authorization: `Bearer ${token('ana', 'ADMIN')}` },
    })
    expect(admin.statusCode).toBe(200)
    expect(admin.json()).toMatchObject({ status: 'REFUNDED' })
    expect(await getCheckoutStore().listPromotions('link-1')).toHaveLength(0)

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/refunds/${orderId}`,
      headers: { host: HOST, authorization: `Bearer ${token('ana', 'ADMIN')}` },
    })
    expect(detail.json().clientSecret).toBeUndefined()
    expect(detail.json().status).toBe('REFUNDED')
  })
})
