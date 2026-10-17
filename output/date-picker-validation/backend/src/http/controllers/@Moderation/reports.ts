import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { ReportError } from '@/domain/moderation/report'
import { getLinkReportsRepository } from '@/repositories/link-reports-repository'
import { submitLinkReport } from '@/use-cases/@Moderation/link-reports'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
const submission = z.object({ reason: z.string().min(1).max(50), comment: z.string().trim().max(500).optional() }).strict()
const decision = z.object({ status: z.enum(['IN_REVIEW', 'RESOLVED']), expectedVersion: z.number().int().min(1).max(2147483647), reason: z.string().trim().min(3).max(500) }).strict()
const queue = z.object({ status: z.enum(['RECEIVED', 'IN_REVIEW', 'RESOLVED']).optional(), kind: z.enum(['CONTENT', 'AVAILABILITY']).optional(), cursor: idSchema.optional(), limit: z.coerce.number().int().min(1).max(50).default(25) }).strict()

async function withActor(request: FastifyRequest, reply: FastifyReply, operation: (context: { tenantId: string; actorId: string }) => Promise<unknown>) {
  reply.header('cache-control', 'private, no-store')
  try {
    const actor = await readAccessUser(request)
    if (!actor || actor.typ !== 'access') return reply.code(401).send(buildError({ code: 'unauthenticated', message: 'Não autenticado.', request_id: request.id }))
    const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0]!)
    if (actor.tenantId !== tenant.id) return reply.code(403).send(buildError({ code: 'forbidden', message: 'Acesso negado.', request_id: request.id }))
    return await operation({ tenantId: tenant.id, actorId: actor.sub })
  } catch (error) {
    if (error instanceof ReportError || error instanceof ResourceNotFoundError) {
      const code = error instanceof ReportError ? error.code : 'NOT_FOUND'
      const status = { NOT_FOUND: 404, CONFLICT: 409, LIMITED: 429, INVALID: 400 }[code]
      if (status === 429) reply.header('retry-after', '86400')
      const errorCode = { NOT_FOUND: 'not_found', CONFLICT: 'conflict', LIMITED: 'rate_limited', INVALID: 'validation' } as const
      return reply.code(status).send(buildError({ code: errorCode[code], message: error.message, request_id: request.id }))
    }
    throw error
  }
}

export async function linkReportRoutes(app: FastifyInstance) {
  app.post('/links/:id/reports', (request, reply) => withActor(request, reply, async context => {
    const linkId = idSchema.parse((request.params as { id: string }).id)
    const report = await submitLinkReport({ ...context, linkId, ...submission.parse(request.body) }, getLinkReportsRepository())
    return reply.code(200).send({ report })
  }))
  app.get('/admin/reports', (request, reply) => withActor(request, reply, context => getLinkReportsRepository().list({ ...context, ...queue.parse(request.query) })))
  app.patch('/admin/reports/:id/decision', (request, reply) => withActor(request, reply, context => getLinkReportsRepository().decide({ ...context, reportId: idSchema.parse((request.params as { id: string }).id), ...decision.parse(request.body), requestId: request.id, now: new Date() })))
}
