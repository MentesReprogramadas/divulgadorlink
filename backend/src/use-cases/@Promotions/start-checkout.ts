import type { Surface } from '@/domain/promotions/price-for'
import { priceFor, type PriceRow, type ProductCode } from '@/domain/promotions/price-for'
import type { PaymentMethod } from '@/domain/payments/order'
import type { CardPaymentGateway, PixPaymentGateway } from '@/domain/payments/payment-gateway'
import { logDomainEvent } from '@/observability/logger'
import { claimCharge, releaseCharge } from '@/adapters/payments/charge-lock'
import { enqueueChargeOrder } from '@/adapters/queues/enqueue-payment-job'
import type { CheckoutStore } from '@/use-cases/@Promotions/checkout-store'
import { PIX_EXPIRES_IN_SECONDS, pixExpiresInSeconds } from '@/domain/payments/pix-expiration'

export { PIX_EXPIRES_IN_SECONDS }

let raceDelayMs = 0

export function setCheckoutRaceDelayForTest(ms: number): void {
  if (process.env.NODE_ENV !== 'test') return
  raceDelayMs = ms
}

export function assertCheckout(input: {
  account: 'ACTIVE' | 'BANNED'
  link: 'PUBLISHED' | 'PENDING_MODERATION' | 'UNAVAILABLE'
  requiresAge: boolean
  surfaces: Surface[]
  activeSurfaces: string[]
  pendingSurfaces: string[]
}): true {
  if (input.account !== 'ACTIVE') throw new Error('conta')
  if (input.link !== 'PUBLISHED') throw new Error('link')
  const wantsHome = input.surfaces.includes('HOME')
  if (input.requiresAge && wantsHome) throw new Error('HOME')
  const blocked = input.surfaces.find((surface) =>
    input.activeSurfaces.includes(surface) || input.pendingSurfaces.includes(surface))
  if (blocked && input.activeSurfaces.includes(blocked)) throw new Error(blocked)
  if (blocked) throw new Error('pendente')
  const key = [...input.surfaces].sort().join('+')
  const allowed = new Set(['SEARCH', 'NICHE', 'HOME', 'NICHE+SEARCH', 'HOME+NICHE+SEARCH'])
  if (!allowed.has(key)) throw new Error('Combinação não está disponível')
  return true
}

export type CheckoutGateway = {
  method: PaymentMethod
  createCharge(input: {
    orderId: string
    amountCents: number
    expiresInSeconds?: number
  }): Promise<{ gatewayChargeId: string; brCode?: string; clientSecret?: string; expiresAt?: Date }>
}

export function gatewayFor(
  method: PaymentMethod,
  pix: PixPaymentGateway,
  card: CardPaymentGateway,
): CheckoutGateway {
  if (method === 'PIX') {
    return {
      method,
      async createCharge(input) {
        const charge = await pix.createCharge({
          orderId: input.orderId,
          amountCents: input.amountCents,
          expiresInSeconds: input.expiresInSeconds ?? pixExpiresInSeconds(),
        })
        return { gatewayChargeId: charge.gatewayChargeId, brCode: charge.brCode, expiresAt: charge.expiresAt }
      },
    }
  }
  return {
    method,
    async createCharge(input) {
      const charge = await card.createCharge({ orderId: input.orderId, amountCents: input.amountCents })
      return { gatewayChargeId: charge.gatewayChargeId, clientSecret: charge.clientSecret }
    },
  }
}

