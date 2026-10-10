import { timingSafeEqual } from 'node:crypto'
import { verifyWooviSignature, WOOVI_PUBLISHED_PUBLIC_KEY } from '@/adapters/payments/woovi-webhook-signature'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import { z } from 'zod'
import { enqueueExpirePix, enqueueRefundPix } from '@/adapters/queues/enqueue-payment-job'
import { StripeCardPaymentGateway } from '@/adapters/payments/stripe-card-payment-gateway'
import { WooviPixPaymentGateway } from '@/adapters/payments/woovi-pix-payment-gateway'
import type { PaymentGateway } from '@/domain/payments/payment-gateway'
import type { Surface } from '@/domain/promotions/price-for'
import { env } from '@/env'
import { buildError, business_rule, conflict, forbidden, not_found, provider_error, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getLinksRepository } from '@/repositories/links-repository'
import { confirmationFlags } from '@/use-cases/@Auth/confirm-identifier'
import { ConfirmGatewayPaymentUseCase } from '@/use-cases/@Payments/confirm-gateway-payment'
import { refundFailureMessage } from '@/use-cases/@Payments/payment-jobs'
import { RegisterRefundResolvedUseCase } from '@/use-cases/@Payments/register-refund-resolved'
import { CheckoutConflictError, getCheckoutStore, StoreOrdersRepository, type CheckoutStore, type CommercialOrder } from '@/use-cases/@Promotions/checkout-store'
import { PrismaCheckoutStore, runtimeCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'
import { registerOfferRoutes } from '@/http/controllers/@Promotions/offers'
import { gatewayFor, PIX_EXPIRES_IN_SECONDS, startCheckout, type CheckoutGateway } from '@/use-cases/@Promotions/start-checkout'
import { RefundActivationForbiddenError } from '@/use-cases/errors/refund-activation-forbidden-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { logDomainEvent } from '@/observability/logger'
import { getOrderInsightsRepository } from '@/repositories/order-insights-repository'
import { currentEmail, dispatchMeta, metaContextFrom, type MetaCustomData } from '@/use-cases/@Acquisition/record-funnel'

const checkoutBody = z.object({
  linkId: z.string().min(1),
  surfaces: z.array(z.enum(['SEARCH', 'NICHE', 'HOME'])).min(1).max(3),
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  method: z.enum(['PIX', 'CARD']),
}).strict()

const hits = new Map<string, number[]>()

export function resetCheckoutLimitForTest(): void {
  hits.clear()
}

function limited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((at) => now - at < 60_000)
  if (recent.length >= 30) return true
  recent.push(now)
  hits.set(key, recent)
  return false
}

let testGateway: PaymentGateway | null = null
let testCharge: CheckoutGateway | null = null

function checkoutStore(): CheckoutStore {
  return runtimeCheckoutStore()
}

async function priceRowsFor(tenantId: string) {
  const store = checkoutStore()
  if (store instanceof PrismaCheckoutStore) return store.pricesFor(tenantId)
  return store.prices()
}

function ordersRepository() {
  const store = checkoutStore()
  if (store instanceof PrismaCheckoutStore) {
    return {
      async findById(id: string) {
        return (await store.findCommercial(id))?.order ?? null
      },
      async save(order: import('@/domain/payments/order').Order) {
        await store.saveOrder(order)
      },
    }
  }
  return new StoreOrdersRepository(getCheckoutStore())
}

function chargeGateway(method: 'PIX' | 'CARD'): CheckoutGateway {
  if (testCharge) return testCharge
  if (process.env.NODE_ENV === 'test') {
    return {
      method,
      async createCharge(input) {
        return {
          gatewayChargeId: `test-${input.orderId}`,
          brCode: method === 'PIX' ? '000201' : undefined,
          clientSecret: method === 'CARD' ? 'secret' : undefined,
        }
      },
    }
  }
  const pix = new WooviPixPaymentGateway(env.WOOVI_APP_ID ?? '', env.WOOVI_API_BASE_URL)
  const card = new StripeCardPaymentGateway(stripeClient())
  return gatewayFor(method, pix, card)
}

function stripeClient() {
  return env.STRIPE_SECRET_KEY ? (new Stripe(env.STRIPE_SECRET_KEY) as never) : null
}

function providerGateway(method: 'PIX' | 'CARD'): PaymentGateway {
  if (testGateway) return testGateway
  if (method === 'CARD') {
    return new StripeCardPaymentGateway(stripeClient())
  }
  return new WooviPixPaymentGateway(env.WOOVI_APP_ID ?? '', env.WOOVI_API_BASE_URL)
}

