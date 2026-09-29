import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  buildError,
  forbidden,
  not_found,
  validation,
} from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { getConfigsRepository } from '@/repositories/configs-repository'
import { prisma } from '@/lib/prisma'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { registerBanRoutes } from '@/http/controllers/@Admin/ban'
import { registerModerationRoutes } from '@/http/controllers/@Admin/moderation'
import {
  ConfigAuthorizeDeniedError,
  ConfigNotFoundError,
  InvalidConfigValueError,
  UnknownConfigKeyError,
  UpdateAdminConfigUseCase,
} from '@/use-cases/@Admin/update-config'

const updateConfigBodySchema = z.object({ value: z.string() }).strict()

const updateConfigResponseSchema = z.object({
  config: z.object({
    id: z.string(),
    key: z.string(),
    value: z.string(),
  }),
  audit: z.object({
    action: z.literal('config.update'),
    entityType: z.literal('Config'),
    entityId: z.string(),
    actorId: z.string(),
    before: z.object({ value: z.string() }),
    after: z.object({ value: z.string() }),
    requestId: z.string(),
  }),
})

const updateConfigUseCase = new UpdateAdminConfigUseCase(
  getConfigsRepository(),
  getAuditLogsRepository(),
  process.env.NODE_ENV === 'test' ? undefined : prisma,
)

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) {
    throw new ResourceNotFoundError()
  }
  return raw.split(':')[0]!
}

function denialStatus(code: typeof forbidden | typeof not_found): number {
  return code === forbidden ? 403 : 404
}

async function patchConfig(request: FastifyRequest, reply: FastifyReply) {
  const body = updateConfigBodySchema.parse(request.body)
  const key = (request.params as { key: string }).key
  const host = hostFromRequest(request)

  try {
    const tenant = await resolveTenant(host)
    const result = await updateConfigUseCase.execute({
      resourceTenantId: tenant.id,
      key,
      value: body.value,
      actorId: request.user.sub,
      jwtTenantId: request.user.tenantId,
      role: request.user.role,
      requestId: request.id,
    })

    return reply.status(200).send(updateConfigResponseSchema.parse(result))
  } catch (error) {
    if (error instanceof ConfigAuthorizeDeniedError) {
      return reply.status(denialStatus(error.code)).send(
        buildError({
          code: error.code,
          message: error.code === forbidden ? 'Acesso negado.' : 'Recurso não encontrado.',
          request_id: request.id,
        }),
      )
    }
    if (error instanceof UnknownConfigKeyError || error instanceof ConfigNotFoundError) {
      return reply.status(404).send(
        buildError({
          code: not_found,
          message: 'Recurso não encontrado.',
          request_id: request.id,
        }),
      )
    }
    if (error instanceof InvalidConfigValueError) {
      return reply.status(400).send(
        buildError({
          code: validation,
          message: 'Valor de config inválido.',
          request_id: request.id,
        }),
      )
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function adminRoutes(app: FastifyInstance) {
  app.patch('/admin/config/:key', { onRequest: [verifyJWT] }, patchConfig)
  await registerModerationRoutes(app)
  await registerBanRoutes(app)
}
