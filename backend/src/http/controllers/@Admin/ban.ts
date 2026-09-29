import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { authorize } from '@/http/authorize'
import { buildError, business_rule, forbidden, not_found } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getLinksRepository } from '@/repositories/links-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const banBodySchema = z.object({ reason: z.string().optional() }).strict()

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) throw new ResourceNotFoundError()
  return raw.split(':')[0]!
}

export async function postBanAccount(request: FastifyRequest, reply: FastifyReply) {
  const parsed = banBodySchema.safeParse(request.body ?? {})
  if (!parsed.success) {
    return reply.status(400).send(
      buildError({ code: 'validation', message: 'Dados inválidos.', request_id: request.id, issues: parsed.error.format() }),
    )
  }

  try {
    const tenant = await resolveTenant(hostFromRequest(request))
    const userId = (request.params as { id: string }).id
    const repo = getLinksRepository()
    const user = await repo.findSubmitter(tenant.id, userId)
    if (!user) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }

    const role = request.user.role === 'ADMIN' ? 'ADMIN' : 'USER'
    if (request.user.tenantId !== tenant.id) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }
    if (role !== 'ADMIN') {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }

    if (!authorize({
      actorId: request.user.sub,
      tenantId: request.user.tenantId,
      ownerId: 'ban',
      resourceTenantId: tenant.id,
      role: 'ADMIN',
      action: 'account.ban',
    })) {
      return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    }

    const result = await repo.applyBan({
      userId,
      tenantId: tenant.id,
      actorId: request.user.sub,
      requestId: request.id,
      reason: parsed.data.reason,
    })
    if (!result) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    return reply.status(200).send({ userStatus: result.userStatus, refunds: result.refunds })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function registerBanRoutes(app: FastifyInstance) {
  app.post('/admin/users/:id/ban', { onRequest: [verifyJWT] }, postBanAccount)
}

export async function postGuardedWrite(
  request: FastifyRequest,
  reply: FastifyReply,
  action: 'link.update' | 'account.email' | 'account.phone' | 'promotion.buy',
) {
  const tenant = await resolveTenant(hostFromRequest(request))
  if (request.user.tenantId !== tenant.id) {
    return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
  }
  const repo = getLinksRepository()
  const user = await repo.findSubmitter(tenant.id, request.user.sub)
  if (!user) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  if (user.status === 'BANNED') {
    return reply.status(403).send(
      buildError({ code: business_rule, message: 'Conta não pode alterar o catálogo.', request_id: request.id }),
    )
  }

  if (action === 'link.update' || action === 'promotion.buy') {
    const linkId = (request.params as { id?: string }).id ?? (request.body as { linkId?: string } | undefined)?.linkId
    if (!linkId) {
      return reply.status(400).send(buildError({ code: 'validation', message: 'Dados inválidos.', request_id: request.id }))
    }
    const link = await repo.findLinkById(linkId)
    if (!link || link.tenantId !== tenant.id || link.ownerId !== user.id) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
  }

  return reply.status(409).send(
    buildError({
      code: business_rule,
      message: 'Operação recusada antes da cobrança ou da troca do identificador.',
      request_id: request.id,
    }),
  )
}