export function setPaymentGatewayForTest(gateway: PaymentGateway | null): void {
  testGateway = gateway
}

export function setCheckoutGatewayForTest(gateway: CheckoutGateway | null): void {
  testCharge = gateway
}

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function readStripeEvent(payload: Buffer, signature: string | undefined): { orderId: string; eventId: string } {
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) throw new Error('assinatura')
  if (process.env.NODE_ENV === 'test') {
    if (!sameSecret(signature, env.STRIPE_WEBHOOK_SECRET)) throw new Error('assinatura')
    const body = JSON.parse(payload.toString()) as { id?: string; orderId?: string }
    if (!body.id || !body.orderId) throw new Error('assinatura')
    return { eventId: body.id, orderId: body.orderId }
  }
  if (!env.STRIPE_SECRET_KEY) throw new Error('assinatura')
  const stripe = new Stripe(env.STRIPE_SECRET_KEY)
  const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET)
  const orderId = (event.data.object as { metadata?: { orderId?: string } }).metadata?.orderId
  if (!orderId) throw new Error('pedido')
  return { eventId: event.id, orderId }
}

function readWooviEvent(payload: Buffer, signature: string | undefined): { orderId: string; eventId: string } {
  const publicKey = env.WOOVI_WEBHOOK_PUBLIC_KEY ?? WOOVI_PUBLISHED_PUBLIC_KEY
  if (!verifyWooviSignature(payload, signature, publicKey)) throw new Error('assinatura')
  const body = JSON.parse(payload.toString()) as {
    eventId?: string
    correlationID?: string
    charge?: { correlationID?: string }
  }
  const orderId = body.charge?.correlationID ?? body.correlationID
  const eventId = body.eventId ?? body.correlationID
  if (!orderId || !eventId) throw new Error('pedido')
  return { eventId, orderId }
}

async function confirm(orderId: string, eventId: string, requestId: string) {
  const store = checkoutStore()
  const orders = ordersRepository()
  const current = await store.findCommercial(orderId)
  const gateway = testGateway ?? (process.env.NODE_ENV === 'test'
    ? {
      method: 'PIX' as const,
      async getCharge() {
        return { status: 'PENDING' as const, paidAt: null }
      },
      async refund() {
        return { refundId: 'none', status: 'FAILED' as const }
      },
    }
    : providerGateway(current?.order.method ?? 'PIX'))
  const useCase = new ConfirmGatewayPaymentUseCase(
    orders,
    gateway,
    {
      async activateFromPaidOrder(id) {
        const row = await store.findCommercial(id)
        if (!row?.userId) return
        const user = await getLinksRepository().findSubmitter(row.tenantId, row.userId)
        if (!user || user.status === 'BANNED') {
          logDomainEvent('promotion.activated', { orderId: id, requestId, result: 'skipped' })
          return
        }
        await store.activatePaid(id, new Date())
        logDomainEvent(row.renewal ? 'promotion.renewed' : 'promotion.activated', {
          orderId: id,
          requestId,
          tenantId: row.tenantId,
          userId: row.userId,
          result: 'active',
        })
      },
    },
    {
      async scheduleRetry(id, attempt) {
        logDomainEvent('refund.requested', { orderId: id, requestId, attempt, result: 'scheduled' })
        await enqueueRefundPix(id, attempt ?? 1)
      },
    },
  )
  const result = await useCase.execute({ orderId, eventId })
  const insights = getOrderInsightsRepository()
  if (result.order.status === 'PAID' || result.order.status === 'PAID_LATE') {
    await insights.markPaid(result.order.id, new Date())
  }
  if (result.activated && current) {
    const meta = await insights.takeMetaContext(result.order.id)
    dispatchMeta({
      name: 'Purchase',
      eventId: `${result.order.id}:purchase`,
      meta,
      custom: {
        ...orderMetaData(current.order.id, current.productCode, current.durationDays, current.order.amountCents, current.order.method),
        renewal: current.renewal,
      },
    })
  } else if (result.order.status === 'PAID_LATE') {
    await insights.takeMetaContext(result.order.id)
  }
  return result
}

function orderMetaData(orderId: string, productCode: string, durationDays: number, amountCents: number, method: 'PIX' | 'CARD'): MetaCustomData {
  return {
    value: amountCents / 100,
    currency: 'BRL',
    content_ids: [productCode],
    content_type: 'product',
    content_name: `${productCode} ${durationDays} dias`,
    num_items: 1,
    order_id: orderId,
    payment_method: method === 'PIX' ? 'pix' : 'card',
  }
}

