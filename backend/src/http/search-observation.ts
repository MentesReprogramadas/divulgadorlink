import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@/env'
import { searchObservationDb } from '@/repositories/search-observations'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { analyticsSession } from '@/http/controllers/@Analytics/routes'
import { analyticsDay } from '@/domain/analytics/day'
import { canObserveSearch, normalizedSearchTerm, searchSessionKey } from '@/domain/search/search-observation'
import { associateSearchClick, recordSearchObservation } from '@/repositories/search-observations'
import { logDomainEvent } from '@/observability/logger'

function allowed(request: FastifyRequest) {
  const header = (name: string) => typeof request.headers[name] === 'string' ? request.headers[name] as string : undefined
  return canObserveSearch({ consent: request.cookies.tla_consent, userAgent: header('user-agent'), testTraffic: header('x-analytics-test'), dnt: header('dnt'), gpc: header('sec-gpc') })
}
async function actor(request: FastifyRequest, tenantId: string) {
  const prisma = searchObservationDb()
  const token = await readAccessUser(request)
  if (!token || token.tenantId !== tenantId) return null
  return prisma.user.findFirst({ where: { id: token.sub, tenantId }, select: { id: true, role: true, status: true } })
}
export async function observeSearch(request: FastifyRequest, reply: FastifyReply, input: { tenantId: string; query: string; outcome: 'SUCCESS' | 'FAILED' | 'GATED'; resultIds?: string[] }) {
  if (!allowed(request)) return null
  const term = normalizedSearchTerm(input.query)
  if (!term) return null
  try {
    const prisma = searchObservationDb()
    const viewer = await actor(request, input.tenantId)
    if (viewer?.role === 'ADMIN' || viewer?.status === 'BANNED') return null
    const now = new Date(), day = analyticsDay(now)
    const resultIds = [...new Set(input.resultIds ?? [])]
    const links = resultIds.length ? await prisma.link.findMany({ where: { tenantId: input.tenantId, id: { in: resultIds } }, select: { id: true, nicheId: true, networkId: true } }) : []
    if (links.length !== resultIds.length) return null
    // The HTTP search result is the authority; never accept result IDs from the visitor.
    return await recordSearchObservation(prisma, {
      tenantId: input.tenantId, term, outcome: input.outcome, now, day: new Date(day + 'T00:00:00Z'),
      sessionKey: searchSessionKey(input.tenantId, analyticsSession(request, reply), day, env.JWT_SECRET),
      resultIds: links.map(link => link.id), nicheIds: [...new Set(links.map(link => link.nicheId))], networkIds: [...new Set(links.map(link => link.networkId))],
    })
  } catch {
    logDomainEvent('search.observation_failed', { request_id: request.id, result: 'storage' })
    return null
  }
}
export async function observeSearchExit(request: FastifyRequest, input: { tenantId: string; linkId: string; ownerId: string | null; queryId: unknown }) {
  if (!allowed(request) || typeof input.queryId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.queryId)) return
  const session = request.cookies.analyticsSession
  if (!session || !/^[0-9a-f-]{36}$/i.test(session)) return
  try {
    const prisma = searchObservationDb()
    const viewer = await actor(request, input.tenantId)
    if (viewer?.role === 'ADMIN' || viewer?.status === 'BANNED' || viewer?.id === input.ownerId) return
    const now = new Date()
    // A previous day's observation can still receive its real exit for up to 24 hours.
    for (const day of [analyticsDay(now), analyticsDay(new Date(now.getTime() - 86400000))]) {
      await associateSearchClick(prisma, { ...input, queryId: input.queryId, now, sessionKey: searchSessionKey(input.tenantId, session, day, env.JWT_SECRET) })
    }
  } catch { logDomainEvent('search.exit_failed', { request_id: request.id, result: 'storage' }) }
}
