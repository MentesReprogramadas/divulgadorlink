import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { signWooviTestBody } from '@/adapters/payments/woovi-test-signing'
import { resetCheckoutLimitForTest, setCheckoutGatewayForTest, setPaymentGatewayForTest } from '@/http/controllers/@Payments/routes'
import { getPaymentJobsForTest, resetPaymentJobsForTest } from '@/adapters/queues/enqueue-payment-job'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { PrismaLinksRepository, setLinksRepositoryForTest } from '@/repositories/links-repository'
import type { OrdersRepository } from '@/repositories/orders-repository'
import { RequestPixRefundUseCase } from '@/use-cases/@Payments/request-pix-refund'
import { PrismaCheckoutStore, setCheckoutStoreForTest } from '@/use-cases/@Promotions/checkout-prisma'
import { setCheckoutRaceDelayForTest } from '@/use-cases/@Promotions/start-checkout'

const url = process.env.CHECKOUT_DATABASE_URL
if (!url) throw new Error('CHECKOUT_DATABASE_URL ausente')

const db = new PrismaClient({ datasources: { db: { url } } })
const store = new PrismaCheckoutStore(db)
const HOST_A = 'temlinkaqui.com'
const HOST_B = 'outro.example'

const ids = {
  tenantA: 'tenant-a',
  tenantB: 'tenant-b',
  owner: 'user-owner',
  other: 'user-other',
  admin: 'user-admin',
  banned: 'user-banned',
  ownerB: 'user-owner-b',
}

let charges = 0

function token(sub: string, tenantId: string, role: 'USER' | 'ADMIN' = 'USER'): string {
  return app.jwt.sign({ sub, role, tenantId, typ: 'access' }, { expiresIn: '5m' })
}

function checkout(input: {
  sub?: string
  tenantId?: string
  host?: string
  linkId: string
  surfaces?: string[]
  durationDays?: number
  method?: string
  extra?: Record<string, unknown>
  key?: string
  role?: 'USER' | 'ADMIN'
}) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/promotions/checkout',
    headers: {
      host: input.host ?? HOST_A,
      authorization: `Bearer ${token(input.sub ?? ids.owner, input.tenantId ?? ids.tenantA, input.role)}`,
      ...(input.key ? { 'idempotency-key': input.key } : {}),
    },
    payload: {
      linkId: input.linkId,
      surfaces: input.surfaces ?? ['SEARCH'],
      durationDays: input.durationDays ?? 7,
      method: input.method ?? 'PIX',
      ...input.extra,
    },
  })
}

async function ordersFor(linkId: string) {
  return db.order.findMany({ where: { linkId } })
}