async function startedCheckout(
  request: FastifyRequest,
  input: { orderId: string; userId: string; email: string | null; linkId: string; productCode: string; durationDays: number; amountCents: number; method: 'PIX' | 'CARD'; renewal: boolean },
) {
  const meta = metaContextFrom(request, `/painel/links/${input.linkId}/destaque`, { externalId: input.userId, email: input.email })
  if (meta.consent !== 'marketing') return
  try {
    await getOrderInsightsRepository().saveMetaContext(input.orderId, meta)
  } catch (error) {
    logDomainEvent('meta.context', { orderId: input.orderId, result: error instanceof Error ? error.message : 'erro' })
  }
  dispatchMeta({
    name: 'AddPaymentInfo',
    eventId: `${input.orderId}:payment`,
    meta,
    custom: { ...orderMetaData(input.orderId, input.productCode, input.durationDays, input.amountCents, input.method), renewal: input.renewal },
  })
}

export async function postCheckout(request: FastifyRequest, reply: FastifyReply) {
  const parsed = checkoutBody.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send(buildError({
      code: validation,
      message: 'Dados inválidos.',
      request_id: request.id,
      issues: parsed.error.format(),
    }))
  }
  if (limited(request.user.sub)) {
    return reply.status(429).send(buildError({ code: 'rate_limited', message: 'Muitas tentativas.', request_id: request.id }))
  }
  try {
    const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0] || '')
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const repo = getLinksRepository()
    const user = await repo.findSubmitter(tenant.id, request.user.sub)
    if (!user) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    const flags = confirmationFlags(user.identifiers)
    if (!flags.emailConfirmed) {
      return reply.status(403).send(buildError({ code: business_rule, message: 'Conta não pode comprar destaque.', request_id: request.id }))
    }
    const link = await repo.findLinkById(parsed.data.linkId)
    if (!link || link.tenantId !== tenant.id || link.ownerId !== user.id) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    const niche = await repo.findNiche(tenant.id, link.nicheId)
    const result = await startCheckout({
      tenantId: tenant.id,
      userId: user.id,
      linkId: link.id,
      account: user.status,
      link: link.status === 'PUBLISHED' || link.status === 'PENDING_MODERATION' || link.status === 'UNAVAILABLE'
        ? link.status
        : 'UNAVAILABLE',
      requiresAge: niche?.requiresAge ?? false,
      surfaces: parsed.data.surfaces as Surface[],
      durationDays: parsed.data.durationDays,
      method: parsed.data.method,
      rows: await priceRowsFor(tenant.id),
      idempotencyKey: typeof request.headers['idempotency-key'] === 'string' ? request.headers['idempotency-key'] : null,
      requestId: request.id,
      renewal: false,
      store: checkoutStore(),
      gateway: chargeGateway(parsed.data.method),
      scheduleExpire: enqueueExpirePix,
    })
    await startedCheckout(request, {
      orderId: result.orderId,
      userId: user.id,
      email: currentEmail(user.identifiers),
      linkId: link.id,
      productCode: result.code,
      durationDays: parsed.data.durationDays,
      amountCents: result.amountCents,
      method: parsed.data.method,
      renewal: false,
    })
    return reply.status(201).send({
      orderId: result.orderId,
      code: result.code,
      amountCents: result.amountCents,
      savingsCents: result.savingsCents,
      ...(result.brCode ? { brCode: result.brCode } : {}),
      ...(result.clientSecret ? { clientSecret: result.clientSecret } : {}),
    })
  } catch (error) {
    if (error instanceof CheckoutConflictError) {
      return reply.status(409).send(buildError({ code: conflict, message: 'Já existe compra pendente desta superfície.', request_id: request.id }))
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    if (error instanceof Error && error.message === 'conta') {
      return reply.status(403).send(buildError({ code: business_rule, message: 'Compra não aceita.', request_id: request.id }))
    }
    if (error instanceof Error && error.message === 'Combinação não está disponível') {
      return reply.status(409).send(buildError({ code: business_rule, message: error.message, request_id: request.id }))
    }
    if (error instanceof Error && /link|HOME|pendente|disponível|SEARCH|NICHE/.test(error.message)) {
      return reply.status(409).send(buildError({ code: business_rule, message: 'Compra não aceita.', request_id: request.id }))
    }
    return reply.status(503).send(buildError({ code: provider_error, message: 'Pagamento indisponível.', request_id: request.id }))
  }
}

