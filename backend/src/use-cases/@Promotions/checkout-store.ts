import { randomUUID } from 'node:crypto'
import type { PaymentMethod, Order } from '@/domain/payments/order'
import type { OrdersRepository } from '@/repositories/orders-repository'
import type { Surface } from '@/domain/promotions/price-for'
import type { ProductCode } from '@/domain/promotions/price-for'
import { PRICE_ROWS } from '@/domain/promotions/price-for'
import { renew } from '@/use-cases/@Promotions/renew'

export class CheckoutConflictError extends Error {
  constructor() {
    super('pendente')
    this.name = 'CheckoutConflictError'
  }
}

export type CommercialOrder = {
  order: Order
  tenantId: string
  userId: string | null
  linkId: string
  surfaces: Surface[]
  durationDays: number
  productCode: ProductCode
  savingsCents: number
  idempotencyKey: string | null
  renewal: boolean
  brCode?: string
  clientSecret?: string
  createdAt: Date
  refundErrors: string[]
  refundIds: string[]
}

export type CreatePendingInput = {
  tenantId: string
  userId: string
  linkId: string
  method: PaymentMethod
  surfaces: Surface[]
  durationDays: number
  productCode: ProductCode
  amountCents: number
  savingsCents: number
  idempotencyKey: string | null
  renewal: boolean
  pixExpiresAt: Date | null
}

export type ActivePromotion = {
  id: string
  linkId: string
  surface: Surface
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  activatedAt: Date
  expiresAt: Date
}

export interface CheckoutStore {
  findByIdempotency(tenantId: string, userId: string, key: string): Promise<CommercialOrder | null>
  findCommercial(orderId: string): Promise<CommercialOrder | null>
  activeSurfaces(linkId: string): Promise<Surface[]>
  pendingSurfaces(linkId: string): Promise<Surface[]>
  createPending(input: CreatePendingInput): Promise<CommercialOrder>
  attachCharge(orderId: string, charge: {
    gatewayChargeId: string
    brCode?: string
    clientSecret?: string
    expiresAt?: Date
  }): Promise<void>
  abandonUncharged(orderId: string): Promise<void>
  releasePending(orderId: string): Promise<void>
  activatePaid(orderId: string, now: Date): Promise<void>
  listPromotions(linkId: string): Promise<ActivePromotion[]>
  listPromotionsByLinks(linkIds: string[]): Promise<ActivePromotion[]>
  listOrdersForUser(tenantId: string, userId: string): Promise<CommercialOrder[]>
  listOrdersByStatus(tenantId: string, status: Order['status']): Promise<CommercialOrder[]>
  prices(): Promise<typeof PRICE_ROWS>
  saveOrder(order: Order): Promise<void>
}

const locks = new Map<string, Promise<void>>()

function withLock<T>(key: string, run: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve()
  let release: () => void = () => undefined
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  locks.set(key, previous.then(() => current))
  return previous.then(run).finally(() => release())
}

export class InMemoryCheckoutStore implements CheckoutStore {
  orders: CommercialOrder[] = []
  holds: Array<{ linkId: string; surface: Surface; orderId: string; hold: 'PENDING_PAYMENT' | 'RELEASED' }> = []
  promotions: ActivePromotion[] = []

  async findByIdempotency(tenantId: string, userId: string, key: string): Promise<CommercialOrder | null> {
    return this.orders.find((row) => row.tenantId === tenantId && row.userId === userId && row.idempotencyKey === key) ?? null
  }

  async findCommercial(orderId: string): Promise<CommercialOrder | null> {
    return this.orders.find((row) => row.order.id === orderId) ?? null
  }

  async activeSurfaces(linkId: string): Promise<Surface[]> {
    return this.promotions.filter((row) => row.linkId === linkId && row.status === 'ACTIVE').map((row) => row.surface)
  }

  async pendingSurfaces(linkId: string): Promise<Surface[]> {
    return this.holds.filter((row) => row.linkId === linkId && row.hold === 'PENDING_PAYMENT').map((row) => row.surface)
  }

  async createPending(input: CreatePendingInput): Promise<CommercialOrder> {
    return withLock(input.linkId, async () => {
      const pending = await this.pendingSurfaces(input.linkId)
      if (input.surfaces.some((surface) => pending.includes(surface))) {
        throw new CheckoutConflictError()
      }
      const now = new Date()
      const order: Order = {
        id: randomUUID(),
        method: input.method,
        status: 'PENDING_PAYMENT',
        amountCents: input.amountCents,
        pixExpiresAt: input.pixExpiresAt,
        gatewayChargeId: null,
        refundCorrelationId: null,
        refundAttempts: 0,
        processedEventIds: [],
      }
      const commercial: CommercialOrder = {
        order,
        tenantId: input.tenantId,
        userId: input.userId,
        linkId: input.linkId,
        surfaces: [...input.surfaces],
        durationDays: input.durationDays,
        productCode: input.productCode,
        savingsCents: input.savingsCents,
        idempotencyKey: input.idempotencyKey,
        renewal: input.renewal,
        createdAt: now,
        refundErrors: [],
        refundIds: [],
      }
      this.orders.push(commercial)
      for (const surface of input.surfaces) {
        this.holds.push({ linkId: input.linkId, surface, orderId: order.id, hold: 'PENDING_PAYMENT' })
      }
      return commercial
    })
  }

