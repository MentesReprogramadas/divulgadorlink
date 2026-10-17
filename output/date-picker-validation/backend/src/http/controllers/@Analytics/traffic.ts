import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { pathTemplate, utmToken } from '@/domain/analytics/site-traffic'
import { buildError, not_found, rate_limited } from '@/http/errors'
import { resolveTenant } from '@/http/tenant'
import { getSiteTrafficRepository } from '@/repositories/site-traffic-repository'
import { saoPauloDay } from '@/use-cases/@Acquisition/record-funnel'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { analyticsSession } from './routes'

const WINDOW_MS = 60 * 60 * 1000
const VISIT_LIMIT = 300
const CONSENT_LIMIT = 10
const attempts = new Map<string, number[]>()

const visitBody = z.object({
  path: z.string().min(1).max(200),
  entry: z.boolean(),
  source: z.string().max(200).optional(),
  medium: z.string().max(200).optional(),
  campaign: z.string().max(200).optional(),
}).strict()

const consentBody = z.object({ choice: z.enum(['marketing', 'denied']) }).strict()

export function resetTrafficLimitForTest(): void {
  attempts.clear()
}

function limited(key: string, cap: number, now = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS)
  if (recent.length >= cap) {
    attempts.set(key, recent)
    return true
  }
  recent.push(now)
  attempts.set(key, recent)
  if (attempts.size > 50_000) attempts.clear()
  return false
}

async function tenantOf(request: FastifyRequest): Promise<string | null> {
  const host = request.headers.host?.split(':')[0]
  if (!host) return null
  try {
    return (await resolveTenant(host)).id
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return null
    throw error
  }
}

async function postVisit(request: FastifyRequest, reply: FastifyReply) {
  const body = visitBody.parse(request.body)
  const tenantId = await tenantOf(request)
  if (!tenantId) return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  const path = pathTemplate(body.path)
  if (!path) return reply.status(204).send()
  const session = analyticsSession(request, reply)
  if (limited(`visit:${session}`, VISIT_LIMIT)) {
    return reply.status(429).send(buildError({ code: rate_limited, message: 'Muitas tentativas.', request_id: request.id }))
  }
  await getSiteTrafficRepository().recordVisit({
    tenantId,
    day: saoPauloDay(),
    path,
    source: utmToken(body.source),
    medium: utmToken(body.medium),
    campaign: utmToken(body.campaign),
    entry: body.entry,
  })
  return reply.status(204).send()
}

async function postConsent(request: FastifyRequest, reply: FastifyReply) {
  const body = consentBody.parse(request.body)
  const tenantId = await tenantOf(request)
  if (!tenantId) return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
  const session = analyticsSession(request, reply)
  if (limited(`consent:${session}`, CONSENT_LIMIT)) {
    return reply.status(429).send(buildError({ code: rate_limited, message: 'Muitas tentativas.', request_id: request.id }))
  }
  await getSiteTrafficRepository().recordConsent({ tenantId, day: saoPauloDay(), choice: body.choice })
  return reply.status(204).send()
}

export async function registerTrafficRoutes(app: FastifyInstance) {
  app.post('/analytics/visits', postVisit)
  app.post('/analytics/consent', postConsent)
}
