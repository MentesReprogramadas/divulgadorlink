import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { buildError, business_rule, internal_error } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { confirmationFlags } from '@/use-cases/@Auth/confirm-identifier'
import { assertCanSubmitLink } from '@/use-cases/@Links/submit-link'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

export const submitLinkBodySchema = z
  .object({
    url: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    networkId: z.string().min(1),
    nicheId: z.string().min(1),
    otherNote: z.string().optional(),
  })
  .strict()

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) {
    throw new ResourceNotFoundError()
  }
  return raw.split(':')[0]!
}

async function createLink(request: FastifyRequest, reply: FastifyReply) {
  submitLinkBodySchema.parse(request.body)

  try {
    const host = hostFromRequest(request)
    const tenant = await resolveTenant(host)
    const userId = request.user.sub as string

    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(
        buildError({
          code: business_rule,
          message: 'Conta não pode enviar link.',
          request_id: request.id,
        }),
      )
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id },
      include: { identifiers: true },
    })

    if (!user) {
      throw new ResourceNotFoundError()
    }

    try {
      assertCanSubmitLink({
        ...confirmationFlags(user.identifiers),
        status: user.status,
      })
    } catch {
      return reply.status(403).send(
        buildError({
          code: business_rule,
          message: 'Conta não pode enviar link.',
          request_id: request.id,
        }),
      )
    }

    return reply.status(501).send(
      buildError({
        code: internal_error,
        message: 'Envio de link ainda não disponível.',
        request_id: request.id,
      }),
    )
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function linksRoutes(app: FastifyInstance) {
  app.post('/', { onRequest: [verifyJWT] }, createLink)
}
