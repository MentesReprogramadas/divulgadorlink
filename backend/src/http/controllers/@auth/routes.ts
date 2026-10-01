import { randomBytes, randomUUID } from 'node:crypto'
import { compare, hash } from 'bcryptjs'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { isRefreshRevoked, refreshTtlSeconds, resetRefreshRevocationsForTest, revokeRefreshJti } from '@/adapters/auth/refresh-revocation'
import { confirmationInboxEnabled, readConfirmation } from '@/adapters/auth/confirmation-inbox'
import { env } from '@/env'
import { buildError, forbidden, internal_error, not_found, unauthenticated } from '@/http/errors'
import { resolveTenant } from '@/http/tenant'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { prisma } from '@/lib/prisma'
import {
  canSubmitLinkFromIdentifiers,
  confirmationFlags,
  ConfirmIdentifierUseCase,
  generatePlainCode,
  PrismaConfirmCodesRepository,
} from '@/use-cases/@Auth/confirm-identifier'
import { RegisterUseCase, registerBodySchema } from '@/use-cases/@Auth/register'
import { InvalidVerificationCodeError } from '@/use-cases/errors/invalid-verification-code-error'
import { RateLimitError } from '@/use-cases/errors/rate-limit-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'

const registerUseCase = new RegisterUseCase(prisma)
const confirmUseCase = new ConfirmIdentifierUseCase(
  new PrismaConfirmCodesRepository(prisma),
  {
    hashPlain: (plain) => hash(plain, 6),
    compareHash: compare,
    generatePlain: (kind) => generatePlainCode(kind, env.NODE_ENV),
  },
)

const loginAttempts = new Map<string, number[]>()

export { resetRefreshRevocationsForTest }

export function resetLoginAttemptsForTest() {
  loginAttempts.clear()
}

function loginIsLimited(key: string, now = Date.now()): boolean {
  const windowMs = 60 * 60 * 1000
  const recent = (loginAttempts.get(key) ?? []).filter((at) => now - at < windowMs)
  if (recent.length >= 5) {
    loginAttempts.set(key, recent)
    return true
  }
  recent.push(now)
  loginAttempts.set(key, recent)
  return false
}

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const confirmBodySchema = z.object({
  kind: z.enum(['EMAIL', 'PHONE']),
  code: z.string().min(1).optional(),
  resend: z.boolean().optional(),
})

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) {
    throw new ResourceNotFoundError()
  }
  return raw.split(':')[0]!
}

function cookieFlags(httpOnly: boolean) {
  return {
    path: '/',
    httpOnly,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }
}

function setSessionCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string; role: string },
) {
  const csrf = randomBytes(32).toString('hex')
  reply.setCookie('accessToken', tokens.accessToken, cookieFlags(true))
  reply.setCookie('refreshToken', tokens.refreshToken, cookieFlags(true))
  reply.setCookie('csrf', csrf, cookieFlags(false))
  reply.setCookie('catalogo_role', tokens.role, cookieFlags(false))
}

function clearSessionCookies(reply: FastifyReply) {
  for (const name of ['accessToken', 'refreshToken', 'csrf', 'catalogo_role'] as const) {
    reply.clearCookie(name, cookieFlags(name !== 'csrf' && name !== 'catalogo_role'))
  }
}

async function signSession(reply: FastifyReply, user: { id: string; role: string; tenantId: string }) {
  const jti = randomUUID()
  const accessToken = await reply.jwtSign(
    {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      typ: 'access',
    },
    {
      sign: {
        expiresIn: '5m',
      },
    },
  )

  const refreshToken = await reply.jwtSign(
    {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      typ: 'refresh',
      jti,
    },
    {
      sign: {
        sub: user.id,
        expiresIn: '7d',
      },
    },
  )

  setSessionCookies(reply, { accessToken, refreshToken, role: user.role })

  return { accessToken, refreshToken }
}

async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerBodySchema.parse(request.body)
  const host = hostFromRequest(request)

  try {
    const tenant = await resolveTenant(host)
    const user = await registerUseCase.execute({ ...body, tenantId: tenant.id })
    const identifiers = await confirmUseCase.issueInitialCodes(user.id)
    const flags = confirmationFlags(identifiers)
    await signSession(reply, user)

    return reply.status(201).send({
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
        emailConfirmed: flags.emailConfirmed,
        phoneConfirmed: flags.phoneConfirmed,
        canSubmitLink: canSubmitLinkFromIdentifiers(user.status, identifiers),
      },
    })
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return reply.status(409).send({ message: error.message })
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

