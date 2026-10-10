import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { buildError, forbidden, not_found, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { getSiteTrafficRepository, type TrafficReport } from '@/repositories/site-traffic-repository'
import { getAcquisitionStore, saoPauloDay, type FunnelName } from '@/use-cases/@Acquisition/record-funnel'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const CAP = 12
const FUNNEL: FunnelName[] = ['CompleteRegistration', 'StartLinkSubmission', 'SubmitLink', 'LinkPublished']

const querySchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(30) })

type TrafficBody = TrafficReport & {
  windowDays: number
  from: string
  funnel: Array<{ name: FunnelName; count: number }>
  consentedRegistrations: Array<{ source: string; medium: string; campaign: string; registrations: number }>
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const host = request.headers.host?.split(':')[0]
  if (!host) throw new ResourceNotFoundError()
  const tenant = await resolveTenant(host)
  if (request.user.tenantId !== tenant.id) {
    reply.status(403).send(buildError({ code: forbidden, message: 'Acesso negado.', request_id: request.id }))
    return null
  }
  if (request.user.role !== 'ADMIN') {
    reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    return null
  }
  return tenant
}

function windowStart(days: number, now = new Date()): string {
  return saoPauloDay(new Date(now.getTime() - (days - 1) * 86_400_000))
}

async function funnelFromDatabase(tenantId: string, from: string) {
  const [funnel, campaigns] = await Promise.all([
    prisma.$queryRaw<Array<{ name: string; n: number }>>`
      SELECT name, COUNT(*)::int AS n
      FROM funnel_events
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ((${from}::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC')
      GROUP BY name
    `,
    prisma.$queryRaw<Array<{ source: string; medium: string; campaign: string; n: number }>>`
      SELECT source, medium, campaign, COUNT(*)::int AS n
      FROM acquisition_touches
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ((${from}::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC')
      GROUP BY source, medium, campaign
      ORDER BY n DESC
      LIMIT ${CAP}
    `,
  ])
  return {
    funnel: FUNNEL.map((name) => ({ name, count: Number(funnel.find((row) => row.name === name)?.n ?? 0) })),
    consentedRegistrations: campaigns.map((row) => ({
      source: row.source, medium: row.medium, campaign: row.campaign, registrations: Number(row.n),
    })),
  }
}

function funnelFromMemory(tenantId: string) {
  const events = getAcquisitionStore().events.filter((row) => row.tenantId === tenantId)
  return {
    funnel: FUNNEL.map((name) => ({ name, count: events.filter((row) => row.name === name).length })),
    consentedRegistrations: [],
  }
}

async function getTraffic(request: FastifyRequest, reply: FastifyReply) {
  const parsed = querySchema.safeParse(request.query)
  if (!parsed.success) {
    return reply.status(400).send(buildError({ code: validation, message: 'Dados inválidos.', request_id: request.id }))
  }
  try {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const from = windowStart(parsed.data.days)
    const [report, funnel] = await Promise.all([
      getSiteTrafficRepository().report({ tenantId: tenant.id, from, cap: CAP }),
      process.env.NODE_ENV === 'test' ? funnelFromMemory(tenant.id) : funnelFromDatabase(tenant.id, from),
    ])
    const body: TrafficBody = { windowDays: parsed.data.days, from, ...report, ...funnel }
    return reply.status(200).send(body)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: error.message })
    throw error
  }
}

export async function registerTrafficAdminRoutes(app: FastifyInstance) {
  app.get('/admin/traffic', { onRequest: [verifyJWT] }, getTraffic)
}
