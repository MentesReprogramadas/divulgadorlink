import { Prisma } from '@prisma/client'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { linkMachine, transition } from '@/domain/state/transition'
import { buildError, business_rule, forbidden, not_found } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { getLinksRepository, InMemoryLinksRepository } from '@/repositories/links-repository'
import { ctr } from '@/use-cases/@Analytics/record-event'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const LIST_CAP = 40
const TOP_CAP = 8
const WINDOW_DAYS = 30
const PAID = ['PAID', 'PAID_LATE', 'REFUND_PENDING', 'REFUND_FAILED']

const querySchema = z.object({
  q: z.string().max(80).optional(),
})

type OfficeBody = {
  windowDays: number
  listCap: number
  metrics: {
    users: number
    bannedUsers: number
    links: number
    publishedLinks: number
    pendingLinks: number
    impressions: number
    clicks: number
    ctr: number
    paidCents: number
    paidOrders: number
  }
  topLinks: Array<{ id: string; name: string; status: string; impressions: number; clicks: number; ctr: number }>
  topPayers: Array<{ userId: string; name: string; email: string; status: string; paidCents: number; orders: number }>
  users: Array<{ id: string; name: string; email: string; status: string; role: string; links: number }>
  links: Array<{ id: string; name: string; status: string; url: string; ownerName: string; ownerEmail: string }>
}

function hostFromRequest(request: FastifyRequest): string {
  const raw = request.headers.host
  if (!raw) throw new ResourceNotFoundError()
  return raw.split(':')[0]!
}

function needleOf(raw: string | undefined): string | null {
  const trimmed = raw?.trim().slice(0, 80) ?? ''
  const cleaned = trimmed.replace(/[%_\\]/g, '')
  return cleaned.length > 0 ? `%${cleaned}%` : null
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const tenant = await resolveTenant(hostFromRequest(request))
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

function emptyOffice(): OfficeBody {
  return {
    windowDays: WINDOW_DAYS,
    listCap: LIST_CAP,
    metrics: {
      users: 0,
      bannedUsers: 0,
      links: 0,
      publishedLinks: 0,
      pendingLinks: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      paidCents: 0,
      paidOrders: 0,
    },
    topLinks: [],
    topPayers: [],
    users: [],
    links: [],
  }
}

function officeFromMemory(tenantId: string, q: string): OfficeBody {
  const repo = getLinksRepository()
  if (!(repo instanceof InMemoryLinksRepository)) return emptyOffice()
  const needle = q.trim().toLowerCase()
  const matches = (value: string | undefined) => !needle || (value ?? '').toLowerCase().includes(needle)
  const users = repo.users.filter((row) => row.tenantId === tenantId)
  const links = repo.links.filter((row) => row.tenantId === tenantId)
  const listedUsers = users.filter((row) => {
    const email = row.identifiers.find((item) => item.kind === 'EMAIL' && item.replacedAt === null)?.normalizedValue
    return matches(row.name) || matches(email)
  })
  const listedLinks = links.filter((row) => row.status !== 'DRAFT' && matches(row.name))
  return {
    ...emptyOffice(),
    metrics: {
      ...emptyOffice().metrics,
      users: users.length,
      bannedUsers: users.filter((row) => row.status === 'BANNED').length,
      links: links.length,
      publishedLinks: links.filter((row) => row.status === 'PUBLISHED').length,
      pendingLinks: links.filter((row) => row.status === 'PENDING_MODERATION').length,
    },
    users: listedUsers.slice(0, LIST_CAP).map((row) => ({
      id: row.id,
      name: row.name ?? '',
      email: row.identifiers.find((item) => item.kind === 'EMAIL' && item.replacedAt === null)?.normalizedValue ?? '',
      status: row.status,
      role: row.role ?? 'USER',
      links: links.filter((link) => link.ownerId === row.id).length,
    })),
    links: listedLinks.slice(0, LIST_CAP).map((row) => {
      const owner = users.find((user) => user.id === row.ownerId)
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        url: row.canonicalUrl,
        ownerName: owner?.name ?? '',
        ownerEmail: owner?.identifiers.find((item) => item.kind === 'EMAIL' && item.replacedAt === null)?.normalizedValue ?? '',
      }
    }),
  }
}

function countOf(rows: Array<{ status: string; n: number }>, status: string): number {
  return Number(rows.find((row) => row.status === status)?.n ?? 0)
}