  async attachCharge(orderId: string, charge: {
    gatewayChargeId: string
    brCode?: string
    clientSecret?: string
    expiresAt?: Date
  }): Promise<void> {
    const row = this.orders.find((item) => item.order.id === orderId)
    if (!row || row.order.gatewayChargeId) return
    row.order.gatewayChargeId = charge.gatewayChargeId
    if (charge.expiresAt) row.order.pixExpiresAt = charge.expiresAt
    row.brCode = charge.brCode
    row.clientSecret = charge.clientSecret
  }

  async abandonUncharged(orderId: string): Promise<void> {
    const row = this.orders.find((item) => item.order.id === orderId)
    if (!row || row.order.gatewayChargeId) return
    this.orders = this.orders.filter((item) => item.order.id !== orderId)
    this.holds = this.holds.filter((item) => item.orderId !== orderId)
  }

  async releasePending(orderId: string): Promise<void> {
    for (const hold of this.holds) {
      if (hold.orderId === orderId) hold.hold = 'RELEASED'
    }
  }

  async activatePaid(orderId: string, now: Date): Promise<void> {
    const row = this.orders.find((item) => item.order.id === orderId)
    if (!row || row.order.status !== 'PAID') return
    await this.releasePending(orderId)
    if (row.renewal) {
      for (const surface of row.surfaces) {
        const current = this.promotions.find((item) => item.linkId === row.linkId && item.surface === surface && item.status === 'ACTIVE')
        if (!current) continue
        const next = renew({
          status: 'ACTIVE',
          activatedAt: current.activatedAt,
          expiresAt: current.expiresAt,
          durationDays: row.durationDays,
        })
        current.expiresAt = next.expiresAt
      }
      return
    }
    const expiresAt = new Date(now.getTime() + row.durationDays * 24 * 60 * 60 * 1000)
    for (const surface of row.surfaces) {
      this.promotions.push({
        id: randomUUID(),
        linkId: row.linkId,
        surface,
        status: 'ACTIVE',
        activatedAt: now,
        expiresAt,
      })
    }
  }

  async listPromotions(linkId: string): Promise<ActivePromotion[]> {
    return this.promotions.filter((row) => row.linkId === linkId).map((row) => ({ ...row }))
  }

  async listPromotionsByLinks(linkIds: string[]): Promise<ActivePromotion[]> {
    return this.promotions.filter((row) => linkIds.includes(row.linkId)).map((row) => ({ ...row }))
  }

  async listOrdersForUser(tenantId: string, userId: string): Promise<CommercialOrder[]> {
    return this.orders.filter((row) => row.tenantId === tenantId && row.userId === userId).map((row) => ({ ...row }))
  }

  async listOrdersByStatus(tenantId: string, status: Order['status']): Promise<CommercialOrder[]> {
    return this.orders.filter((row) => row.tenantId === tenantId && row.order.status === status).map((row) => ({ ...row }))
  }

  async prices(): Promise<typeof PRICE_ROWS> {
    return PRICE_ROWS.map((row) => ({ ...row }))
  }

  async saveOrder(order: Order): Promise<void> {
    const row = this.orders.find((item) => item.order.id === order.id)
    if (!row) return
    row.order = order
    row.refundErrors = order.refundErrors ?? row.refundErrors
    row.refundIds = order.refundIds ?? row.refundIds
    if (order.status === 'EXPIRED' || order.status === 'PAID_LATE' || order.status === 'REFUNDED' || order.status === 'REFUND_FAILED') {
      await this.releasePending(order.id)
    }
  }
}

export class StoreOrdersRepository implements OrdersRepository {
  constructor(private readonly checkout: InMemoryCheckoutStore) {}

  async findById(id: string): Promise<Order | null> {
    return (await this.checkout.findCommercial(id))?.order ?? null
  }

  async save(order: Order): Promise<void> {
    const row = await this.checkout.findCommercial(order.id)
    if (!row) return
    row.order = order
    row.refundErrors = order.refundErrors ?? row.refundErrors
    row.refundIds = order.refundIds ?? row.refundIds
    if (order.status === 'EXPIRED' || order.status === 'PAID_LATE' || order.status === 'REFUNDED' || order.status === 'REFUND_FAILED') {
      await this.checkout.releasePending(order.id)
    }
  }
}

let store: InMemoryCheckoutStore | null = null

export function getCheckoutStore(): InMemoryCheckoutStore {
  if (!store) store = new InMemoryCheckoutStore()
  return store
}

export function resetCheckoutStoreForTest(): void {
  store = new InMemoryCheckoutStore()
}
