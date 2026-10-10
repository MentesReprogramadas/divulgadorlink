import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { buildError, forbidden, not_found } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { retentionView } from '@/repositories/analytics-retention'
import { enqueueAnalyticsPurge } from '@/adapters/queues/enqueue-analytics-purge'
import { purgeBefore } from '@/use-cases/@Analytics/purge-old-events'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

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

function cutoff(now: Date): string {
  return purgeBefore(now).toISOString().slice(0, 10)
}

async function getRetention(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!await requireAdmin(request, reply)) return
    const now = new Date()
    const pending = await retentionView().pending(now)
    return reply.status(200).send({ before: cutoff(now), pending })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: error.message })
    throw error
  }
}

async function postRetention(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!await requireAdmin(request, reply)) return
    const now = new Date()
    await enqueueAnalyticsPurge()
    return reply.status(202).send({ before: cutoff(now), queued: true })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: error.message })
    throw error
  }
}

export async function registerRetentionRoutes(app: FastifyInstance) {
  app.get('/admin/retention', { onRequest: [verifyJWT] }, getRetention)
  app.post('/admin/retention', { onRequest: [verifyJWT] }, postRetention)
}
