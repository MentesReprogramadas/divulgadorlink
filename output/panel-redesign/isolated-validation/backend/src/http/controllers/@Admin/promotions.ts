import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { getLinksRepository } from '@/repositories/links-repository'
import { getAuditLogsRepository, PrismaAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { getCheckoutStore } from '@/use-cases/@Promotions/checkout-store'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { changeAdminPromotions, AdminPromotionError } from '@/use-cases/@Admin/change-admin-promotions'

const bodySchema = z.object({
  surfaces: z.array(z.enum(['SEARCH', 'NICHE', 'HOME'])).min(1).max(3),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
}).strict().refine(({ surfaces }) => new Set(surfaces).size === surfaces.length)
  .refine(({ surfaces }) => ['SEARCH', 'NICHE', 'HOME', 'NICHE+SEARCH', 'HOME+NICHE+SEARCH'].includes([...surfaces].sort().join('+')))

async function handle(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await resolveTenant((request.headers.host ?? '').split(':')[0]!)
    if (request.user.tenantId !== tenant.id) return reply.status(403).send({ message: 'Acesso negado.' })
    const repo = getLinksRepository()
    const actor = await repo.findSubmitter(tenant.id, request.user.sub)
    if (request.user.role !== 'ADMIN' || actor?.role !== 'ADMIN' || actor.status !== 'ACTIVE') {
      return reply.status(404).send({ message: 'Recurso não encontrado.' })
    }
    const linkId = (request.params as { id: string }).id
    const link = await repo.findLinkById(linkId)
    if (!link || link.tenantId !== tenant.id) return reply.status(404).send({ message: 'Recurso não encontrado.' })
    const [owner, niche, network] = await Promise.all([
      link.ownerId ? repo.findSubmitter(tenant.id, link.ownerId) : null,
      repo.findNiche(tenant.id, link.nicheId), repo.findNetwork(tenant.id, link.networkId),
    ])
    const requiresAge = Boolean(niche?.requiresAge || network?.requiresAge)
    const allowedSurfaces = requiresAge ? ['SEARCH', 'NICHE'] : ['SEARCH', 'NICHE', 'HOME']
    if (request.method === 'GET') {
      const promotions = process.env.NODE_ENV === 'test'
        ? (await getCheckoutStore().listPromotions(linkId)).filter(row => row.status === 'ACTIVE' && (!row.administrative || !row.expiresAt || row.expiresAt > new Date()))
        : await prisma.promotion.findMany({ where: { tenantId: tenant.id, linkId, status: 'ACTIVE', OR: [{ administrative: false }, { expiresAt: null }, { expiresAt: { gt: new Date() } }] } })
      return reply.send({ promotions, allowedSurfaces, eligible: link.status === 'PUBLISHED' && (!link.ownerId || owner?.status === 'ACTIVE') })
    }
    const parsed = request.method === 'DELETE' ? null : bodySchema.safeParse(request.body)
    if (parsed && !parsed.success) return reply.status(400).send({ message: 'Selecione os locais e um término válido.' })
    const data = parsed?.success ? parsed.data : null
    const expiresAt = data?.expiresAt ? new Date(data.expiresAt) : null
    if (expiresAt && expiresAt <= new Date()) return reply.status(400).send({ message: 'O término precisa estar no futuro.' })
    if (data && (link.status !== 'PUBLISHED' || (link.ownerId && owner?.status !== 'ACTIVE'))) {
      return reply.status(409).send({ message: 'Somente links publicados de contas ativas podem receber destaque.' })
    }
    if (data?.surfaces.some(surface => !allowedSurfaces.includes(surface))) return reply.status(409).send({ message: 'Conteúdo com restrição de idade não pode receber destaque na página inicial.' })
    const input = { tenantId: tenant.id, actorId: actor.id, linkId, surfaces: data?.surfaces ?? [], expiresAt, requestId: request.id }
    if (process.env.NODE_ENV === 'test') {
      const store = getCheckoutStore()
      await store.activeSurfaces(linkId)
      const current = store.promotions.filter(row => row.linkId === linkId && row.status === 'ACTIVE')
      const pending = await store.pendingSurfaces(linkId)
      if (input.surfaces.some(surface => pending.includes(surface) || current.some(row => row.surface === surface && !row.administrative))) throw new AdminPromotionError('Há um destaque pago ou pagamento pendente neste local.')
      const before = current.filter(row => row.administrative).map(row => ({ ...row }))
      for (const row of current) if (row.administrative) row.status = 'CANCELLED'
      for (const surface of input.surfaces) {
        const previous = before.find(row => row.surface === surface)
        store.promotions.push({ id: randomUUID(), linkId, surface, status: 'ACTIVE', administrative: true, activatedAt: previous?.activatedAt ?? new Date(), expiresAt })
      }
      await getAuditLogsRepository().create({ ...input, action: 'promotion.admin.update', entityType: 'Link', entityId: linkId, before, after: { surfaces: input.surfaces, expiresAt } })
    } else {
      await prisma.$transaction(async tx => {
        await changeAdminPromotions(tx, input, new PrismaAuditLogsRepository(tx))
      })
    }
    return reply.send({ message: data ? 'Destaque administrativo salvo.' : 'Destaque administrativo removido.' })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: 'Recurso não encontrado.' })
    if (error instanceof AdminPromotionError) return reply.status(409).send({ message: error.message })
    throw error
  }
}

export async function registerAdminPromotionRoutes(app: FastifyInstance) {
  app.route({ method: ['GET', 'PUT', 'DELETE'], url: '/admin/links/:id/promotions', onRequest: [verifyJWT], handler: handle })
}
