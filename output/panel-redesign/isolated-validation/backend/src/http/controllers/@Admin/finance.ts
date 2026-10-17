import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { buyersCsv, CONTRACT_FEES, filterRows, financeReport, ordersCsv, type FinanceFees, type FinanceFilters, type FinanceRow } from '@/domain/finance/report'
import { buildError, forbidden, not_found, validation } from '@/http/errors'
import { verifyJWT } from '@/http/middlewares/verify-jwt'
import { resolveTenant } from '@/http/tenant'
import { prisma } from '@/lib/prisma'
import { getAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { saoPauloDay } from '@/use-cases/@Acquisition/record-funnel'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'

const ROW_CAP = 20_000
const MAX_DAYS = 366
const DAY = /^\d{4}-\d{2}-\d{2}$/
const FEE_KEYS = { pixBp: 'FEE_PIX_BP', pixFixedCents: 'FEE_PIX_FIXED_CENTS', cardBp: 'FEE_CARD_BP', cardFixedCents: 'FEE_CARD_FIXED_CENTS' } as const
const UNSET_FEES: FinanceFees = { pixBp: 0, pixFixedCents: 0, cardBp: 0, cardFixedCents: 0 }

const querySchema = z.object({
  from: z.string().regex(DAY).optional(),
  to: z.string().regex(DAY).optional(),
  method: z.enum(['PIX', 'CARD']).optional(),
  product: z.enum(['SEARCH', 'NICHE', 'HOME', 'SEARCH_NICHE', 'SEARCH_NICHE_HOME']).optional(),
  durationDays: z.coerce.number().int().refine((value) => [7, 14, 28].includes(value)).optional(),
  renewal: z.enum(['new', 'renewal']).optional(),
  kind: z.enum(['buyers', 'orders']).optional(),
})

const feesSchema = z.object({
  pixBp: z.number().int().min(0).max(2_000),
  pixFixedCents: z.number().int().min(0).max(1_000),
  cardBp: z.number().int().min(0).max(2_000),
  cardFixedCents: z.number().int().min(0).max(1_000),
}).strict()

let testRows: FinanceRow[] = []
const testFees = new Map<string, FinanceFees>()

export function setFinanceRowsForTest(rows: FinanceRow[]): void {
  testRows = rows
  testFees.clear()
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

function spStart(day: string): Date {
  return new Date(`${day}T00:00:00-03:00`)
}

function filtersFrom(query: z.infer<typeof querySchema>): FinanceFilters | null {
  const to = query.to ?? saoPauloDay()
  const from = query.from ?? saoPauloDay(new Date(spStart(to).getTime() - 29 * 86_400_000 + 12 * 3_600_000))
  if (from > to) return null
  if ((spStart(to).getTime() - spStart(from).getTime()) / 86_400_000 > MAX_DAYS) return null
  return {
    from,
    to,
    ...(query.method ? { method: query.method } : {}),
    ...(query.product ? { product: query.product } : {}),
    ...(query.durationDays ? { durationDays: query.durationDays } : {}),
    ...(query.renewal ? { renewal: query.renewal } : {}),
  }
}

async function readFees(tenantId: string): Promise<FinanceFees> {
  if (process.env.NODE_ENV === 'test') return testFees.get(tenantId) ?? UNSET_FEES
  const rows = await prisma.config.findMany({ where: { tenantId, key: { in: Object.values(FEE_KEYS) } } })
  const value = (key: keyof typeof FEE_KEYS) => {
    const raw = rows.find((row) => row.key === FEE_KEYS[key])?.value
    if (raw == null || raw === '') return CONTRACT_FEES[key]
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : CONTRACT_FEES[key]
  }
  return { pixBp: value('pixBp'), pixFixedCents: value('pixFixedCents'), cardBp: value('cardBp'), cardFixedCents: value('cardFixedCents') }
}

async function readRows(tenantId: string, filters: FinanceFilters): Promise<FinanceRow[]> {
  if (process.env.NODE_ENV === 'test') return testRows
  const start = spStart(filters.from)
  const end = new Date(spStart(filters.to).getTime() + 86_400_000)
  const rows = await prisma.$queryRaw<Array<Omit<FinanceRow, 'status' | 'method'> & { status: string; method: string }>>`
    SELECT o.id, o."userId", COALESCE(u.name, '') AS "userName", COALESCE(i."normalizedValue", '') AS email,
      o.status::text AS status, o.method::text AS method, o."productCode"::text AS "productCode",
      o."durationDays", o."amountCents", o."savingsCents", o.renewal, o."createdAt", o."paidAt",
      first_paid."firstPaidAt",
      COALESCE(l."acquisitionSource", '') AS source,
      COALESCE(l."acquisitionMedium", '') AS medium,
      COALESCE(l."acquisitionCampaign", '') AS campaign
    FROM orders o
    LEFT JOIN users u ON u.id = o."userId"
    LEFT JOIN links l ON l.id = o."linkId"
    LEFT JOIN LATERAL (
      SELECT "normalizedValue" FROM user_identifiers
      WHERE "userId" = o."userId" AND kind = 'EMAIL' AND "replacedAt" IS NULL
      ORDER BY "createdAt" DESC LIMIT 1
    ) i ON true
    LEFT JOIN LATERAL (
      SELECT MIN(p."paidAt") AS "firstPaidAt" FROM orders p
      WHERE p."tenantId" = o."tenantId" AND p."userId" = o."userId" AND p.status = 'PAID'
    ) first_paid ON true
    WHERE o."tenantId" = ${tenantId}
      AND ((o."createdAt" >= ${start} AND o."createdAt" < ${end}) OR (o."paidAt" >= ${start} AND o."paidAt" < ${end}))
    ORDER BY o."createdAt" DESC
    LIMIT ${ROW_CAP + 1}
  `
  return rows.map((row) => ({
    ...row,
    status: row.status as FinanceRow['status'],
    method: row.method as FinanceRow['method'],
    durationDays: Number(row.durationDays),
    amountCents: Number(row.amountCents),
    savingsCents: Number(row.savingsCents),
  }))
}

async function load(request: FastifyRequest, reply: FastifyReply) {
  const parsed = querySchema.safeParse(request.query)
  const filters = parsed.success ? filtersFrom(parsed.data) : null
  if (!parsed.success || !filters) {
    reply.status(400).send(buildError({ code: validation, message: 'Período ou filtro inválido.', request_id: request.id }))
    return null
  }
  const tenant = await requireAdmin(request, reply)
  if (!tenant) return null
  const [rows, fees] = await Promise.all([readRows(tenant.id, filters), readFees(tenant.id)])
  const truncated = rows.length > ROW_CAP
  return { tenant, filters, fees, rows: truncated ? rows.slice(0, ROW_CAP) : rows, truncated, kind: parsed.data.kind ?? 'buyers' }
}

async function getFinance(request: FastifyRequest, reply: FastifyReply) {
  try {
    const loaded = await load(request, reply)
    if (!loaded) return
    const report = financeReport(loaded.rows, loaded.fees, loaded.filters)
    return reply.status(200).send({ ...report, buyers: report.buyers.slice(0, 100), buyersTotal: report.buyers.length, truncated: loaded.truncated })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: error.message })
    throw error
  }
}

