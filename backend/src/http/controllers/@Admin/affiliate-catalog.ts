import { searchCombinedAffiliateCatalog } from '@/use-cases/affiliates/combined-search'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z, ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { ProfileError } from '@/domain/profiles/profile'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { affiliateSessionSchema, AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { requireAffiliateAdmin } from './affiliate-access'
import { affiliateCatalogProvider, shopeeConfigSchema } from '@/domain/affiliates/shopee'
import { configureShopee, disconnectShopee, shopeeStatus, verifyShopee } from '@/use-cases/affiliates/shopee'
import { configureAffiliateSession, disconnectAffiliateSession, affiliateCatalogStatus, catalogCallbackSchema, catalogConfigSchema, configureAffiliateCatalog, connectAffiliateCatalog, disconnectAffiliateCatalog, finishAffiliateCatalogAuthorization, generateCatalogAffiliate, searchAffiliateCatalog } from '@/use-cases/@Affiliates/catalog'

async function run(request: FastifyRequest, reply: FastifyReply, work: (tenantId: string, actorId: string) => Promise<unknown>) {
  reply.header('cache-control', 'private, no-store')
  try {
    const tenant = await requireAffiliateAdmin(request, reply)
    if (!tenant) return
    return await work(tenant.id, request.user.sub)
  } catch (error) {
    if (error instanceof AffiliateCatalogError || error instanceof ProfileError) return reply.code(error.status).send({ message: error.message })
    if (error instanceof ResourceNotFoundError) return reply.code(404).send({ message: 'Recurso não encontrado.' })
    if (error instanceof ZodError) return reply.code(400).send({ message: 'Confira os dados da conexão ou da busca.' })
    request.log.error({ event: 'affiliate.catalog.failed' }, 'Falha no catálogo de afiliados')
    return reply.code(503).send({ message: 'Não foi possível concluir a operação do catálogo. Tente novamente.' })
  }
}

export async function registerAffiliateCatalogRoutes(app: FastifyInstance) {
  const base = '/admin/affiliates/catalog'
  app.get(`${base}/shopee`, (q,r) => run(q,r, tenantId => shopeeStatus(prisma,tenantId)))
  app.put(`${base}/shopee`, (q,r) => run(q,r, (tenantId,actorId) => configureShopee(prisma,tenantId,actorId,shopeeConfigSchema.parse(q.body))))
  app.delete(`${base}/shopee`, (q,r) => run(q,r, (tenantId,actorId) => disconnectShopee(prisma,tenantId,actorId)))
  app.post(`${base}/shopee/verify`, (q,r) => run(q,r, (tenantId,actorId) => verifyShopee(prisma,tenantId,actorId)))
  app.get(`${base}/status`, (q, r) => run(q, r, tenantId => affiliateCatalogStatus(prisma, tenantId)))
  app.post(`${base}/session`, (q, r) => run(q, r, (tenantId, actorId) => configureAffiliateSession(prisma, tenantId, actorId, affiliateSessionSchema.parse(q.body))))
  app.post(`${base}/session/disconnect`, (q, r) => run(q, r, (tenantId, actorId) => disconnectAffiliateSession(prisma, tenantId, actorId)))
  app.post(`${base}/config`, (q, r) => run(q, r, (tenantId, actorId) => configureAffiliateCatalog(prisma, tenantId, actorId, catalogConfigSchema.parse(q.body))))
  app.post(`${base}/connect`, (q, r) => run(q, r, (tenantId, actorId) => connectAffiliateCatalog(prisma, tenantId, actorId)))
  app.get(`${base}/callback`, (q, r) => run(q, r, async (tenantId, actorId) => {
    await finishAffiliateCatalogAuthorization(prisma, tenantId, actorId, catalogCallbackSchema.parse(q.query))
    return r.redirect('/admin/afiliados?catalog=connected')
  }))
  app.get(`${base}/search`, (q, r) => run(q, r, tenantId => {
    const query = z.object({ q: z.string().trim().min(2).max(120), provider: affiliateCatalogProvider.optional() }).strict().parse(q.query)
    return query.provider ? searchAffiliateCatalog(prisma, tenantId, query.q, { provider: query.provider }) : searchCombinedAffiliateCatalog(prisma, tenantId, query.q)
  }))
  app.post(`${base}/affiliate`, (q, r) => run(q, r, (tenantId, actorId) => generateCatalogAffiliate(prisma, tenantId, actorId, z.object({ productUrl: z.string().min(1).max(2048) }).strict().parse(q.body).productUrl)))
  app.post(`${base}/disconnect`, (q, r) => run(q, r, (tenantId, actorId) => disconnectAffiliateCatalog(prisma, tenantId, actorId)))
}
