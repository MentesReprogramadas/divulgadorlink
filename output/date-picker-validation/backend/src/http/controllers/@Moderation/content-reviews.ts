import { buildError } from '@/http/errors'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z, ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { publicContentValidationPorts, type PublicContentValidationPorts } from '@/use-cases/public-content-validation-ports'
import { appealContentReview, decideContentReview, listContentReviews, ContentReviewError, type ReviewActor } from '@/use-cases/@Moderation/review-public-content'
let testDb: PrismaClient | null = null, testPorts: PublicContentValidationPorts | null = null
export function setContentReviewsForTest(db: PrismaClient | null, ports: PublicContentValidationPorts | null = null) { if (process.env.NODE_ENV === 'test') { testDb = db; testPorts = ports } }
async function run(q: FastifyRequest, r: FastifyReply, work: (db: PrismaClient, actor: ReviewActor, ports: PublicContentValidationPorts) => Promise<unknown>) {
  r.header('cache-control', 'private, no-store')
  try {
    const user = await readAccessUser(q)
    if (!user || user.typ !== 'access') throw new ContentReviewError(401, 'Entre na sua conta.')
    const host = normalizeTenantHost(q.headers.host ?? ''), tenant = await resolveTenant(host)
    if (user.tenantId !== tenant.id) throw new ContentReviewError(403, 'Acesso negado.')
    return await work(testDb ?? prisma, { tenantId: tenant.id, ownerId: user.sub }, testPorts ?? publicContentValidationPorts(host))
  } catch (error) {
    const status = error instanceof ContentReviewError ? error.status : error instanceof ZodError ? 400 : error instanceof ResourceNotFoundError ? 404 : error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 500
    return r.code(status).send(buildError({ code: status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : status === 404 ? 'not_found' : status === 409 ? 'conflict' : status >= 500 ? 'provider_error' : 'validation', message: status === 500 ? 'Não foi possível concluir a revisão.' : error instanceof ZodError ? 'Confira os campos obrigatórios e o tamanho do texto.' : error instanceof Error ? error.message : 'Confira os dados.', request_id: q.id }))
  }
}
const id = z.object({ id: z.string().uuid() })
export async function contentReviewRoutes(app: FastifyInstance) {
  app.get('/admin/content-reviews', (q, r) => run(q, r, (db, actor) => listContentReviews(db, actor, z.object({ kind: z.enum(['PROFILE', 'REDIRECT']) }).strict().parse(q.query).kind)))
  app.post('/admin/content-reviews/:id/decision', (q, r) => run(q, r, (db, actor, ports) => { const body = z.object({ decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().max(500).optional() }).strict().parse(q.body); return decideContentReview(db, actor, id.parse(q.params).id, body.decision, body.reason, ports) }))
  app.post('/me/content-reviews/:id/appeal', (q, r) => run(q, r, (db, actor) => appealContentReview(db, actor, id.parse(q.params).id, z.object({ text: z.string().trim().min(1).max(2000) }).strict().parse(q.body).text)))
}