async function postWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
  read: (payload: Buffer, signature: string | undefined) => { orderId: string; eventId: string },
  header: string,
) {
  try {
    const payload = Buffer.isBuffer(request.body) ? request.body : Buffer.from(JSON.stringify(request.body ?? {}))
    const signature = request.headers[header]
    const event = read(payload, typeof signature === 'string' ? signature : undefined)
    const result = await confirm(event.orderId, event.eventId, request.id)
    logDomainEvent(result.order.status === 'PAID_LATE' ? 'payment.paid_late' : 'payment.confirmed', {
      requestId: request.id,
      orderId: result.order.id,
      result: result.activated ? 'activated' : result.order.status,
    })
    return reply.status(200).send({ received: true })
  } catch {
    return reply.status(400).send(buildError({ code: validation, message: 'Webhook inválido.', request_id: request.id }))
  }
}

export async function postStripeWebhook(request: FastifyRequest, reply: FastifyReply) {
  return postWebhook(request, reply, readStripeEvent, 'stripe-signature')
}

export async function postWooviWebhook(request: FastifyRequest, reply: FastifyReply) {
  return postWebhook(request, reply, readWooviEvent, 'x-webhook-signature')
}

export async function postRefundResolved(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'ADMIN') {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  try {
    const order = await new RegisterRefundResolvedUseCase(ordersRepository()).execute((request.params as { orderId: string }).orderId)
    return reply.status(200).send({ orderId: order.id, status: order.status })
  } catch (error) {
    if (error instanceof RefundActivationForbiddenError) {
      return reply.status(409).send(buildError({ code: business_rule, message: 'Estorno ainda não confirmado.', request_id: request.id }))
    }
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
}

export async function getRefund(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'ADMIN') {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const row = await checkoutStore().findCommercial((request.params as { orderId: string }).orderId)
  if (!row) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  return reply.status(200).send({
    orderId: row.order.id,
    userId: row.userId,
    amountCents: row.order.amountCents,
    paymentId: row.order.gatewayChargeId,
    refundIds: row.refundIds,
    attempts: row.order.refundAttempts,
    errors: row.refundErrors,
    status: row.order.status,
    createdAt: row.createdAt.toISOString(),
    message: row.order.status === 'REFUND_FAILED' ? refundFailureMessage(row.order.id) : null,
  })
}

export async function postRenew(request: FastifyRequest, reply: FastifyReply) {
  const parsed = checkoutBody.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send(buildError({
      code: validation,
      message: 'Dados inválidos.',
      request_id: request.id,
    }))
  }
  try {
    const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0] || '')
    const repo = getLinksRepository()
    const user = await repo.findSubmitter(tenant.id, request.user.sub)
    const link = await repo.findLinkById(parsed.data.linkId)
    if (!user || !link || link.tenantId !== tenant.id || link.ownerId !== user.id || request.user.tenantId !== tenant.id) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    const niche = await repo.findNiche(tenant.id, link.nicheId)
    const result = await startCheckout({
      tenantId: tenant.id,
      userId: user.id,
      linkId: link.id,
      account: user.status,
      link: link.status === 'PUBLISHED' ? 'PUBLISHED' : 'UNAVAILABLE',
      requiresAge: niche?.requiresAge ?? false,
      surfaces: parsed.data.surfaces,
      durationDays: parsed.data.durationDays,
      method: parsed.data.method,
      rows: await priceRowsFor(tenant.id),
      idempotencyKey: typeof request.headers['idempotency-key'] === 'string' ? request.headers['idempotency-key'] : null,
      requestId: request.id,
      renewal: true,
      store: checkoutStore(),
      gateway: chargeGateway(parsed.data.method),
      scheduleExpire: enqueueExpirePix,
    })
    await startedCheckout(request, {
      orderId: result.orderId,
      userId: user.id,
      email: currentEmail(user.identifiers),
      linkId: link.id,
      productCode: result.code,
      durationDays: parsed.data.durationDays,
      amountCents: result.amountCents,
      method: parsed.data.method,
      renewal: true,
    })
    return reply.status(201).send({
      orderId: result.orderId,
      code: result.code,
      amountCents: result.amountCents,
      savingsCents: result.savingsCents,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'conta') {
      return reply.status(403).send(buildError({ code: business_rule, message: 'Compra não aceita.', request_id: request.id }))
    }
    return reply.status(409).send(buildError({ code: business_rule, message: 'Renovação não aceita.', request_id: request.id }))
  }
}