async function confirm(request: FastifyRequest, reply: FastifyReply) {
  const body = confirmBodySchema.parse(request.body)
  const userId = request.user.sub as string

  try {
    const result = await confirmUseCase.execute({
      userId,
      kind: body.kind,
      code: body.code,
      resend: body.resend,
    })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    if (error instanceof RateLimitError) {
      return reply.status(429).send({ message: error.message })
    }
    if (error instanceof InvalidVerificationCodeError) {
      return reply.status(400).send({ message: error.message })
    }
    throw error
  }
}

async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = loginBodySchema.parse(request.body)
  const key = `${hostFromRequest(request)}:${body.email}`
  if (loginIsLimited(key)) {
    return reply.status(429).send({ message: 'Muitas tentativas.' })
  }
  const host = hostFromRequest(request)
  const tenant = await resolveTenant(host)
  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, identifiers: { some: { kind: 'EMAIL', normalizedValue: body.email.toLowerCase(), replacedAt: null } } },
  })
  if (!user) return reply.status(401).send({ message: 'Credenciais inválidas.' })
  const matches = await compare(body.password, user.passwordHash)
  if (!matches) return reply.status(401).send({ message: 'Credenciais inválidas.' })
  await signSession(reply, user)
  const identifiers = await prisma.userIdentifier.findMany({
    where: { userId: user.id, replacedAt: null },
  })
  return reply.status(200).send({
    role: user.role,
    status: user.status,
    canSubmit: canSubmitLinkFromIdentifiers(user.status, identifiers),
  })
}

async function refresh(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify({ onlyCookie: true })
  } catch {
    return reply.status(401).send(buildError({ code: unauthenticated, message: 'Sessão inválida.', request_id: request.id }))
  }
  if (request.user.typ !== 'refresh' || !request.user.jti) {
    return reply.status(401).send(buildError({ code: unauthenticated, message: 'Sessão inválida.', request_id: request.id }))
  }
  try {
    if (await isRefreshRevoked(request.user.jti)) {
      return reply.status(401).send(buildError({ code: unauthenticated, message: 'Sessão inválida.', request_id: request.id }))
    }
  } catch {
    return reply.status(401).send(buildError({ code: unauthenticated, message: 'Sessão inválida.', request_id: request.id }))
  }
  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const exp = (request.user as { exp?: number }).exp
    await revokeRefreshJti(request.user.jti, refreshTtlSeconds(exp))
    await signSession(reply, {
      id: request.user.sub,
      role: request.user.role,
      tenantId: request.user.tenantId,
    })
    return reply.status(200).send({ role: request.user.role })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function logout(request: FastifyRequest, reply: FastifyReply) {
  const raw = request.cookies.refreshToken
  if (typeof raw === 'string' && raw.length > 0) {
    let decoded: { typ?: string; jti?: string; exp?: number } | null
    try {
      decoded = request.server.jwt.verify<{ typ?: string; jti?: string; exp?: number }>(raw)
    } catch {
      decoded = null
    }
    if (decoded?.typ === 'refresh' && decoded.jti) {
      try {
        await revokeRefreshJti(decoded.jti, refreshTtlSeconds(decoded.exp))
      } catch {
        clearSessionCookies(reply)
        return reply.status(503).send(buildError({ code: internal_error, message: 'Sessão não pôde ser encerrada.', request_id: request.id }))
      }
    }
  }
  clearSessionCookies(reply)
  return reply.status(204).send()
}

async function currentSession(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    const user = await prisma.user.findFirst({ where: { id: request.user.sub, tenantId: tenant.id } })
    if (!user) {
      return reply.status(401).send(buildError({ code: unauthenticated, message: 'Sessão inválida.', request_id: request.id }))
    }
    const identifiers = await prisma.userIdentifier.findMany({ where: { userId: user.id, replacedAt: null } })
    return reply.status(200).send({
      role: user.role,
      status: user.status,
      canSubmit: canSubmitLinkFromIdentifiers(user.status, identifiers),
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function confirmationInbox(request: FastifyRequest, reply: FastifyReply) {
  if (!confirmationInboxEnabled()) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const kind = (request.query as { kind?: string }).kind
  if (kind !== 'EMAIL' && kind !== 'PHONE') {
    return reply.status(400).send(buildError({ code: 'validation', message: 'Validation error.', request_id: request.id }))
  }
  const code = readConfirmation(request.user.sub, kind)
  if (!code) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  return reply.status(200).send({ code })
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', register)
  app.post('/login', login)
  app.post('/refresh', refresh)
  app.post('/logout', logout)
  app.post('/confirm', { onRequest: [verifyJWT] }, confirm)
  app.get('/session', { onRequest: [verifyJWT] }, currentSession)
  app.get('/confirmation-inbox', { onRequest: [verifyJWT] }, confirmationInbox)
}
