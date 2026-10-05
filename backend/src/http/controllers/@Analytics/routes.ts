import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '@/env'
import { readSurface, type AnalyticsOrigin } from '@/domain/analytics/surface-token'
import { buildError, forbidden, not_found, rate_limited, validation } from '@/http/errors'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { getAnalyticsRepository } from '@/repositories/analytics-repository'
import { getLinksRepository } from '@/repositories/links-repository'
import { persistAnalyticsEvent, readAnalytics } from '@/use-cases/@Analytics/persist-event'
import { publicLinkView } from '@/http/public-link-view'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const IMPRESSION_LIMIT = 30
const WINDOW_MS = 60 * 60 * 1000
const impressionAttempts = new Map<string, number[]>()

const impressionBody = z.object({
  linkId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  surfaceToken: z.string().min(1).max(512),
}).strict()

const statsQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export function resetImpressionLimitForTest(): void {
  impressionAttempts.clear()
}

function limited(key: string, now = Date.now()): boolean {
  const recent = (impressionAttempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS)
  if (recent.length >= IMPRESSION_LIMIT) {
    impressionAttempts.set(key, recent)
    return true
  }
  recent.push(now)
  impressionAttempts.set(key, recent)
  return false
}

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) throw new ResourceNotFoundError()
  return raw.split(':')[0]!
}

export function analyticsSession(request: FastifyRequest, reply: FastifyReply): string {
  const current = request.cookies.analyticsSession
  if (typeof current === 'string' && /^[0-9a-f-]{36}$/i.test(current)) return current
  const id = randomUUID()
  reply.setCookie('analyticsSession', id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  })
  return id
}

export async function viewerForLink(request: FastifyRequest, link: { ownerId: string | null; tenantId: string }): Promise<'OWNER' | 'ADMIN' | 'VISITOR'> {
  const user = await readAccessUser(request)
  if (!user || user.typ !== 'access') return 'VISITOR'
  if (user.tenantId !== link.tenantId) return 'VISITOR'
  if (user.role === 'ADMIN') return 'ADMIN'
  if (user.sub === link.ownerId) return 'OWNER'
  return 'VISITOR'
}

async function postImpression(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = analyticsSession(request, reply)
  const body = impressionBody.parse(request.body)
  let tenantId: string
  try {
    tenantId = (await resolveTenant(hostFromRequest(request))).id
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
  const origin = readSurface(tenantId, body.linkId, body.surfaceToken, env.JWT_SECRET)
  if (!origin) {
    return reply.status(400).send(buildError({ code: validation, message: 'Superfície inválida.', request_id: request.id }))
  }
  const link = await getLinksRepository().findLinkById(body.linkId)
  if (!link || link.tenantId !== tenantId || !(await publicLinkView(link)).visible) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  if (limited(sessionId)) {
    return reply.status(429).send(buildError({ code: rate_limited, message: 'Muitas tentativas.', request_id: request.id }))
  }
  const result = await persistAnalyticsEvent({
    viewer: await viewerForLink(request, link),
    origin,
    tenantId,
    linkId: link.id,
    sessionId,
    kind: 'IMPRESSION',
    now: new Date(),
    requestId: request.id,
    repository: getAnalyticsRepository(),
  })
  return reply.status(result.counted ? 201 : 200).send({ counted: result.counted })
}

export async function recordClick(input: {
  request: FastifyRequest
  reply: FastifyReply
  link: { id: string; tenantId: string; ownerId: string | null }
  origin: AnalyticsOrigin
}): Promise<void> {
  await persistAnalyticsEvent({
    viewer: await viewerForLink(input.request, input.link),
    origin: input.origin,
    tenantId: input.link.tenantId,
    linkId: input.link.id,
    sessionId: analyticsSession(input.request, input.reply),
    kind: 'CLICK',
    now: new Date(),
    requestId: input.request.id,
    repository: getAnalyticsRepository(),
  })
}

async function getLinkStats(request: FastifyRequest, reply: FastifyReply) {
  const user = await readAccessUser(request)
  if (!user || user.typ !== 'access') {
    return reply.status(401).send(buildError({ code: 'unauthenticated', message: 'Não autenticado.', request_id: request.id }))
  }
  const linkId = (request.params as { linkId: string }).linkId
  let tenantId: string
  try {
    tenantId = (await resolveTenant(hostFromRequest(request))).id
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    throw error
  }
  if (user.tenantId !== tenantId) {
    return reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
  }
  const link = await getLinksRepository().findLinkById(linkId)
  if (!link || link.tenantId !== tenantId) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  if (user.role !== 'ADMIN' && user.sub !== link.ownerId) {
    return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  }
  const query = statsQuery.parse(request.query)
  const stats = await readAnalytics({
    tenantId,
    linkId: link.id,
    from: query.from,
    to: query.to,
    repository: getAnalyticsRepository(),
  })
  return reply.status(200).send({
    linkId: stats.linkId,
    tenantId: stats.tenantId,
    from: stats.from,
    to: stats.to,
    impressions: stats.impressions,
    clicks: stats.clicks,
    ctr: stats.ctr,
  })
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.post('/analytics/impressions', postImpression)
  app.get('/analytics/links/:linkId', getLinkStats)
}
