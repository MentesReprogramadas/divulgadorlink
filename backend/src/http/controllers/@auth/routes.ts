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
  confirmIntent,
  ConfirmIdentifierUseCase,
  generatePlainCode,
  normalizeEmail,
  PrismaConfirmCodesRepository,
} from '@/use-cases/@Auth/confirm-identifier'
import { RegisterUseCase, registerBodySchema } from '@/use-cases/@Auth/register'
import { InvalidVerificationCodeError } from '@/use-cases/errors/invalid-verification-code-error'
import { RateLimitError } from '@/use-cases/errors/rate-limit-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { deleteAccount, WrongPasswordError } from '@/use-cases/@Auth/delete-account'
import { requestPasswordReset, resetPassword } from '@/use-cases/@Auth/password-reset'
import { emailOutboxEnabled, readOutbound } from '@/adapters/notifications/outbound-mail'
import { createLoginRateLimiter } from '@/http/controllers/@auth/login-rate'
import { DeliveryUnavailableError } from '@/domain/notifications/confirmation-delivery'
import { parseTouch } from '@/domain/acquisition/touch'
import { getAcquisitionStore, metaContextFrom } from '@/use-cases/@Acquisition/record-funnel'

const registerUseCase = new RegisterUseCase(prisma)
const confirmUseCase = new ConfirmIdentifierUseCase(
  new PrismaConfirmCodesRepository(prisma),
  {
    hashPlain: (plain) => hash(plain, 6),
    compareHash: compare,
    generatePlain: (kind) => generatePlainCode(kind, env.NODE_ENV),
  },
)

const loginRate = createLoginRateLimiter()
const forgotRate = createLoginRateLimiter()

export { resetRefreshRevocationsForTest }

export function resetLoginAttemptsForTest() {
  loginRate.reset()
  forgotRate.reset()
}

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const confirmBodySchema = z.object({
  kind: z.enum(['EMAIL', 'PHONE']),
  code: z.string().optional(),
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

const testAccounts: Array<{ id: string; tenantId: string; name: string; email: string; role: 'USER'; status: 'ACTIVE' }> = []
let testDelivery: 'ok' | 'down' = 'ok'

export function resetRegistrationForTest(): void {
  if (process.env.NODE_ENV !== 'test') return
  testAccounts.length = 0
  testDelivery = 'ok'
}

export function setConfirmationDeliveryForTest(mode: 'ok' | 'down'): void {
  if (process.env.NODE_ENV !== 'test') return
  testDelivery = mode
}

export function registrationEmailsForTest(): string[] {
  return testAccounts.map((row) => row.email)
}

async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerBodySchema.parse(request.body)
  const host = hostFromRequest(request)

  try {
    const tenant = await resolveTenant(host)
    const user = process.env.NODE_ENV === 'test'
      ? createTestAccount(tenant.id, body)
      : await registerUseCase.execute({ ...body, tenantId: tenant.id })
    let identifiers
    try {
      if (process.env.NODE_ENV === 'test') {
        if (testDelivery === 'down') throw new DeliveryUnavailableError('EMAIL', 'provider_error')
        identifiers = [{
          id: `${user.id}-email`,
          userId: user.id,
          kind: 'EMAIL' as const,
          normalizedValue: body.email.toLowerCase(),
          confirmedAt: null,
          replacedAt: null,
        }]
      } else {
        identifiers = await confirmUseCase.issueInitialCodes(user.id)
      }
    } catch (error) {
      if (error instanceof DeliveryUnavailableError) {
        if (process.env.NODE_ENV === 'test') {
          const index = testAccounts.findIndex((row) => row.id === user.id)
          if (index >= 0) testAccounts.splice(index, 1)
        } else {
          await prisma.user.delete({ where: { id: user.id } })
        }
        return reply.status(503).send({ message: 'Não foi possível enviar o código. Tente de novo.' })
      }
      throw error
    }
    await getAcquisitionStore().rememberRegistration({
      tenantId: tenant.id,
      userId: user.id,
      touch: parseTouch(request.cookies.tla_touch),
      meta: metaContextFrom(request, '/cadastro'),
    })
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

function createTestAccount(tenantId: string, body: { name: string; email: string }): { id: string; name: string; role: 'USER'; status: 'ACTIVE' } {
  const email = body.email.toLowerCase()
  if (testAccounts.some((row) => row.tenantId === tenantId && row.email === email)) {
    throw new UserAlreadyExistsError()
  }
  const user = { id: randomUUID(), tenantId, name: body.name, email, role: 'USER' as const, status: 'ACTIVE' as const }
  testAccounts.push(user)
  return user
}

async function confirmStatus(request: FastifyRequest, reply: FastifyReply) {
  const kind = (request.query as { kind?: string }).kind === 'PHONE' ? 'PHONE' : 'EMAIL'
  try {
    const result = await confirmUseCase.status({ userId: request.user.sub, kind })
    return reply.status(200).send(result)
  } catch (error) {
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
    const intent = confirmIntent(body)
    const result = await confirmUseCase.execute({
      userId,
      kind: body.kind,
      code: 'code' in intent ? intent.code : undefined,
      resend: intent.resend === true,
    })
    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    if (error instanceof RateLimitError) {
      return reply.status(429).send({
        message: error.message,
        ...(typeof error.retryAfter === 'number' ? { retryAfter: error.retryAfter } : {}),
      })
    }
    if (error instanceof InvalidVerificationCodeError) {
      return reply.status(400).send({ message: error.message })
    }
    throw error
  }
}

async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = loginBodySchema.parse(request.body)
  const host = hostFromRequest(request)
  const key = `${host}:${body.email.toLowerCase()}`
  if (loginRate.limited(key)) {
    return reply.status(429).send({ message: 'Muitas tentativas.' })
  }
  const tenant = await resolveTenant(host)
  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, identifiers: { some: { kind: 'EMAIL', normalizedValue: body.email.toLowerCase(), replacedAt: null } } },
  })
  if (!user) {
    loginRate.fail(key)
    return reply.status(401).send({ message: 'Credenciais inválidas.' })
  }
  const matches = await compare(body.password, user.passwordHash)
  if (!matches) {
    loginRate.fail(key)
    return reply.status(401).send({ message: 'Credenciais inválidas.' })
  }
  loginRate.succeed(key)
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

