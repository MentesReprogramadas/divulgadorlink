import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { Order, PaymentMethod } from '@/domain/payments/order'
import type { PriceRow, ProductCode, Surface } from '@/domain/promotions/price-for'
import { PRICE_ROWS } from '@/domain/promotions/price-for'
import { renew } from '@/use-cases/@Promotions/renew'
import {
  CheckoutConflictError,
  getCheckoutStore,
  type ActivePromotion,
  type CheckoutStore,
  type CommercialOrder,
  type CreatePendingInput,
} from '@/use-cases/@Promotions/checkout-store'

type OrderRow = {
  id: string
  tenantId: string
  userId: string | null
  linkId: string
  status: Order['status']
  method: PaymentMethod
  productCode: ProductCode
  durationDays: number
  amountCents: number
  savingsCents: number
  pixExpiresAt: Date | null
  gatewayChargeId: string | null
  refundCorrelationId: string | null
  refundAttempts: number
  refundErrors: string[] | null
  refundIds: string[] | null
  idempotencyKey: string | null
  renewal: boolean
  brCode: string | null
  createdAt: Date
}

function toCommercial(row: OrderRow, surfaces: Surface[], events: string[]): CommercialOrder {
  return {
    order: {
      id: row.id,
      method: row.method,
      status: row.status,
      amountCents: row.amountCents,
      pixExpiresAt: row.pixExpiresAt,
      gatewayChargeId: row.gatewayChargeId,
      refundCorrelationId: row.refundCorrelationId,
      refundAttempts: row.refundAttempts,
      processedEventIds: events,
      refundErrors: row.refundErrors ?? [],
      refundIds: row.refundIds ?? [],
    },
    tenantId: row.tenantId,
    userId: row.userId,
    linkId: row.linkId,
    surfaces,
    durationDays: row.durationDays,
    productCode: row.productCode,
    savingsCents: row.savingsCents,
    idempotencyKey: row.idempotencyKey,
    renewal: row.renewal,
    brCode: row.brCode ?? undefined,
    createdAt: row.createdAt,
    refundErrors: row.refundErrors ?? [],
    refundIds: row.refundIds ?? [],
  }
}

export class PrismaCheckoutStore implements CheckoutStore {
  constructor(private readonly client: PrismaClient) {}

  async findByIdempotency(tenantId: string, userId: string, key: string): Promise<CommercialOrder | null> {
    const rows = await this.client.$queryRawUnsafe<OrderRow[]>(
      'SELECT * FROM orders WHERE "tenantId" = $1 AND "userId" = $2 AND "idempotencyKey" = $3 LIMIT 1',
      tenantId,
      userId,
      key,
    )
    const row = rows[0]
    if (!row) return null
    return this.findCommercial(row.id)
  }

  async findCommercial(orderId: string): Promise<CommercialOrder | null> {
    const rows = await this.client.$queryRawUnsafe<OrderRow[]>('SELECT * FROM orders WHERE id = $1', orderId)
    const row = rows[0]
    if (!row) return null
    const surfaces = await this.client.$queryRawUnsafe<Array<{ surface: Surface }>>(
      'SELECT surface FROM order_surfaces WHERE "orderId" = $1',
      orderId,
    )
    const events = await this.client.$queryRawUnsafe<Array<{ eventId: string }>>(
      'SELECT "eventId" FROM order_events WHERE "orderId" = $1',
      orderId,
    )
    return toCommercial(row, surfaces.map((item) => item.surface), events.map((item) => item.eventId))
  }

  async activeSurfaces(linkId: string): Promise<Surface[]> {
    const rows = await this.client.$queryRawUnsafe<Array<{ surface: Surface }>>(
      `SELECT surface FROM promotions WHERE "linkId" = $1 AND status = 'ACTIVE'`,
      linkId,
    )
    return rows.map((row) => row.surface)
  }

  async pendingSurfaces(linkId: string): Promise<Surface[]> {
    const rows = await this.client.$queryRawUnsafe<Array<{ surface: Surface }>>(
      `SELECT surface FROM order_surfaces WHERE "linkId" = $1 AND hold = 'PENDING_PAYMENT'`,
      linkId,
    )
    return rows.map((row) => row.surface)
  }