async function officeFromDatabase(tenantId: string, needle: string | null): Promise<OfficeBody> {
  const userFilter = needle
    ? Prisma.sql`AND (u.name ILIKE ${needle} OR COALESCE(i."normalizedValue", '') ILIKE ${needle})`
    : Prisma.empty
  const linkFilter = needle
    ? Prisma.sql`AND (l.name ILIKE ${needle} OR COALESCE(u.name, '') ILIKE ${needle} OR COALESCE(i."normalizedValue", '') ILIKE ${needle})`
    : Prisma.empty
  const paidList = Prisma.join(PAID)

  const [userCounts, linkCounts, traffic, paid, topLinks, topPayers, users, links] = await Promise.all([
    prisma.$queryRaw<Array<{ status: string; n: number }>>`
      SELECT status::text AS status, COUNT(*)::int AS n
      FROM users
      WHERE "tenantId" = ${tenantId}
      GROUP BY status
    `,
    prisma.$queryRaw<Array<{ status: string; n: number }>>`
      SELECT status::text AS status, COUNT(*)::int AS n
      FROM links
      WHERE "tenantId" = ${tenantId}
      GROUP BY status
    `,
    prisma.$queryRaw<Array<{ kind: string; n: number }>>`
      SELECT kind, COUNT(*)::int AS n
      FROM analytics_events
      WHERE "tenantId" = ${tenantId}
        AND day >= (CURRENT_DATE - ${WINDOW_DAYS}::int)
      GROUP BY kind
    `,
    prisma.$queryRaw<Array<{ n: number; cents: number }>>`
      SELECT COUNT(*)::int AS n, COALESCE(SUM("amountCents"), 0)::int AS cents
      FROM orders
      WHERE "tenantId" = ${tenantId}
        AND status::text IN (${paidList})
    `,
    prisma.$queryRaw<Array<{ id: string; name: string; status: string; impressions: number; clicks: number }>>`
      SELECT l.id, l.name, l.status::text AS status,
        COUNT(*) FILTER (WHERE e.kind = 'IMPRESSION')::int AS impressions,
        COUNT(*) FILTER (WHERE e.kind = 'CLICK')::int AS clicks
      FROM analytics_events e
      JOIN links l ON l.id = e."linkId"
      WHERE e."tenantId" = ${tenantId}
        AND e.day >= (CURRENT_DATE - ${WINDOW_DAYS}::int)
      GROUP BY l.id, l.name, l.status
      ORDER BY clicks DESC, impressions DESC
      LIMIT ${TOP_CAP}
    `,
    prisma.$queryRaw<Array<{ userId: string; name: string; email: string; status: string; paidCents: number; orders: number }>>`
      SELECT u.id AS "userId", u.name, u.status::text AS status,
        COALESCE(i."normalizedValue", '') AS email,
        COALESCE(SUM(o."amountCents"), 0)::int AS "paidCents",
        COUNT(*)::int AS orders
      FROM orders o
      JOIN users u ON u.id = o."userId"
      LEFT JOIN LATERAL (
        SELECT "normalizedValue"
        FROM user_identifiers
        WHERE "userId" = u.id AND kind = 'EMAIL' AND "replacedAt" IS NULL
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) i ON true
      WHERE o."tenantId" = ${tenantId}
        AND o.status::text IN (${paidList})
      GROUP BY u.id, u.name, u.status, i."normalizedValue"
      ORDER BY "paidCents" DESC
      LIMIT ${TOP_CAP}
    `,
    prisma.$queryRaw<Array<{ id: string; name: string; email: string; status: string; role: string; links: number }>>`
      SELECT u.id, u.name, u.status::text AS status, u.role::text AS role,
        COALESCE(i."normalizedValue", '') AS email,
        (SELECT COUNT(*)::int FROM links l WHERE l."ownerId" = u.id AND l."tenantId" = u."tenantId") AS links
      FROM users u
      LEFT JOIN LATERAL (
        SELECT "normalizedValue"
        FROM user_identifiers
        WHERE "userId" = u.id AND kind = 'EMAIL' AND "replacedAt" IS NULL
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) i ON true
      WHERE u."tenantId" = ${tenantId}
        ${userFilter}
      ORDER BY u."createdAt" DESC
      LIMIT ${LIST_CAP}
    `,
    prisma.$queryRaw<Array<{ id: string; name: string; status: string; url: string; ownerName: string; ownerEmail: string }>>`
      SELECT l.id, l.name, l.status::text AS status, l."canonicalUrl" AS url,
        COALESCE(u.name, '') AS "ownerName",
        COALESCE(i."normalizedValue", '') AS "ownerEmail"
      FROM links l
      LEFT JOIN users u ON u.id = l."ownerId"
      LEFT JOIN LATERAL (
        SELECT "normalizedValue"
        FROM user_identifiers
        WHERE "userId" = u.id AND kind = 'EMAIL' AND "replacedAt" IS NULL
        ORDER BY "createdAt" DESC
        LIMIT 1
      ) i ON true
      WHERE l."tenantId" = ${tenantId}
        AND l.status <> 'DRAFT'
        ${linkFilter}
      ORDER BY l."updatedAt" DESC
      LIMIT ${LIST_CAP}
    `,
  ])

  const impressions = Number(traffic.find((row) => row.kind === 'IMPRESSION')?.n ?? 0)
  const clicks = Number(traffic.find((row) => row.kind === 'CLICK')?.n ?? 0)
  const paidRow = paid[0]
  return {
    windowDays: WINDOW_DAYS,
    listCap: LIST_CAP,
    metrics: {
      users: userCounts.reduce((sum, row) => sum + Number(row.n), 0),
      bannedUsers: countOf(userCounts, 'BANNED'),
      links: linkCounts.reduce((sum, row) => sum + Number(row.n), 0),
      publishedLinks: countOf(linkCounts, 'PUBLISHED'),
      pendingLinks: countOf(linkCounts, 'PENDING_MODERATION'),
      impressions,
      clicks,
      ctr: ctr(clicks, impressions),
      paidCents: Number(paidRow?.cents ?? 0),
      paidOrders: Number(paidRow?.n ?? 0),
    },
    topLinks: topLinks.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
      ctr: ctr(Number(row.clicks), Number(row.impressions)),
    })),
    topPayers: topPayers.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      status: row.status,
      paidCents: Number(row.paidCents),
      orders: Number(row.orders),
    })),
    users: users.map((row) => ({ ...row, links: Number(row.links) })),
    links,
  }
}

