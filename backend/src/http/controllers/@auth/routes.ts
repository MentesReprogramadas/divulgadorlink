import { randomInt } from 'node:crypto'
import { compare, hash } from 'bcryptjs'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '@/env'
import { resolveTenant } from '@/http/tenant'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { prisma } from '@/lib/prisma'
import {
  assertResendAllowed,
  canSubmitLinkFromIdentifiers,
  confirmationFlags,
  currentIdentifier,
  RESEND_WINDOW_MS,
} from '@/use-cases/@Auth/confirm-identifier'
import { RegisterUseCase, registerBodySchema } from '@/use-cases/@Auth/register'
import { UserAlreadyExistsError } from '@/use-cases/errors/user-already-exists-error'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const registerUseCase = new RegisterUseCase(prisma)

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

function setRefreshTokenCookie(reply: FastifyReply, refreshToken: string) {
  reply.setCookie('refreshToken', refreshToken, {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

async function signSession(reply: FastifyReply, user: { id: string; role: string; tenantId: string }) {
  const accessToken = await reply.jwtSign({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
  })

  const refreshToken = await reply.jwtSign(
    {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
    },
    {
      sign: {
        sub: user.id,
        expiresIn: '7d',
      },
    },
  )

  setRefreshTokenCookie(reply, refreshToken)

  return { accessToken, refreshToken }
}

function verificationPlainCode(kind: 'EMAIL' | 'PHONE'): string {
  if (env.NODE_ENV === 'test') {
    return kind === 'EMAIL' ? '000001' : '000002'
  }
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

async function countResendsInWindow(userId: string, kind: 'EMAIL' | 'PHONE'): Promise<number> {
  const since = new Date(Date.now() - RESEND_WINDOW_MS)
  return prisma.verificationCode.count({
    where: {
      userId,
      kind,
      createdAt: { gte: since },
    },
  })
}

async function createVerificationCode(userId: string, kind: 'EMAIL' | 'PHONE') {
  const plain = verificationPlainCode(kind)
  const codeHash = await hash(plain, 6)
  const expiresAt = new Date(Date.now() + RESEND_WINDOW_MS)

  await prisma.verificationCode.create({
    data: {
      userId,
      kind,
      codeHash,
      expiresAt,
    },
  })

  return plain
}

async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerBodySchema.parse(request.body)
  const host = hostFromRequest(request)

  try {
    const tenant = await resolveTenant(host)
    const user = await registerUseCase.execute({ ...body, tenantId: tenant.id })

    const identifiers = await prisma.userIdentifier.findMany({
      where: { userId: user.id },
    })

    const flags = confirmationFlags(identifiers)
    await createVerificationCode(user.id, 'EMAIL')
    await createVerificationCode(user.id, 'PHONE')

    const tokens = await signSession(reply, user)

    return reply.status(201).send({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
        emailConfirmed: flags.emailConfirmed,
        phoneConfirmed: flags.phoneConfirmed,
        canSubmitLink: canSubmitLinkFromIdentifiers(user.status, identifiers),
      },
      token: tokens.accessToken,
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { identifiers: true },
  })

  if (!user) {
    return reply.status(404).send({ message: 'Recurso não encontrado.' })
  }

  const identifier = currentIdentifier(user.identifiers, body.kind)
  if (!identifier) {
    return reply.status(404).send({ message: 'Identificador não encontrado.' })
  }

  if (body.resend) {
    try {
      const sentInWindow = await countResendsInWindow(userId, body.kind)
      assertResendAllowed(sentInWindow)
    } catch {
      return reply.status(429).send({ message: 'limite de reenvio' })
    }

    await createVerificationCode(userId, body.kind)

    const identifiers = await prisma.userIdentifier.findMany({
      where: { userId },
    })
    const flags = confirmationFlags(identifiers)

    return reply.status(200).send({
      kind: body.kind,
      resent: true,
      emailConfirmed: flags.emailConfirmed,
      phoneConfirmed: flags.phoneConfirmed,
      canSubmitLink: canSubmitLinkFromIdentifiers(user.status, identifiers),
    })
  }

  if (!body.code) {
    return reply.status(400).send({ message: 'Informe o código ou solicite reenvio.' })
  }

  const latestCode = await prisma.verificationCode.findFirst({
    where: {
      userId,
      kind: body.kind,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!latestCode) {
    return reply.status(400).send({ message: 'Código inválido ou expirado.' })
  }

  const codeMatches = await compare(body.code, latestCode.codeHash)
  if (!codeMatches) {
    await prisma.verificationCode.update({
      where: { id: latestCode.id },
      data: { attempts: { increment: 1 } },
    })
    return reply.status(400).send({ message: 'Código inválido ou expirado.' })
  }

  await prisma.userIdentifier.update({
    where: { id: identifier.id },
    data: { confirmedAt: new Date() },
  })

  const identifiers = await prisma.userIdentifier.findMany({
    where: { userId },
  })
  const flags = confirmationFlags(identifiers)

  return reply.status(200).send({
    kind: body.kind,
    confirmed: true,
    emailConfirmed: flags.emailConfirmed,
    phoneConfirmed: flags.phoneConfirmed,
    canSubmitLink: canSubmitLinkFromIdentifiers(user.status, identifiers),
  })
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', register)
  app.post('/confirm', { onRequest: [verifyJWT] }, confirm)
}
