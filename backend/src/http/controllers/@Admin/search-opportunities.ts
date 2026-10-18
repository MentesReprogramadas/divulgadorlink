import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { searchObservationDb } from '@/repositories/search-observations'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { performanceRange } from '@/domain/analytics/performance'
import { searchOpportunities } from '@/repositories/search-observations'
import { buildError } from '@/http/errors'

const filters = z.object({ from: z.string().optional(), to: z.string().optional(), networkId: z.string().min(1).max(64).optional(), nicheId: z.string().min(1).max(64).optional(), opportunity: z.enum(['NO_RESULTS','LOW_INTERACTION']).optional(), page: z.coerce.number().int().min(1).max(10000).default(1) }).strict()
async function report(request: FastifyRequest, reply: FastifyReply) {
  reply.header('cache-control', 'private, no-store')
  const deny = (status: number, message: string) => reply.code(status).send(buildError({ code: status === 401 ? 'unauthenticated' : status === 400 ? 'validation' : 'forbidden', message, request_id: request.id }))
  const user = await readAccessUser(request)
  if (!user || user.typ !== 'access') return deny(401, 'Entre para continuar.')
  try {
    const prisma = searchObservationDb()
    const tenant = await resolveTenant(normalizeTenantHost(request.headers.host ?? ''))
    if (user.tenantId !== tenant.id) return deny(403, 'Acesso negado.')
    const account = await prisma.user.findFirst({ where: { id: user.sub, tenantId: tenant.id, status: 'ACTIVE', role: 'ADMIN' }, select: { id: true } })
    if (!account) return deny(403, 'Acesso negado.')
    const parsed = filters.safeParse(request.query)
    if (!parsed.success) return deny(400, 'Confira os filtros.')
    const input = parsed.data, now = new Date()
    let range: ReturnType<typeof performanceRange>
    try { range = performanceRange(input, now) } catch { return deny(400, 'Confira o perÃ­odo.') }
    if (range.days > 180) return deny(400, 'Escolha atÃ© 180 dias.')
    const [networks, niches] = await Promise.all([
      prisma.network.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.niche.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ])
    if ((input.networkId && !networks.some(row => row.id === input.networkId)) || (input.nicheId && !niches.some(row => row.id === input.nicheId))) return deny(400, 'Categoria indisponÃ­vel.')
    return { ...await searchOpportunities(prisma, { ...input, tenantId: tenant.id, start: range.start, end: range.end, now }), from: range.from, to: range.to, networks, niches }
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.code(404).send({ message: 'Recurso nÃ£o encontrado.' })
    throw error
  }
}
export async function registerSearchOpportunityRoutes(app: FastifyInstance) {
  app.get('/admin/search-opportunities', report)
}
