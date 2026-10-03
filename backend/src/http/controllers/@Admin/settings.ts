import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { impressionsEnabled } from '@/domain/config/read-config'
import {
  buildError,
  forbidden,
  not_found,
  validation,
} from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { getConfigsRepository } from '@/repositories/configs-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import {
  ConfigAuthorizeDeniedError,
  ConfigNotFoundError,
  InvalidConfigValueError,
  UnknownConfigKeyError,
  UpdateAdminConfigUseCase,
} from '@/use-cases/@Admin/update-config'

const KEY = 'SHOW_IMPRESSIONS'

const bodySchema = z.object({ showImpressions: z.boolean() }).strict()

const updateConfigUseCase = new UpdateAdminConfigUseCase(
  getConfigsRepository(),
  getAuditLogsRepository(),
  process.env.NODE_ENV === 'test' ? undefined : prisma,
)

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) throw new ResourceNotFoundError()
  return raw.split(':')[0]!
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const tenant = await resolveTenant(hostFromRequest(request))
  if (request.user.tenantId !== tenant.id) {
    reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    return null
  }
  if (request.user.role !== 'ADMIN') {
    reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    return null
  }
  return tenant
}

async function readFlag(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const row = await getConfigsRepository().findByTenantAndKey(tenant.id, KEY)
    return reply.status(200).send({ showImpressions: impressionsEnabled(row?.value) })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

async function writeFlag(request: FastifyRequest, reply: FastifyReply) {
  const body = bodySchema.parse(request.body)
  const value = body.showImpressions ? '1' : '0'
  try {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const repo = getConfigsRepository()
    const existing = await repo.findByTenantAndKey(tenant.id, KEY)
    if (!existing) {
      await repo.create({ tenantId: tenant.id, key: KEY, value: '1' })
    }
    await updateConfigUseCase.execute({
      resourceTenantId: tenant.id,
      key: KEY,
      value,
      actorId: request.user.sub,
      jwtTenantId: request.user.tenantId,
      role: request.user.role,
      requestId: request.id,
    })
    return reply.status(200).send({ showImpressions: value === '1' })
  } catch (error) {
    if (error instanceof ConfigAuthorizeDeniedError) {
      const code = error.code === forbidden ? forbidden : not_found
      return reply.status(error.code === forbidden ? 403 : 404).send(
        buildError({
          code,
          message: error.code === forbidden ? 'Acesso negado.' : 'Recurso não encontrado.',
          request_id: request.id,
        }),
      )
    }
    if (error instanceof UnknownConfigKeyError || error instanceof ConfigNotFoundError) {
      return reply.status(404).send(
        buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }),
      )
    }
    if (error instanceof InvalidConfigValueError) {
      return reply.status(400).send(
        buildError({ code: validation, message: 'Valor de config inválido.', request_id: request.id }),
      )
    }
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get('/admin/settings/impressions', { onRequest: [verifyJWT] }, readFlag)
  app.patch('/admin/settings/impressions', { onRequest: [verifyJWT] }, writeFlag)
}
