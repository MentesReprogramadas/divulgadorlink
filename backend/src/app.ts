import { randomUUID, timingSafeEqual } from 'node:crypto'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import { ZodError } from 'zod'
import { DeliveryUnavailableError } from '@/domain/notifications/confirmation-delivery'
import { env } from '@/env'
import { buildError, provider_error } from '@/http/errors'
import { analyticsRoutes } from '@/http/controllers/@Analytics/routes'
import { adminRoutes } from '@/http/controllers/@Admin/routes'
import { authRoutes } from '@/http/controllers/@auth/routes'
import { goRoutes } from '@/http/controllers/@Links/go'
import { linksRoutes } from '@/http/controllers/@Links/routes'
import { paymentRoutes, paymentWebhookRoutes } from '@/http/controllers/@Payments/routes'
import { catalogRoutes } from '@/http/controllers/@Catalog/routes'
import { searchRoutes } from '@/http/controllers/@Search/routes'
import { health, live, ready } from '@/http/controllers/@Health/health'
import { isActuatorProbe } from '@/observability/hyperdx-config'
import { logDomainEvent } from '@/observability/logger'

function observeServerError(error: unknown, requestId: string, status: number): void {
  const asError = error instanceof Error ? error : new Error('Internal server error')
  const span = trace.getActiveSpan()
  if (span) {
    span.recordException(asError)
    span.setStatus({ code: SpanStatusCode.ERROR, message: asError.name })
  }
  const detail = error instanceof Error ? error.stack ?? error.message : String(error)
  logDomainEvent('http.error', { request_id: requestId, error: detail, status })
}

export const app = fastify({
  bodyLimit: 1_048_576,
  genReqId: (request) => {
    const header = request.headers['x-request-id']
    if (typeof header === 'string' && header.length > 0) {
      return header
    }
    return randomUUID()
  },
})

app.addHook('onRequest', async (request, reply) => {
  reply.header('x-request-id', request.id)
  if (typeof request.id === 'string') {
    trace.getActiveSpan()?.setAttribute('request_id', request.id)
  }
})

app.addHook('onResponse', async (request, reply) => {
  const path = request.url.split('?')[0]
  if (isActuatorProbe(path)) return
  const host = request.headers.host
  logDomainEvent('http.completed', {
    request_id: request.id,
    tenant: typeof host === 'string' ? host.split(':')[0] : undefined,
    entity: `${request.method} ${request.routeOptions.url ?? request.url.split('?')[0]}`,
    duration_ms: reply.elapsedTime,
    status: reply.statusCode,
  })
})

app.register(fastifyCookie)

app.addHook('preHandler', async (request, reply) => {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return
  const authorization = request.headers.authorization
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) return
  const cookies = request.cookies ?? {}
  if (!cookies.accessToken && !cookies.refreshToken) return
  const header = request.headers['x-csrf-token']
  const expected = cookies.csrf
  const valid = typeof header === 'string'
    && typeof expected === 'string'
    && header.length >= 32
    && header.length === expected.length
    && timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  if (!valid) {
    return reply.status(403).send({
      code: 'forbidden',
      message: 'CSRF inválido.',
      request_id: request.id,
    })
  }
})

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
  sign: {
    expiresIn: '5m',
  },
})

const prefix = '/api/v1'

app.register(
  async (instance) => {
    instance.get('/actuator/health', health)
    instance.get('/actuator/live', live)
    instance.get('/actuator/ready', ready)
    await instance.register(authRoutes, { prefix: '/auth' })
    await instance.register(linksRoutes, { prefix: '/links' })
    await instance.register(searchRoutes)
    await instance.register(catalogRoutes)
    await instance.register(analyticsRoutes)
    await instance.register(paymentRoutes)
    await instance.register(paymentWebhookRoutes)
    await instance.register(adminRoutes)
  },
  { prefix },
)

app.register(goRoutes, { prefix: '/go' })

app.setErrorHandler((error, request, reply) => {
  if (error instanceof DeliveryUnavailableError) {
    observeServerError(error, request.id, 503)
    return reply.status(503).send(buildError({ code: provider_error, message: error.message, request_id: request.id }))
  }
  const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500
  if (statusCode >= 400 && statusCode < 500) {
    return reply.status(statusCode).send({
      code: statusCode === 413 ? 'validation' : 'validation',
      message: statusCode === 413 ? 'Corpo grande demais.' : 'Validation error.',
      request_id: request.id,
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error.',
      issues: error.format(),
    })
  }

  observeServerError(error, request.id, 500)
  if (env.NODE_ENV !== 'production') {
    return reply.status(500).send({ message: 'Internal server error' })
  }

  return reply.status(500).send({
    code: 'internal_error',
    request_id: request.id,
  })
})