function hostFromPayment(request: FastifyRequest): string {
  return (request.headers.host ?? '').split(':')[0] || ''
}

function orderDto(row: CommercialOrder, includeBrCode = false) {
  return {
    id: row.order.id,
    linkId: row.linkId,
    status: row.order.status,
    method: row.order.method,
    productCode: row.productCode,
    durationDays: row.durationDays,
    amountCents: row.order.amountCents,
    savingsCents: row.savingsCents,
    renewal: row.renewal,
    surfaces: row.surfaces,
    pixExpiresAt: row.order.pixExpiresAt,
    createdAt: row.createdAt.toISOString(),
    chargeStarted: row.order.gatewayChargeId !== null,
    ...(includeBrCode && row.brCode ? { brCode: row.brCode } : {}),
  }
}

async function listMyOrders(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await resolveTenant(hostFromPayment(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const rows = await checkoutStore().listOrdersForUser(tenant.id, request.user.sub)
    return reply.status(200).send({ orders: rows.map((row) => orderDto(row)) })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function getMyOrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await resolveTenant(hostFromPayment(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const orderId = (request.params as { orderId: string }).orderId
    const row = await checkoutStore().findCommercial(orderId)
    if (!row || row.tenantId !== tenant.id || row.userId !== request.user.sub) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    return reply.status(200).send(orderDto(row, true))
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function listMyPromotions(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await resolveTenant(hostFromPayment(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const links = await getLinksRepository().listByOwner(tenant.id, request.user.sub)
    const rows = await checkoutStore().listPromotionsByLinks(links.map((link) => link.id))
    return reply.status(200).send({
      promotions: rows.map((row) => ({
        id: row.id,
        linkId: row.linkId,
        surface: row.surface,
        status: row.status,
        activatedAt: row.activatedAt,
        expiresAt: row.expiresAt,
      })),
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

export async function listFailedRefunds(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'ADMIN') {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  try {
    const tenant = await resolveTenant(hostFromPayment(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const rows = await checkoutStore().listOrdersByStatus(tenant.id, 'REFUND_FAILED')
    const linksRepo = getLinksRepository()
    const refunds = await Promise.all(rows.map(async (row) => {
      const [link, user] = await Promise.all([
        linksRepo.findLinkById(row.linkId),
        row.userId ? linksRepo.findSubmitter(tenant.id, row.userId) : null,
      ])
      const email = user?.identifiers.find((item) => item.kind === 'EMAIL' && item.replacedAt === null)
      return {
        orderId: row.order.id,
        userId: row.userId,
        userName: user?.name ?? '',
        userEmail: email?.normalizedValue ?? '',
        linkId: row.linkId,
        linkName: link?.name ?? '',
        productCode: row.productCode,
        durationDays: row.durationDays,
        method: row.order.method,
        amountCents: row.order.amountCents,
        refundIds: row.refundIds,
        attempts: row.order.refundAttempts,
        errors: row.refundErrors,
        status: row.order.status,
        createdAt: row.createdAt.toISOString(),
        message: refundFailureMessage(row.order.id),
      }
    }))
    return reply.status(200).send({ refunds })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

export async function paymentRoutes(app: FastifyInstance) {
  await registerOfferRoutes(app)
  app.post('/promotions/checkout', { onRequest: [verifyJWT] }, postCheckout)
  app.post('/promotions/renew', { onRequest: [verifyJWT] }, postRenew)
  app.get('/promotions/mine', { onRequest: [verifyJWT] }, listMyPromotions)
  app.get('/orders/mine', { onRequest: [verifyJWT] }, listMyOrders)
  app.get('/orders/:orderId', { onRequest: [verifyJWT] }, getMyOrder)
  app.get('/admin/refunds', { onRequest: [verifyJWT] }, listFailedRefunds)
  app.post('/admin/refunds/:orderId/resolved', { onRequest: [verifyJWT] }, postRefundResolved)
  app.get('/admin/refunds/:orderId', { onRequest: [verifyJWT] }, getRefund)
}

export async function paymentWebhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body)
  })
  app.post('/payments/stripe/webhook', postStripeWebhook)
  app.post('/payments/woovi/webhook', postWooviWebhook)
}

export const PIX_WINDOW_MS = PIX_EXPIRES_IN_SECONDS * 1000
