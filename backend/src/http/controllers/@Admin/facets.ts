import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { parseSummary } from '@/domain/catalog/index-policy'
import { facetEligible, readSeoInventory } from '@/http/catalog-seo-inventory'
import { buildError, forbidden, not_found, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import {
  getLinksRepository,
  type NetworkRecord,
  type NicheRecord,
} from '@/repositories/links-repository'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const summaryBodySchema = z.object({ summary: z.string().nullable() }).strict()

type FacetKind = 'niche' | 'network'
type FacetRecord = NicheRecord | NetworkRecord

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) throw new ResourceNotFoundError()
  return raw.split(':')[0]!
}

function facetKind(value: string): FacetKind | null {
  if (value === 'niche' || value === 'network') return value
  return null
}

function substantiveCount(rows: Array<{ id: string; count: number }>, id: string): number {
  return rows.find((row) => row.id === id)?.count ?? 0
}

function toFacetRow(row: FacetRecord, count: number, indexable: boolean) {
  const requiresAge = row.requiresAge ?? false
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    requiresAge,
    isPublicFacet: row.isPublicFacet,
    summary: row.summary,
    substantiveCount: count,
    indexable,
  }
}

async function requireFacetAdmin(request: FastifyRequest, reply: FastifyReply) {
  const tenant = await resolveTenant(hostFromRequest(request))
  if (request.user.tenantId !== tenant.id) {
    reply.status(404).send(buildError({
      code: not_found,
      message: 'Recurso não encontrado.',
      request_id: request.id,
    }))
    return null
  }
  const actor = await getLinksRepository().findSubmitter(tenant.id, request.user.sub)
  if (request.user.role !== 'ADMIN' || actor?.role !== 'ADMIN' || actor.status !== 'ACTIVE') {
    reply.status(403).send(buildError({
      code: forbidden,
      message: 'Acesso negado.',
      request_id: request.id,
    }))
    return null
  }
  return tenant
}

function notFound(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(404).send(buildError({
    code: not_found,
    message: 'Recurso não encontrado.',
    request_id: request.id,
  }))
}

async function listFacets(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await requireFacetAdmin(request, reply)
    if (!tenant) return reply
    const repo = getLinksRepository()
    const [inventory, counts] = await Promise.all([
      readSeoInventory(tenant.id),
      repo.substantiveCounts(tenant.id),
    ])
    return reply.status(200).send({
      niches: inventory.niches.map((row) => toFacetRow(row, substantiveCount(counts.niches, row.id), facetEligible(inventory, 'niche', row))),
      networks: inventory.networks.map((row) => toFacetRow(row, substantiveCount(counts.networks, row.id), facetEligible(inventory, 'network', row))),
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

async function patchFacet(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await requireFacetAdmin(request, reply)
    if (!tenant) return reply
    const params = request.params as { kind: string; id: string }
    const kind = facetKind(params.kind)
    if (!kind) return notFound(request, reply)
    const body = summaryBodySchema.parse(request.body)
    const parsed = parseSummary(body.summary)
    if (!parsed.ok) {
      return reply.status(400).send(buildError({
        code: validation,
        message: 'Resumo inválido.',
        request_id: request.id,
      }))
    }
    const repo = getLinksRepository()
    const current = kind === 'niche'
      ? await repo.findNiche(tenant.id, params.id)
      : await repo.findNetwork(tenant.id, params.id)
    if (!current) return notFound(request, reply)
    const updated = await repo.updateFacetSummary({
      kind,
      id: params.id,
      tenantId: tenant.id,
      summary: parsed.summary,
    })
    if (!updated) return notFound(request, reply)
    await getAuditLogsRepository().create({
      tenantId: tenant.id,
      actorId: request.user.sub,
      action: 'facet.summary.update',
      entityType: kind === 'niche' ? 'Niche' : 'Network',
      entityId: params.id,
      before: { summary: current.summary },
      after: { summary: parsed.summary },
      requestId: request.id,
    })
    const [inventory, counts] = await Promise.all([readSeoInventory(tenant.id), repo.substantiveCounts(tenant.id)])
    const bucket = kind === 'niche' ? counts.niches : counts.networks
    return reply.status(200).send(toFacetRow(updated, substantiveCount(bucket, params.id), facetEligible(inventory, kind, updated)))
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function registerFacetRoutes(app: FastifyInstance) {
  app.get('/admin/facets', { onRequest: [verifyJWT] }, listFacets)
  app.patch('/admin/facets/:kind/:id', { onRequest: [verifyJWT] }, patchFacet)
}
