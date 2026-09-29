import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import { ZodError } from 'zod'
import { env } from '@/env'
import { authRoutes } from '@/http/controllers/@auth/routes'
import { health } from '@/http/controllers/@Health/health'

export const app = fastify()

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
    await instance.register(authRoutes, { prefix: '/auth' })
  },
  { prefix },
)

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error.',
      issues: error.format(),
    })
  }

  if (env.NODE_ENV !== 'production') {
    console.error(error)
  }

  return reply.status(500).send({ message: 'Internal server error' })
})