export async function getOffice(request: FastifyRequest, reply: FastifyReply) {
  const parsed = querySchema.safeParse(request.query)
  if (!parsed.success) {
    return reply.status(400).send(buildError({ code: 'validation', message: 'Dados inválidos.', request_id: request.id }))
  }
  try {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const q = parsed.data.q ?? ''
    const body = process.env.NODE_ENV === 'test'
      ? officeFromMemory(tenant.id, q)
      : await officeFromDatabase(tenant.id, needleOf(q))
    return reply.status(200).send(body)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function postWithdrawLink(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const linkId = (request.params as { id: string }).id
    const repo = getLinksRepository()
    const link = await repo.findLinkById(linkId)
    if (!link || link.tenantId !== tenant.id) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    if (link.status === 'UNAVAILABLE') {
      return reply.status(409).send(buildError({ code: business_rule, message: 'Este link já está fora do ar.', request_id: request.id }))
    }
    let next: typeof link.status
    try {
      next = transition(linkMachine, link.status, 'UNAVAILABLE')
    } catch {
      return reply.status(409).send(buildError({ code: business_rule, message: 'Este link não pode sair do ar.', request_id: request.id }))
    }
    const updated = await repo.updateLinkModeration(link.id, { status: next, occupiesSlot: false })
    if (!updated) {
      return reply.status(404).send(buildError({ code: not_found, message: 'Recurso não encontrado.', request_id: request.id }))
    }
    const promotionsCancelled = await repo.cancelActivePromotions(tenant.id, link.id)
    await getAuditLogsRepository().create({
      tenantId: tenant.id,
      actorId: request.user.sub,
      action: 'link.withdraw',
      entityType: 'Link',
      entityId: link.id,
      before: { status: link.status },
      after: { status: 'UNAVAILABLE', promotionsCancelled },
      requestId: request.id,
    })
    return reply.status(200).send({ status: 'UNAVAILABLE', promotionsCancelled })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    throw error
  }
}

export async function registerOfficeRoutes(app: FastifyInstance) {
  app.get('/admin/office', { onRequest: [verifyJWT] }, getOffice)
  app.post('/admin/links/:id/withdraw', { onRequest: [verifyJWT] }, postWithdrawLink)
}