const forgotBodySchema = z.object({ email: z.string().email() }).strict()
const resetBodySchema = z.object({ token: z.string().min(20), password: z.string().min(8) }).strict()
const deleteBodySchema = z.object({ password: z.string().min(8) }).strict()

async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const body = forgotBodySchema.parse(request.body)
  const host = hostFromRequest(request)
  const key = `${host}:${normalizeEmail(body.email)}`
  if (forgotRate.limited(key)) {
    return reply.status(429).send({ message: 'Muitas tentativas.' })
  }
  forgotRate.fail(key)
  try {
    const tenant = await resolveTenant(host)
    await requestPasswordReset({
      tenantId: tenant.id,
      tenantName: tenant.name,
      host: tenant.host,
      email: body.email,
    })
  } catch (error) {
    if (!(error instanceof ResourceNotFoundError)) throw error
  }
  return reply.status(200).send({ ok: true })
}

async function resetPasswordRoute(request: FastifyRequest, reply: FastifyReply) {
  const body = resetBodySchema.parse(request.body)
  const passwordHash = await hash(body.password, 12)
  const updated = await resetPassword({ token: body.token, passwordHash })
  if (!updated) {
    return reply.status(400).send(buildError({
      code: 'validation',
      message: 'Link inválido ou vencido.',
      request_id: request.id,
    }))
  }
  return reply.status(200).send({ ok: true })
}

async function deleteOwnAccount(request: FastifyRequest, reply: FastifyReply) {
  const body = deleteBodySchema.parse(request.body)
  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    await deleteAccount({
      tenantId: tenant.id,
      tenantName: tenant.name,
      host: tenant.host,
      userId: request.user.sub,
      password: body.password,
      compare,
    })
    clearSessionCookies(reply)
    return reply.status(200).send({ ok: true })
  } catch (error) {
    if (error instanceof WrongPasswordError) {
      return reply.status(401).send(buildError({ code: unauthenticated, message: error.message, request_id: request.id }))
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
}

async function emailOutbox(request: FastifyRequest, reply: FastifyReply) {
  if (!emailOutboxEnabled()) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const to = (request.query as { to?: string }).to
  if (!to || !z.string().email().safeParse(to).success) {
    return reply.status(400).send(buildError({ code: 'validation', message: 'Dados inválidos.', request_id: request.id }))
  }
  return reply.status(200).send({
    messages: readOutbound(normalizeEmail(to)).map((email) => ({
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      kind: email.kind,
    })),
  })
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
  app.get('/confirm', { onRequest: [verifyJWT] }, confirmStatus)
  app.post('/confirm', { onRequest: [verifyJWT] }, confirm)
  app.get('/session', { onRequest: [verifyJWT] }, currentSession)
  app.get('/confirmation-inbox', { onRequest: [verifyJWT] }, confirmationInbox)
  app.post('/forgot-password', forgotPassword)
  app.post('/reset-password', resetPasswordRoute)
  app.post('/account/delete', { onRequest: [verifyJWT] }, deleteOwnAccount)
  app.get('/email-outbox', emailOutbox)
}
