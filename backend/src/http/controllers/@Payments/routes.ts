import { timingSafeEqual } from 'node:crypto'
import { openPixSignatureMatches } from '@/adapters/payments/woovi-webhook-signature'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import { z } from 'zod'
import { enqueueExpirePix, enqueueRefundPix } from '@/adapters/queues/enqueue-payment-job'
import { StripeCardPaymentGateway } from '@/adapters/payments/stripe-card-payment-gateway'
import { WooviPixPaymentGateway } from '@/adapters/payments/woovi-pix-payment-gateway'
import type { PaymentGateway } from '@/domain/payments/payment-gateway'
import { PRICE_ROWS, type Surface } from '@/domain/promotions/price-for'
import { env } from '@/env'
import { buildError, business_rule, conflict, forbidden, not_found, provider_error, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getLinksRepository } from '@/repositories/links-repository'
import { confirmationFlags } from '@/use-cases/@Auth/confirm-identifier'
import { ConfirmGatewayPaymentUseCase } from '@/use-cases/@Payments/confirm-gateway-payment'
import { refundFailureMessage } from '@/use-cases/@Payments/payment-jobs'
import { RegisterRefundResolvedUseCase } from '@/use-cases/@Payments/register-refund-resolved'
import { CheckoutConflictError, getCheckoutStore, StoreOrdersRepository, type CheckoutStore } from '@/use-cases/@Promotions/checkout-store'
import { PrismaCheckoutStore, runtimeCheckoutStore } from '@/use-cases/@Promotions/checkout-prisma'
import { gatewayFor, PIX_EXPIRES_IN_SECONDS, startCheckout, type CheckoutGateway } from '@/use-cases/@Promotions/start-checkout'
import { RefundActivationForbiddenError } from '@/use-cases/errors/refund-activation-forbidden-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { logDomainEvent } from '@/observability/logger'

const checkoutBody = z.object({
  linkId: z.string().min(1),
  surfaces: z.array(z.enum(['SEARCH', 'NICHE', 'HOME'])).min(1).max(3),
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(28)]),
  method: z.enum(['PIX', 'CARD']),
}).strict()

const hits = new Map<string, number[]>()

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
  const pix = new WooviPixPaymentGateway(env.WOOVI_APP_ID ?? '')
  const card = new StripeCardPaymentGateway(new Stripe(env.STRIPE_SECRET_KEY ?? 'sk_missing') as never)
  return gatewayFor(method, pix, card)
}

function providerGateway(method: 'PIX' | 'CARD'): PaymentGateway {
  if (testGateway) return testGateway
  if (method === 'CARD') {
    return new StripeCardPaymentGateway(new Stripe(env.STRIPE_SECRET_KEY ?? 'sk_missing') as never)
  }
  return new WooviPixPaymentGateway(env.WOOVI_APP_ID ?? '')
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

function readWooviEvent(payload: Buffer, signature: string | undefined, testSignature?: string): { orderId: string; eventId: string } {
  const hmacOk = openPixSignatureMatches(payload, signature, env.WOOVI_WEBHOOK_SECRET)
  const testOk = process.env.NODE_ENV === 'test'
    && Boolean(process.env.TEST_WEBHOOK_SIGNATURE)
    && Boolean(testSignature)
    && sameSecret(testSignature ?? '', process.env.TEST_WEBHOOK_SIGNATURE ?? '')
  if (!hmacOk && !testOk) throw new Error('assinatura')
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
  return useCase.execute({ orderId, eventId })
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
    if (!flags.emailConfirmed || !flags.phoneConfirmed) {
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
      rows: PRICE_ROWS,
      idempotencyKey: typeof request.headers['idempotency-key'] === 'string' ? request.headers['idempotency-key'] : null,
      requestId: request.id,
      renewal: false,
      store: checkoutStore(),
      gateway: chargeGateway(parsed.data.method),
      scheduleExpire: enqueueExpirePix,
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
  return postWebhook(request, reply, (payload, signature) => {
    const testSignature = request.headers['x-test-signature']
    return readWooviEvent(payload, signature, typeof testSignature === 'string' ? testSignature : undefined)
  }, 'x-openpix-signature')
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
      rows: PRICE_ROWS,
      idempotencyKey: typeof request.headers['idempotency-key'] === 'string' ? request.headers['idempotency-key'] : null,
      requestId: request.id,
      renewal: true,
      store: checkoutStore(),
      gateway: chargeGateway(parsed.data.method),
      scheduleExpire: enqueueExpirePix,
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

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/promotions/checkout', { onRequest: [verifyJWT] }, postCheckout)
  app.post('/promotions/renew', { onRequest: [verifyJWT] }, postRenew)
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
