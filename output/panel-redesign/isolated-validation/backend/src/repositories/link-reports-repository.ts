import { createHmac } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { decideReport, intakeReport, ReportError, REPORT_WINDOW_MS } from '@/domain/moderation/report'
import { openPublicLink } from '@/use-cases/@Links/open-public-link'
import type { LinkReportsRepository, ReportDecision, ReportQueueInput, ReportSubmission, ReportReceipt } from '@/use-cases/@Moderation/link-reports'
import { PrismaAuditLogsRepository, type AuditLogsRepository } from './audit-logs-repository'

type Transaction = Prisma.TransactionClient
const receipt = (row: ReportReceipt): ReportReceipt => ({ id: row.id, status: row.status, createdAt: row.createdAt })
async function requireActor(tx: Transaction, tenantId: string, actorId: string, admin = false) {
  const rows = await tx.$queryRawUnsafe<Array<{ id: string; status: string; role: string }>>('SELECT id, status, role FROM users WHERE id=$1 AND "tenantId"=$2 FOR SHARE', actorId, tenantId)
  const actor = rows[0]
  if (!actor || actor.status !== 'ACTIVE' || (admin && actor.role !== 'ADMIN')) throw new ReportError('NOT_FOUND')
}

export class PrismaLinkReportsRepository implements LinkReportsRepository {
  constructor(private readonly db: PrismaClient, private readonly secret: string, private readonly auditFor: (tx: Transaction) => AuditLogsRepository = tx => new PrismaAuditLogsRepository(tx)) {}

  async submit(input: ReportSubmission) {
    return this.db.$transaction(async tx => {
      await requireActor(tx, input.tenantId, input.actorId)
      const reporterKey = createHmac('sha256', this.secret).update('link-report:v1:' + input.tenantId + ':' + input.actorId).digest('hex')
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', 'link-reports:' + input.tenantId + ':' + reporterKey)
      const link = await tx.link.findFirst({ where: { id: input.linkId, tenantId: input.tenantId }, include: { owner: { select: { status: true } } } })
      if (!link || !openPublicLink({ status: link.status, ownerStatus: link.owner?.status ?? null }).visible) throw new ReportError('NOT_FOUND')
      const since = new Date(input.now.getTime() - REPORT_WINDOW_MS)
      const [existing, count] = await Promise.all([
        tx.linkReport.findFirst({ where: { tenantId: input.tenantId, linkId: link.id, reporterKey, reason: input.reason, createdAt: { gt: since } }, orderBy: { createdAt: 'desc' } }),
        tx.linkReport.count({ where: { tenantId: input.tenantId, reporterKey, createdAt: { gt: since } } }),
      ])
      const action = intakeReport(existing?.createdAt ?? null, count, input.now)
      if (action === 'DUPLICATE') return receipt(existing!)
      if (action === 'LIMITED') throw new ReportError('LIMITED')
      const row = await tx.linkReport.create({ data: { tenantId: input.tenantId, linkId: link.id, reporterKey, reason: input.reason, kind: input.kind, comment: input.comment, createdAt: input.now } })
      return receipt(row)
    })
  }

  async list(input: ReportQueueInput) {
    return this.db.$transaction(async tx => {
      await requireActor(tx, input.tenantId, input.actorId, true)
      if (input.cursor && !await tx.linkReport.findFirst({ where: { id: input.cursor, tenantId: input.tenantId } })) throw new ReportError('NOT_FOUND')
      const rows = await tx.linkReport.findMany({
        where: { tenantId: input.tenantId, status: input.status, kind: input.kind },
        cursor: input.cursor ? { id: input.cursor } : undefined, skip: input.cursor ? 1 : 0,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: input.limit + 1,
        select: { id: true, status: true, createdAt: true, updatedAt: true, linkId: true, reason: true, kind: true, comment: true, version: true, decisionReason: true, link: { select: { name: true, status: true } } },
      })
      const visible = rows.slice(0, input.limit)
      const history = visible.length ? await tx.auditLog.findMany({ where: { tenantId: input.tenantId, entityType: 'LinkReport', entityId: { in: visible.map(row => row.id) } }, orderBy: { createdAt: 'asc' }, select: { id: true, entityId: true, action: true, after: true, createdAt: true } }) : []
      return { reports: visible.map(row => ({ ...row, history: history.filter(audit => audit.entityId === row.id).map(({ id, action, after, createdAt }) => ({ id, action, after, createdAt })) })), nextCursor: rows.length > input.limit ? visible.at(-1)!.id : null }
    })
  }

  async decide(input: ReportDecision) {
    return this.db.$transaction(async tx => {
      await requireActor(tx, input.tenantId, input.actorId, true)
      const current = await tx.linkReport.findFirst({ where: { id: input.reportId, tenantId: input.tenantId } })
      if (!current) throw new ReportError('NOT_FOUND')
      const next = decideReport({ status: current.status, version: current.version, next: input.status, expectedVersion: input.expectedVersion, reason: input.reason })
      const changed = await tx.linkReport.updateMany({ where: { id: current.id, tenantId: input.tenantId, version: current.version }, data: { status: next.status, version: next.version, decisionReason: next.reason, resolvedAt: next.status === 'RESOLVED' ? input.now : null } })
      if (!changed.count) throw new ReportError('CONFLICT')
      const audit = await this.auditFor(tx).create({ tenantId: input.tenantId, actorId: input.actorId, action: 'report.decide', entityType: 'LinkReport', entityId: current.id, before: { status: current.status, version: current.version }, after: next, requestId: input.requestId })
      return { report: { ...receipt(current), status: next.status, version: next.version }, auditId: audit.id }
    })
  }
}

let testRepository: LinkReportsRepository | null = null
let liveRepository: LinkReportsRepository | null = null
export function getLinkReportsRepository(): LinkReportsRepository {
  return testRepository ?? (liveRepository ??= new PrismaLinkReportsRepository(prisma, env.JWT_SECRET))
}
export function setLinkReportsRepositoryForTest(repository: LinkReportsRepository | null) {
  if (process.env.NODE_ENV === 'test') testRepository = repository
}
