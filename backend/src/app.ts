import { randomUUID } from 'node:crypto'
import * as HyperDX from '@hyperdx/node-opentelemetry'
import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import { ZodError } from 'zod'
import { env } from '@/env'
import { adminRoutes } from '@/http/controllers/@Admin/routes'
import { authRoutes } from '@/http/controllers/@auth/routes'
import { goRoutes } from '@/http/controllers/@Links/go'
import { linksRoutes } from '@/http/controllers/@Links/routes'
import { paymentRoutes, paymentWebhookRoutes } from '@/http/controllers/@Payments/routes'
import { searchRoutes } from '@/http/controllers/@Search/routes'
import { health, live, ready } from '@/http/controllers/@Health/health'

if (env.HDX_API_KEY) {
  HyperDX.init({
    apiKey: env.HDX_API_KEY,
    service: env.HDX_SERVICE_NAME,
  })
}

export const app = fastify({
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
})

app.register(fastifyCookie)

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
    await instance.register(paymentRoutes)
    await instance.register(paymentWebhookRoutes)
    await instance.register(adminRoutes)
  },
  { prefix },
)

app.register(goRoutes, { prefix: '/go' })

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error.',
      issues: error.format(),
    })
  }

  if (env.NODE_ENV !== 'production') {
    console.error(error)
    return reply.status(500).send({ message: 'Internal server error' })
  }

  return reply.status(500).send({
    code: 'internal_error',
    request_id: request.id,
  })
})
