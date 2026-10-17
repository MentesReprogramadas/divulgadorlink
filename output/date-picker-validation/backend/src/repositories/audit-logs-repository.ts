import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AuditLogRecord = {
  id: string
  tenantId: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  before: unknown
  after: unknown
  requestId: string | null
  createdAt?: Date
}

export type CreateAuditLogInput = {
  tenantId: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  before: unknown
  after: unknown
  requestId: string | null
}

export interface AuditLogsRepository {
  create(input: CreateAuditLogInput): Promise<AuditLogRecord>
  latest(input: { tenantId: string; entityType: string; entityId: string; action: string }): Promise<AuditLogRecord | null>
}

export class InMemoryAuditLogsRepository implements AuditLogsRepository {
  items: AuditLogRecord[] = []
  private seq = 0

  reset(): void {
    this.items = []
    this.seq = 0
  }

  async create(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    this.seq += 1
    const row: AuditLogRecord = {
      id: `audit-${this.seq}`,
      ...input,
    }
    this.items.push(row)
    return { ...row }
  }

  async latest(input: { tenantId: string; entityType: string; entityId: string; action: string }): Promise<AuditLogRecord | null> {
    const matches = this.items.filter((row) =>
      row.tenantId === input.tenantId
      && row.entityType === input.entityType
      && row.entityId === input.entityId
      && row.action === input.action,
    )
    return matches.at(-1) ?? null
  }
}

export class PrismaAuditLogsRepository implements AuditLogsRepository {
  constructor(private readonly client: PrismaClient | Prisma.TransactionClient) {}

  async create(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    const row = await this.client.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before as object,
        after: input.after as object,
        requestId: input.requestId,
      },
    })
    return {
      id: row.id,
      tenantId: row.tenantId,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      before: row.before,
      after: row.after,
      requestId: row.requestId,
    }
  }

  async latest(input: { tenantId: string; entityType: string; entityId: string; action: string }): Promise<AuditLogRecord | null> {
    const row = await this.client.auditLog.findFirst({
      where: input,
      orderBy: { createdAt: 'desc' },
    })
    if (!row) return null
    return {
      id: row.id,
      tenantId: row.tenantId,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      before: row.before,
      after: row.after,
      requestId: row.requestId,
      createdAt: row.createdAt,
    }
  }
}

const auditLogsRepository: AuditLogsRepository =
  process.env.NODE_ENV === 'test'
    ? new InMemoryAuditLogsRepository()
    : new PrismaAuditLogsRepository(prisma)

export function getAuditLogsRepository(): AuditLogsRepository {
  return auditLogsRepository
}

export function resetAuditLogsRepositoryForTest(): void {
  if (process.env.NODE_ENV !== 'test') {
    return
  }
  const repo = auditLogsRepository
  if (repo instanceof InMemoryAuditLogsRepository) {
    repo.reset()
  }
}

export { auditLogsRepository }
