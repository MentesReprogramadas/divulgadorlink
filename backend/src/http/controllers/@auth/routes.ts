import { compare, hash } from 'bcryptjs'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '@/env'
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

async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = registerBodySchema.parse(request.body)
  const host = hostFromRequest(request)

  try {
    const tenant = await resolveTenant(host)
    const user = await registerUseCase.execute({ ...body, tenantId: tenant.id })
    const identifiers = await confirmUseCase.issueInitialCodes(user.id)
    const flags = confirmationFlags(identifiers)
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

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', register)
  app.post('/confirm', { onRequest: [verifyJWT] }, confirm)
}
