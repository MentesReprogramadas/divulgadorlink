import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { buildError } from '@/http/errors'
import { RelatedCursorError } from '@/domain/catalog/related-links'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { readRelatedLinks } from '@/repositories/related-links-repository'

let testDb: PrismaClient | null = null
export function setRelatedLinksDbForTest(db: PrismaClient | null): void { if (process.env.NODE_ENV === 'test') testDb = db }
export async function relatedLinksRoutes(app: FastifyInstance) {
  app.get('/links/:id/related', async (request, reply) => {
    reply.header('cache-control', 'private, no-store')
    try {
      const { id } = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/) }).parse(request.params)
      const { cursor } = z.object({ cursor: z.string().min(1).max(2048).optional() }).strict().parse(request.query)
      const tenant = await resolveTenant(normalizeTenantHost(request.headers.host ?? ''))
      const age = request.cookies.age === 'yes' ? 'yes' : request.cookies.age === 'no' ? 'no' : 'unknown'
      const page = await readRelatedLinks(testDb ?? prisma, { tenantId: tenant.id, linkId: id, cursor, age, secret: env.JWT_SECRET })
      if (!page) throw new ResourceNotFoundError()
      return page
    } catch (error) {
      if (error instanceof RelatedCursorError) return reply.code(400).send(buildError({ code: 'validation', message: 'Cursor inválido. Atualize as sugestões.', request_id: request.id }))
      if (error instanceof ResourceNotFoundError) return reply.code(404).send(buildError({ code: 'not_found', message: 'Recurso não encontrado.', request_id: request.id }))
      throw error
    }
  })
}
