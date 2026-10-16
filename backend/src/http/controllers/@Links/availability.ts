import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { getLinkAvailabilityRepository } from '@/repositories/link-availability-repository'
import { probeAvailability } from '@/adapters/http/availability-probe'
import { AvailabilityError, proposeUrl, decideUrl, type AvailabilityActor, type UrlProbe } from '@/use-cases/@Links/link-availability'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
const proposal = z.object({ canonicalUrl: z.string().trim().min(1).max(2048), expectedVersion: z.number().int().positive().max(2147483647) }).strict()
const decision = z.object({ decision: z.enum(['APPROVE', 'REJECT']), expectedVersion: z.number().int().positive().max(2147483647), reason: z.string().trim().min(3).max(500) }).strict()
let testProbe: UrlProbe | null = null
export function setAvailabilityProbeForTest(value: UrlProbe | null): void { if (process.env.NODE_ENV === 'test') testProbe = value }
async function withActor(request: FastifyRequest, reply: FastifyReply, operation: (context: AvailabilityActor) => Promise<unknown>) {
  reply.header('cache-control', 'private, no-store')
  try {
    const user = await readAccessUser(request)
    if (!user || user.typ !== 'access') return reply.code(401).send(buildError({ code: 'unauthenticated', message: 'Não autenticado.', request_id: request.id }))
    const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0]!)
    if (user.tenantId !== tenant.id) return reply.code(403).send(buildError({ code: 'forbidden', message: 'Acesso negado.', request_id: request.id }))
    return await operation({ tenantId: tenant.id, actorId: user.sub })
  } catch (error) {
    const conflict = error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)
    if (error instanceof AvailabilityError || error instanceof ResourceNotFoundError || conflict) {
      const code = conflict ? 'CONFLICT' : error instanceof AvailabilityError ? error.code : 'NOT_FOUND'
      const status = { NOT_FOUND: 404, CONFLICT: 409, INVALID: 400 }[code]
      const errorCode = { NOT_FOUND: 'not_found', CONFLICT: 'conflict', INVALID: 'validation' } as const
      return reply.code(status).send(buildError({ code: errorCode[code], message: conflict ? 'A operação concorreu com outra atualização. Recarregue e tente novamente.' : (error as Error).message, request_id: request.id }))
    }
    throw error
  }
}
export async function availabilityRoutes(app: FastifyInstance) {
  app.get('/links/:id/availability', (request, reply) => withActor(request, reply, context => getLinkAvailabilityRepository().read({ ...context, linkId: id.parse((request.params as { id: string }).id) })))
  app.post('/links/:id/url-proposals', (request, reply) => withActor(request, reply, context => proposeUrl({ ...context, linkId: id.parse((request.params as { id: string }).id), ...proposal.parse(request.body) }, getLinkAvailabilityRepository(), testProbe ?? probeAvailability)))
  app.get('/admin/url-proposals', (request, reply) => withActor(request, reply, context => getLinkAvailabilityRepository().pending({ ...context, ...z.object({ cursor: id.optional() }).strict().parse(request.query) })))
  app.patch('/admin/url-proposals/:id/decision', (request, reply) => withActor(request, reply, context => decideUrl({ ...context, revisionId: id.parse((request.params as { id: string }).id), ...decision.parse(request.body), requestId: request.id, now: new Date() }, getLinkAvailabilityRepository(), testProbe ?? probeAvailability)))
}