  async createPending(input: CreatePendingInput): Promise<CommercialOrder> {
    const id = randomUUID()
    try {
      await this.client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SELECT id FROM links WHERE id = $1 FOR UPDATE', input.linkId)
        await tx.$executeRawUnsafe(
          `INSERT INTO orders (
            id, "tenantId", "userId", "linkId", status, method, "productCode", "durationDays",
            "amountCents", "savingsCents", "pixExpiresAt", "refundAttempts", "refundErrors", "refundIds",
            "idempotencyKey", renewal, "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, 'PENDING_PAYMENT'::"OrderStatus", $5::"PaymentMethod", $6::"PromotionProductCode", $7,
            $8, $9, $10, 0, '[]'::jsonb, '[]'::jsonb, $11, $12, NOW(), NOW()
          )`,
          id,
          input.tenantId,
          input.userId,
          input.linkId,
          input.method,
          input.productCode,
          input.durationDays,
          input.amountCents,
          input.savingsCents,
          input.pixExpiresAt,
          input.idempotencyKey,
          input.renewal,
        )
        for (const surface of input.surfaces) {
          await tx.$executeRawUnsafe(
            `INSERT INTO order_surfaces (id, "orderId", "linkId", surface, hold)
             VALUES ($1, $2, $3, $4::"PromotionSurface", 'PENDING_PAYMENT'::"SurfaceHold")`,
            randomUUID(),
            id,
            input.linkId,
            surface,
          )
        }
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new CheckoutConflictError()
      throw error
    }
    const created = await this.findCommercial(id)
    if (!created) throw new Error('pedido não gravado')
    return created
  }

  async attachCharge(orderId: string, charge: {
    gatewayChargeId: string
    brCode?: string
    clientSecret?: string
    expiresAt?: Date
  }): Promise<void> {
    const updated = await this.client.$executeRawUnsafe(
      `UPDATE orders SET "gatewayChargeId" = $2, "pixExpiresAt" = COALESCE($3, "pixExpiresAt"), "brCode" = $4, "updatedAt" = NOW()
       WHERE id = $1 AND "gatewayChargeId" IS NULL`,
      orderId,
      charge.gatewayChargeId,
      charge.expiresAt ?? null,
      charge.brCode ?? null,
    )
    if (updated === 0) return
    await this.client.$executeRawUnsafe(
      `INSERT INTO payments (id, "orderId", provider, "externalId", "amountCents", status, "createdAt")
       SELECT $1, id, method::text, $2, "amountCents", 'CREATED', NOW() FROM orders WHERE id = $3`,
      randomUUID(),
      charge.gatewayChargeId,
      orderId,
    )
  }