export async function startCheckout(input: {
  tenantId: string
  userId: string
  linkId: string
  account: 'ACTIVE' | 'BANNED'
  link: 'PUBLISHED' | 'PENDING_MODERATION' | 'UNAVAILABLE'
  requiresAge: boolean
  surfaces: Surface[]
  durationDays: number
  method: PaymentMethod
  rows: PriceRow[]
  idempotencyKey: string | null
  requestId: string
  renewal?: boolean
  store: CheckoutStore
  gateway: CheckoutGateway
  scheduleExpire?: (orderId: string, delayMs: number) => Promise<void>
}): Promise<{
  orderId: string
  code: ProductCode
  amountCents: number
  savingsCents: number
  brCode?: string
  clientSecret?: string
}> {
  if (input.idempotencyKey) {
    const existing = await input.store.findByIdempotency(input.tenantId, input.userId, input.idempotencyKey)
    if (existing) {
      return {
        orderId: existing.order.id,
        code: existing.productCode,
        amountCents: existing.order.amountCents,
        savingsCents: existing.savingsCents,
        brCode: existing.brCode,
        clientSecret: existing.clientSecret,
      }
    }
  }
  const activeSurfaces = await input.store.activeSurfaces(input.linkId)
  const pendingSurfaces = await input.store.pendingSurfaces(input.linkId)
  if (!input.renewal) {
    assertCheckout({
      account: input.account,
      link: input.link,
      requiresAge: input.requiresAge,
      surfaces: input.surfaces,
      activeSurfaces,
      pendingSurfaces,
    })
  } else if (input.account !== 'ACTIVE' || input.link !== 'PUBLISHED') {
    throw new Error(input.account !== 'ACTIVE' ? 'conta' : 'link')
  } else if (input.surfaces.some((surface) => pendingSurfaces.includes(surface))) {
    throw new Error('pendente')
  } else if (input.surfaces.some((surface) => !activeSurfaces.includes(surface))) {
    throw new Error('expirada')
  }
  const price = priceFor(input.rows, input.surfaces, input.durationDays)
  const ttlSeconds = pixExpiresInSeconds()

  if (raceDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, raceDelayMs))
  }

  const created = await input.store.createPending({
    tenantId: input.tenantId,
    userId: input.userId,
    linkId: input.linkId,
    method: input.method,
    surfaces: input.surfaces,
    durationDays: input.durationDays,
    productCode: price.code,
    amountCents: price.amountCents,
    savingsCents: price.savingsCents,
    idempotencyKey: input.idempotencyKey,
    renewal: Boolean(input.renewal),
    pixExpiresAt: input.method === 'PIX' ? new Date(Date.now() + ttlSeconds * 1000) : null,
  })

  logDomainEvent('promotion.checkout.created', {
    requestId: input.requestId,
    tenantId: input.tenantId,
    userId: input.userId,
    orderId: created.order.id,
    linkId: input.linkId,
    result: 'pending',
  })

  await enqueueChargeOrder(created.order.id)

  let claimed = false
  try {
    claimed = await claimCharge(created.order.id)
    if (!claimed) {
      const current = await input.store.findCommercial(created.order.id)
      if (current?.order.gatewayChargeId) {
        return {
          orderId: current.order.id,
          code: price.code,
          amountCents: price.amountCents,
          savingsCents: price.savingsCents,
          brCode: current.brCode,
          clientSecret: current.clientSecret,
        }
      }
      throw new Error('cobrança em andamento')
    }
    const charge = await input.gateway.createCharge({
      orderId: created.order.id,
      amountCents: price.amountCents,
      expiresInSeconds: ttlSeconds,
    })
    await input.store.attachCharge(created.order.id, {
      gatewayChargeId: charge.gatewayChargeId,
      brCode: charge.brCode,
      clientSecret: charge.clientSecret,
      expiresAt: charge.expiresAt,
    })
    logDomainEvent('payment.created', {
      requestId: input.requestId,
      tenantId: input.tenantId,
      userId: input.userId,
      orderId: created.order.id,
      provider: input.method,
      externalId: charge.gatewayChargeId,
      result: 'created',
    })
    if (input.method === 'PIX' && input.scheduleExpire) {
      await input.scheduleExpire(created.order.id, ttlSeconds * 1000)
    }
    await releaseCharge(created.order.id)
    return {
      orderId: created.order.id,
      code: price.code,
      amountCents: price.amountCents,
      savingsCents: price.savingsCents,
      brCode: charge.brCode,
      clientSecret: charge.clientSecret,
    }
  } catch (error) {
    if (claimed) await releaseCharge(created.order.id)
    if (!claimed) throw error
    logDomainEvent('payment.created', {
      requestId: input.requestId,
      tenantId: input.tenantId,
      orderId: created.order.id,
      provider: input.method,
      result: 'provider_error',
    })
    await input.store.abandonUncharged(created.order.id)
    throw error
  }
}