async function getFinanceExport(request: FastifyRequest, reply: FastifyReply) {
  try {
    const loaded = await load(request, reply)
    if (!loaded) return
    const csv = loaded.kind === 'orders'
      ? ordersCsv(filterRows(loaded.rows, loaded.filters), loaded.fees)
      : buyersCsv(financeReport(loaded.rows, loaded.fees, loaded.filters).buyers)
    await getAuditLogsRepository().create({
      tenantId: loaded.tenant.id,
      actorId: request.user.sub,
      action: 'finance.export',
      entityType: 'Finance',
      entityId: loaded.kind,
      before: {},
      after: { ...loaded.filters },
      requestId: request.id,
    })
    return reply
      .status(200)
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${loaded.kind}-${loaded.filters.from}-${loaded.filters.to}.csv"`)
      .header('cache-control', 'no-store')
      .send(`\uFEFF${csv}`)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: error.message })
    throw error
  }
}

async function getFees(request: FastifyRequest, reply: FastifyReply) {
  try {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    return reply.status(200).send(await readFees(tenant.id))
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: error.message })
    throw error
  }
}

async function putFees(request: FastifyRequest, reply: FastifyReply) {
  const parsed = feesSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send(buildError({ code: validation, message: 'Taxa inválida.', request_id: request.id }))
  }
  try {
    const tenant = await requireAdmin(request, reply)
    if (!tenant) return
    const before = await readFees(tenant.id)
    if (process.env.NODE_ENV === 'test') {
      testFees.set(tenant.id, parsed.data)
    } else {
      await prisma.$transaction((Object.keys(FEE_KEYS) as Array<keyof typeof FEE_KEYS>).map((field) => prisma.config.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: FEE_KEYS[field] } },
        create: { tenantId: tenant.id, key: FEE_KEYS[field], value: String(parsed.data[field]) },
        update: { value: String(parsed.data[field]) },
      })))
    }
    await getAuditLogsRepository().create({
      tenantId: tenant.id,
      actorId: request.user.sub,
      action: 'finance.fees',
      entityType: 'Config',
      entityId: 'FEES',
      before,
      after: parsed.data,
      requestId: request.id,
    })
    return reply.status(200).send(parsed.data)
  } catch (error) {
    if (error instanceof ResourceNotFoundError) return reply.status(404).send({ message: error.message })
    throw error
  }
}

export async function registerFinanceRoutes(app: FastifyInstance) {
  app.get('/admin/finance', { onRequest: [verifyJWT] }, getFinance)
  app.get('/admin/finance/export', { onRequest: [verifyJWT] }, getFinanceExport)
  app.get('/admin/finance/fees', { onRequest: [verifyJWT] }, getFees)
  app.patch('/admin/finance/fees', { onRequest: [verifyJWT] }, putFees)
}
