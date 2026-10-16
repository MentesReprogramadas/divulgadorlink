import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { getPromotionPerformanceRepository } from '@/repositories/promotion-performance-repository'
import { promotionPerformance } from '@/use-cases/@Analytics/promotion-performance'
import { performanceRange } from '@/domain/analytics/performance'

const querySchema = z.object({ from: z.string().optional(), to: z.string().optional(), promotionId: z.string().min(1).max(100).optional() }).strict()
export async function registerPerformanceRoutes(app: FastifyInstance) {
  app.get('/analytics/links/:linkId/performance', async (request, reply) => {
    reply.header('cache-control', 'private, no-store')
    const actor = await readAccessUser(request)
    if (!actor || actor.typ !== 'access') return reply.code(401).send(buildError({ code: 'unauthenticated', message: 'Não autenticado.', request_id: request.id }))
    let tenant
    try { tenant = await resolveTenant((request.headers.host ?? '').split(':')[0]!) }
    catch (error) {
      if (error instanceof ResourceNotFoundError) return reply.code(404).send(buildError({ code: 'not_found', message: 'Recurso não encontrado.', request_id: request.id }))
      throw error
    }
    if (actor.tenantId !== tenant.id) return reply.code(403).send(buildError({ code: 'forbidden', message: 'Acesso negado.', request_id: request.id }))
    const query = querySchema.parse(request.query)
    const now = new Date()
    try { performanceRange(query, now) }
    catch (error) { return reply.code(400).send(buildError({ code: 'validation', message: error instanceof Error ? error.message : 'Período inválido.', request_id: request.id })) }
    const result = await promotionPerformance({ tenantId: tenant.id, linkId: (request.params as { linkId: string }).linkId, actorId: actor.sub, ...query }, getPromotionPerformanceRepository(), now)
    if (!result) return reply.code(404).send(buildError({ code: 'not_found', message: 'Recurso não encontrado.', request_id: request.id }))
    return result
  })
}