  async abandonUncharged(orderId: string): Promise<void> {
    await this.client.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM orders WHERE id = $1 AND "gatewayChargeId" IS NULL',
        orderId,
      )
      if (!rows[0]) return
      await tx.$executeRawUnsafe('DELETE FROM payments WHERE "orderId" = $1', orderId)
      await tx.$executeRawUnsafe('DELETE FROM order_events WHERE "orderId" = $1', orderId)
      await tx.$executeRawUnsafe('DELETE FROM order_surfaces WHERE "orderId" = $1', orderId)
      await tx.$executeRawUnsafe('DELETE FROM orders WHERE id = $1', orderId)
    })
  }

  async releasePending(orderId: string): Promise<void> {
    await this.client.$executeRawUnsafe(
      `UPDATE order_surfaces SET hold = 'RELEASED'::"SurfaceHold" WHERE "orderId" = $1`,
      orderId,
    )
  }

  async activatePaid(orderId: string, now: Date): Promise<void> {
    const row = await this.findCommercial(orderId)
    if (!row || row.order.status !== 'PAID') return
    await this.releasePending(orderId)
    if (row.renewal) {
      for (const surface of row.surfaces) {
        const current = await this.client.$queryRawUnsafe<ActivePromotion[]>(
          `SELECT id, "linkId", surface, status, "activatedAt", "expiresAt" FROM promotions
           WHERE "linkId" = $1 AND surface = $2::"PromotionSurface" AND status = 'ACTIVE' LIMIT 1`,
          row.linkId,
          surface,
        )
        const promotion = current[0]
        if (!promotion) continue
        const next = renew({
          status: 'ACTIVE',
          activatedAt: promotion.activatedAt,
          expiresAt: promotion.expiresAt,
          durationDays: row.durationDays,
        })
        await this.client.$executeRawUnsafe(
          'UPDATE promotions SET "expiresAt" = $2, "updatedAt" = NOW() WHERE id = $1',
          promotion.id,
          next.expiresAt,
        )
      }
      return
    }
    const expiresAt = new Date(now.getTime() + row.durationDays * 24 * 60 * 60 * 1000)
    for (const surface of row.surfaces) {
      await this.client.$executeRawUnsafe(
        `INSERT INTO promotions (id, "tenantId", "linkId", status, surface, "activatedAt", "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'ACTIVE'::"PromotionStatus", $4::"PromotionSurface", $5, $6, NOW(), NOW())`,
        randomUUID(),
        row.tenantId,
        row.linkId,
        surface,
        now,
        expiresAt,
      )
    }
  }

  async listPromotions(linkId: string): Promise<ActivePromotion[]> {
    return this.client.$queryRawUnsafe(
      `SELECT id, "linkId", surface, status, "activatedAt", "expiresAt" FROM promotions WHERE "linkId" = $1`,
      linkId,
    )
  }

  async listPromotionsByLinks(linkIds: string[]): Promise<ActivePromotion[]> {
    if (linkIds.length === 0) return []
    const placeholders = linkIds.map((_, index) => `$${index + 1}`).join(', ')
    return this.client.$queryRawUnsafe(
      `SELECT id, "linkId", surface, status, "activatedAt", "expiresAt" FROM promotions WHERE "linkId" IN (${placeholders})`,
      ...linkIds,
    )
  }

  async listOrdersByStatus(tenantId: string, status: Order['status']): Promise<CommercialOrder[]> {
    const rows = await this.client.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM orders WHERE "tenantId" = $1 AND status = $2::"OrderStatus" ORDER BY "createdAt" DESC`,
      tenantId,
      status,
    )
    const orders: CommercialOrder[] = []
    for (const row of rows) {
      const commercial = await this.findCommercial(row.id)
      if (commercial) orders.push(commercial)
    }
    return orders
  }

  async listOrdersForUser(tenantId: string, userId: string): Promise<CommercialOrder[]> {
    const rows = await this.client.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM orders WHERE "tenantId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
      tenantId,
      userId,
    )
    const orders: CommercialOrder[] = []
    for (const row of rows) {
      const commercial = await this.findCommercial(row.id)
      if (commercial) orders.push(commercial)
    }
    return orders
  }

  async prices(): Promise<PriceRow[]> {
    const rows = await this.client.$queryRawUnsafe<Array<{ productCode: ProductCode; durationDays: number; amountCents: number }>>(
      'SELECT "productCode", "durationDays", "amountCents" FROM promotion_prices WHERE "effectiveTo" IS NULL',
    )
    if (rows.length === 0) return PRICE_ROWS.map((row) => ({ ...row }))
    return rows.flatMap((row) => {
      if (row.durationDays !== 7 && row.durationDays !== 14 && row.durationDays !== 28) return []
      return [{ code: row.productCode, durationDays: row.durationDays, amountCents: row.amountCents }]
    })
  }

  async saveOrder(order: Order): Promise<void> {
    await this.client.$executeRawUnsafe(
      `UPDATE orders SET status = $2::"OrderStatus", "pixExpiresAt" = $3, "gatewayChargeId" = $4,
        "refundCorrelationId" = $5, "refundAttempts" = $6, "refundErrors" = $7::jsonb, "refundIds" = $8::jsonb,
        "updatedAt" = NOW() WHERE id = $1`,
      order.id,
      order.status,
      order.pixExpiresAt,
      order.gatewayChargeId,
      order.refundCorrelationId,
      order.refundAttempts,
      JSON.stringify(order.refundErrors ?? []),
      JSON.stringify(order.refundIds ?? []),
    )
    if (order.status === 'PAID' || order.status === 'PAID_LATE' || order.status === 'REFUNDED' || order.status === 'REFUND_FAILED') {
      await this.client.$executeRawUnsafe(
        'UPDATE payments SET status = $2 WHERE "orderId" = $1',
        order.id,
        order.status,
      )
    }
    for (const eventId of order.processedEventIds) {
      await this.client.$executeRawUnsafe(
        `INSERT INTO order_events (id, "orderId", "eventId", "createdAt") VALUES ($1, $2, $3, NOW())
         ON CONFLICT ("orderId", "eventId") DO NOTHING`,
        randomUUID(),
        order.id,
        eventId,
      )
    }
    if (order.status === 'EXPIRED' || order.status === 'PAID_LATE' || order.status === 'REFUNDED' || order.status === 'REFUND_FAILED') {
      await this.releasePending(order.id)
    }
  }
}

let checkoutStoreForTest: CheckoutStore | null = null

export function setCheckoutStoreForTest(store: CheckoutStore | null): void {
  if (process.env.NODE_ENV !== 'test') return
  checkoutStoreForTest = store
}

export function runtimeCheckoutStore(): CheckoutStore {
  if (checkoutStoreForTest) return checkoutStoreForTest
  if (process.env.NODE_ENV === 'test') return getCheckoutStore()
  return new PrismaCheckoutStore(prisma)
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const meta = 'meta' in error ? (error as { meta?: { code?: string } }).meta : undefined
  if (meta?.code === '23505') return true
  const message = error instanceof Error ? error.message : ''
  return message.includes('23505') || message.includes('order_surfaces_one_pending')
}