describe('checkout no PostgreSQL', () => {
  beforeAll(async () => {
    setTenantsRepositoryForTest({
      async findByHost(host: string) {
        const tenant = await db.tenant.findUnique({ where: { host } })
        return tenant ? { id: tenant.id, host: tenant.host, name: tenant.name } : null
      },
    })
    setLinksRepositoryForTest(new PrismaLinksRepository(db))
    setCheckoutStoreForTest(store)
    await app.ready()
    await db.$executeRawUnsafe('TRUNCATE TABLE analytics_events, payments, order_events, order_surfaces, orders, promotions, links, niches, networks, user_identifiers, users, tenants CASCADE')

    await db.tenant.create({ data: { id: ids.tenantA, host: HOST_A, name: 'A' } })
    await db.tenant.create({ data: { id: ids.tenantB, host: HOST_B, name: 'B' } })
    for (const user of [
      { id: ids.owner, tenantId: ids.tenantA, role: 'USER' as const, status: 'ACTIVE' as const },
      { id: ids.other, tenantId: ids.tenantA, role: 'USER' as const, status: 'ACTIVE' as const },
      { id: ids.admin, tenantId: ids.tenantA, role: 'ADMIN' as const, status: 'ACTIVE' as const },
      { id: ids.banned, tenantId: ids.tenantA, role: 'USER' as const, status: 'BANNED' as const },
      { id: ids.ownerB, tenantId: ids.tenantB, role: 'USER' as const, status: 'ACTIVE' as const },
    ]) {
      await db.user.create({
        data: { id: user.id, tenantId: user.tenantId, name: user.id, passwordHash: 'not-a-secret', role: user.role, status: user.status },
      })
      await db.userIdentifier.create({
        data: { userId: user.id, tenantId: user.tenantId, kind: 'EMAIL', normalizedValue: `${user.id}@example.com`, confirmedAt: new Date() },
      })
      await db.userIdentifier.create({
        data: { userId: user.id, tenantId: user.tenantId, kind: 'PHONE', normalizedValue: `+55${user.id}`, confirmedAt: new Date() },
      })
    }
    await db.network.create({ data: { id: 'net-a', tenantId: ids.tenantA, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.niche.create({ data: { id: 'niche-a', tenantId: ids.tenantA, name: 'Jogos', slug: 'jogos' } })
    await db.network.create({ data: { id: 'net-b', tenantId: ids.tenantB, name: 'Telegram', slug: 'telegram', knownHosts: [] } })
    await db.niche.create({ data: { id: 'niche-b', tenantId: ids.tenantB, name: 'Jogos', slug: 'jogos' } })

    const link = (id: string, tenantId: string, ownerId: string, networkId: string, nicheId: string) =>
      db.link.create({
        data: {
          id, tenantId, ownerId, networkId, nicheId,
          canonicalUrl: `https://t.me/${id}`,
          name: id,
          description: 'descricao',
          status: 'PUBLISHED',
        },
      })
    for (const id of ['link-preco', 'link-corrida', 'link-idem', 'link-pendente', 'link-outra', 'link-falha', 'link-webhook', 'link-tarde', 'link-ativa', 'link-pacote', 'link-renova', 'link-expirada', 'link-banido', 'link-alheio']) {
      await link(id, ids.tenantA, id === 'link-alheio' ? ids.other : id === 'link-banido' ? ids.banned : ids.owner, 'net-a', 'niche-a')
    }
    await link('link-b', ids.tenantB, ids.ownerB, 'net-b', 'niche-b')
    const active = (linkId: string, surface: 'SEARCH' | 'NICHE', status: 'ACTIVE' | 'EXPIRED') =>
      db.promotion.create({
        data: {
          tenantId: ids.tenantA,
          linkId,
          surface,
          status,
          activatedAt: new Date('2026-09-01T00:00:00.000Z'),
          expiresAt: new Date('2026-09-29T00:00:00.000Z'),
        },
      })
    await active('link-ativa', 'SEARCH', 'ACTIVE')
    await active('link-pacote', 'NICHE', 'ACTIVE')
    await active('link-renova', 'SEARCH', 'ACTIVE')
    await active('link-expirada', 'SEARCH', 'EXPIRED')
  })

  beforeEach(() => {
    charges = 0
    setCheckoutRaceDelayForTest(0)
    resetCheckoutLimitForTest()
    resetPaymentJobsForTest()
    setCheckoutGatewayForTest({
      method: 'PIX',
      async createCharge(input) {
        charges += 1
        return { gatewayChargeId: `gw-${input.orderId}`, brCode: '000201' }
      },
    })
    setPaymentGatewayForTest({
      method: 'PIX',
      async getCharge() {
        return { status: 'PAID', paidAt: new Date() }
      },
      async refund() {
        return { refundId: 'refund-1', status: 'PROCESSING' }
      },
    })
  })

  afterAll(async () => {
    setCheckoutStoreForTest(null)
    setCheckoutGatewayForTest(null)
    setPaymentGatewayForTest(null)
    await db.$disconnect()
  })

  it('aplica as 12 migrations', async () => {
    const migrations = await db.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL
    `
    expect(migrations).toHaveLength(14)
  })

  it('grava o preço do backend e ignora amountCents do corpo', async () => {
    const rejected = await checkout({ linkId: 'link-preco', extra: { amountCents: 1 } })
    expect(rejected.statusCode).toBe(400)
    const created = await checkout({ linkId: 'link-preco' })
    expect(created.statusCode).toBe(201)
    expect(created.json()).toMatchObject({ code: 'SEARCH', amountCents: 790, savingsCents: 0 })
    const rows = await ordersFor('link-preco')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.amountCents).toBe(790)
    await db.$executeRawUnsafe(`UPDATE promotion_prices SET "amountCents" = 1 WHERE "durationDays" = 7`)
    const again = await db.order.findFirst({ where: { linkId: 'link-preco' } })
    expect(again?.amountCents).toBe(790)
    expect(charges).toBe(1)
  })

  it('duas compras simultâneas deixam um pending, um 23505 vira 409 e um charge', async () => {
    setCheckoutRaceDelayForTest(200)
    const headers = {
      host: HOST_A,
      authorization: `Bearer ${token(ids.owner, ids.tenantA)}`,
    }
    const payload = { linkId: 'link-corrida', surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' }
    const [left, right] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/promotions/checkout', headers, payload }),
      app.inject({ method: 'POST', url: '/api/v1/promotions/checkout', headers, payload }),
    ])
    const statuses = [left.statusCode, right.statusCode].sort()
    expect(statuses).toEqual([201, 409])
    const loser = left.statusCode === 409 ? left : right
    expect(JSON.stringify(loser.json())).not.toMatch(/23505|prisma|SELECT|password/i)
    expect(loser.json()).toMatchObject({ code: 'conflict' })
    const orders = await ordersFor('link-corrida')
    const holds = await db.orderSurface.findMany({ where: { linkId: 'link-corrida', hold: 'PENDING_PAYMENT' } })
    const payments = await db.payment.findMany({ where: { orderId: orders[0]?.id } })
    const promotions = await db.promotion.findMany({ where: { linkId: 'link-corrida' } })
    expect(orders).toHaveLength(1)
    expect(orders[0]?.status).toBe('PENDING_PAYMENT')
    expect(holds).toHaveLength(1)
    expect(payments).toHaveLength(1)
    expect(promotions).toHaveLength(0)
    expect(charges).toBe(1)
    setCheckoutRaceDelayForTest(0)
  })

  it('a mesma Idempotency-Key não abre segundo pedido nem segundo charge', async () => {
    const first = await checkout({ linkId: 'link-idem', key: 'chave-1' })
    const retry = await checkout({ linkId: 'link-idem', key: 'chave-1' })
    const otherPayload = await checkout({ linkId: 'link-idem', surfaces: ['HOME'], key: 'chave-1' })
    expect(first.statusCode).toBe(201)
    expect(retry.json().orderId).toBe(first.json().orderId)
    expect(otherPayload.json().orderId).toBe(first.json().orderId)
    expect(otherPayload.json().amountCents).toBe(790)
    expect(await ordersFor('link-idem')).toHaveLength(1)
    expect(charges).toBe(1)
  })

  it('isola tenant, dono e campos do corpo', async () => {
    const cross = await checkout({ linkId: 'link-b' })
    expect(cross.statusCode).toBe(404)
    const foreignJwt = await checkout({ linkId: 'link-preco', sub: ids.ownerB, tenantId: ids.tenantB })
    expect(foreignJwt.statusCode).toBe(403)
    const otherOwner = await checkout({ linkId: 'link-alheio' })
    expect(otherOwner.statusCode).toBe(404)
    const body = await checkout({ linkId: 'link-preco', extra: { tenantId: ids.tenantB, ownerId: ids.other, orderId: 'pedido-falso' } })
    expect(body.statusCode).toBe(400)
    expect(await ordersFor('link-b')).toHaveLength(0)
    expect(await ordersFor('link-alheio')).toHaveLength(0)
  })

  it('usuário banido não gera pedido nem charge', async () => {
    const response = await checkout({ linkId: 'link-banido', sub: ids.banned })
    expect(response.statusCode).toBe(403)
    expect(await ordersFor('link-banido')).toHaveLength(0)
    expect(await db.promotion.count({ where: { linkId: 'link-banido' } })).toBe(0)
    expect(charges).toBe(0)
  })

  it('recusa superfície ativa, pending e pacote que as inclui, e aceita outra superfície', async () => {
    const active = await checkout({ linkId: 'link-ativa' })
    expect(active.statusCode).toBe(409)
    const first = await checkout({ linkId: 'link-pendente' })
    expect(first.statusCode).toBe(201)
    const pending = await checkout({ linkId: 'link-pendente' })
    expect(pending.statusCode).toBe(409)
    const pack = await checkout({ linkId: 'link-pacote', surfaces: ['SEARCH', 'NICHE'] })
    expect(pack.statusCode).toBe(409)
    const home = await checkout({ linkId: 'link-outra', surfaces: ['HOME'] })
    expect(home.statusCode).toBe(201)
    expect(home.json().amountCents).toBe(1990)
    expect(await db.promotion.count({ where: { linkId: { in: ['link-ativa', 'link-pacote', 'link-pendente', 'link-outra'] }, status: 'ACTIVE' } })).toBe(2)
    expect(charges).toBe(2)
  })

  it('renova a promoção ativa e recusa a expirada', async () => {
    const before = await db.promotion.findFirst({ where: { linkId: 'link-renova', status: 'ACTIVE' } })
    const renewed = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/renew',
      headers: { host: HOST_A, authorization: `Bearer ${token(ids.owner, ids.tenantA)}` },
      payload: { linkId: 'link-renova', surfaces: ['SEARCH'], durationDays: 28, method: 'PIX' },
    })
    expect(renewed.statusCode).toBe(201)
    const orderId = renewed.json().orderId as string
    const body = JSON.stringify({ eventId: 'evt-renew', charge: { correlationID: orderId } })
    const webhook = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/woovi/webhook',
      headers: { 'content-type': 'application/json', 'x-webhook-signature': signWooviTestBody(body) },
      payload: body,
    })
    expect(webhook.statusCode).toBe(200)
    const after = await db.promotion.findFirst({ where: { linkId: 'link-renova', status: 'ACTIVE' } })
    expect(after?.activatedAt.toISOString()).toBe(before?.activatedAt.toISOString())
    expect(after?.expiresAt.getTime()).toBeGreaterThan(before?.expiresAt.getTime() ?? 0)
    expect(await db.promotion.count({ where: { linkId: 'link-renova' } })).toBe(1)
    const expired = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/renew',
      headers: { host: HOST_A, authorization: `Bearer ${token(ids.owner, ids.tenantA)}` },
      payload: { linkId: 'link-expirada', surfaces: ['SEARCH'], durationDays: 7, method: 'PIX' },
    })
    expect(expired.statusCode).toBe(409)
    expect(await ordersFor('link-expirada')).toHaveLength(0)
  })

  it('desfaz o pedido quando o gateway falha', async () => {
    setCheckoutGatewayForTest({
      method: 'PIX',
      async createCharge() {
        charges += 1
        throw new Error('timeout')
      },
    })
    const response = await checkout({ linkId: 'link-falha' })
    expect(response.statusCode).toBe(503)
    expect(JSON.stringify(response.json())).not.toMatch(/23505|SELECT|postgres/i)
    expect(await ordersFor('link-falha')).toHaveLength(0)
    expect(await db.orderSurface.count({ where: { linkId: 'link-falha' } })).toBe(0)
    expect(await db.payment.count({ where: { order: { linkId: 'link-falha' } } })).toBe(0)
    expect(charges).toBe(1)
  })

  it('webhook confirma uma vez e o replay não cria outra promoção', async () => {
    const created = await checkout({ linkId: 'link-webhook' })
    const orderId = created.json().orderId as string
    const send = (eventId: string) => {
      const body = JSON.stringify({ eventId, charge: { correlationID: orderId } })
      return app.inject({
        method: 'POST',
        url: '/api/v1/payments/woovi/webhook',
        headers: { 'content-type': 'application/json', 'x-webhook-signature': signWooviTestBody(body) },
        payload: body,
      })
    }
    expect((await send('evt-1')).statusCode).toBe(200)
    expect((await send('evt-1')).statusCode).toBe(200)
    expect((await send('evt-2')).statusCode).toBe(200)
    const missing = JSON.stringify({ eventId: 'evt-x', charge: { correlationID: 'pedido-nenhum' } })
    const absent = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/woovi/webhook',
      headers: { 'content-type': 'application/json', 'x-webhook-signature': signWooviTestBody(missing) },
      payload: missing,
    })
    expect(absent.statusCode).toBe(400)
    const promotions = await db.promotion.findMany({ where: { linkId: 'link-webhook' } })
    const order = await db.order.findUnique({ where: { id: orderId } })
    expect(promotions).toHaveLength(1)
    expect(order?.status).toBe('PAID')
    expect(order?.tenantId).toBe(ids.tenantA)
    expect(await db.promotion.count({ where: { linkId: 'pedido-nenhum' } })).toBe(0)
  })

  it('Pix tardio não vira promoção e o estorno guarda refund-{orderId}', async () => {
    const created = await checkout({ linkId: 'link-tarde' })
    const orderId = created.json().orderId as string
    await db.order.update({ where: { id: orderId }, data: { pixExpiresAt: new Date('2020-01-01T00:00:00.000Z') } })
    const body = JSON.stringify({ eventId: 'evt-late', charge: { correlationID: orderId } })
    const webhook = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/woovi/webhook',
      headers: { 'content-type': 'application/json', 'x-webhook-signature': signWooviTestBody(body) },
      payload: body,
    })
    expect(webhook.statusCode).toBe(200)
    const late = await db.order.findUnique({ where: { id: orderId } })
    expect(late?.status).toBe('PAID_LATE')
    expect(await db.promotion.count({ where: { linkId: 'link-tarde' } })).toBe(0)
    expect(getPaymentJobsForTest().filter((job) => job.name === 'refund-pix' && job.orderId === orderId)).toHaveLength(1)
    const orders: OrdersRepository = {
      async findById(id) {
        return (await store.findCommercial(id))?.order ?? null
      },
      async save(order) {
        await store.saveOrder(order)
      },
    }
    await new RequestPixRefundUseCase(orders, {
      method: 'PIX',
      async getCharge() {
        return { status: 'PAID', paidAt: new Date() }
      },
      async refund(input) {
        expect(input.correlationId).toBe(`refund-${orderId}`)
        return { refundId: 'refund-1', status: 'PROCESSING' }
      },
    }, { async scheduleRetry() { return undefined } }).execute(orderId)
    const refunded = await db.order.findUnique({ where: { id: orderId } })
    expect(refunded?.status).toBe('REFUND_PENDING')
    expect(refunded?.refundCorrelationId).toBe(`refund-${orderId}`)
    expect(await db.promotion.count({ where: { linkId: 'link-tarde' } })).toBe(0)
  })

  it('rejeita método, duração, superfície, pacote, corpo grande e excesso de tentativas', async () => {
    const method = await checkout({ linkId: 'link-outra', method: 'BOLETO' })
    const duration = await checkout({ linkId: 'link-outra', durationDays: 10 })
    const surface = await checkout({ linkId: 'link-outra', surfaces: ['TOPO'] })
    const combo = await checkout({ linkId: 'link-outra', surfaces: ['SEARCH', 'HOME'] })
    expect(method.statusCode).toBe(400)
    expect(duration.statusCode).toBe(400)
    expect(surface.statusCode).toBe(400)
    expect(combo.statusCode).toBe(409)
    const huge = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST_A, authorization: `Bearer ${token(ids.owner, ids.tenantA)}` },
      payload: { linkId: 'link-outra', surfaces: ['HOME'], durationDays: 7, method: 'PIX', noise: 'n'.repeat(2_000_000) },
    })
    expect(huge.statusCode).toBe(413)
    let last = 0
    for (let i = 0; i < 31; i += 1) {
      const response = await checkout({ linkId: 'link-ativa' })
      last = response.statusCode
    }
    expect(last).toBe(429)
  })
})
