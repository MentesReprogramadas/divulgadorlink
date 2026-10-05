import { randomUUID } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ModerationSource = 'AI' | 'BLOCKLIST' | 'PRE_REFUSAL' | 'APPEAL' | 'SUBMISSION'

export type ModerationCaseRecord = {
  id: string
  tenantId: string
  linkId: string
  source: ModerationSource
  appealed: boolean
  appealText: string | null
  wasEverPublished: boolean
  lastApprovedName: string | null
  lastApprovedDescription: string | null
  internalSignals: string[]
  closed: boolean
}

export type NewModerationCaseData = Omit<ModerationCaseRecord, 'id' | 'appealed' | 'appealText' | 'closed'> & {
  appealed?: boolean
  appealText?: string | null
  closed?: boolean
}

export interface ModerationCasesRepository {
  findById(id: string): Promise<ModerationCaseRecord | null>
  findOpenByLinkId(linkId: string): Promise<ModerationCaseRecord | null>
  listOpen(tenantId: string): Promise<ModerationCaseRecord[]>
  listByLinkId(linkId: string): Promise<ModerationCaseRecord[]>
  create(data: NewModerationCaseData): Promise<ModerationCaseRecord>
  ensureOpen(data: NewModerationCaseData): Promise<ModerationCaseRecord>
  saveAppeal(id: string, text: string): Promise<ModerationCaseRecord | null>
  close(id: string): Promise<ModerationCaseRecord | null>
}

export class InMemoryModerationCasesRepository implements ModerationCasesRepository {
  cases: ModerationCaseRecord[] = []

  reset(): void {
    this.cases = []
  }

  addCase(input: Partial<ModerationCaseRecord> & Pick<ModerationCaseRecord, 'tenantId' | 'linkId' | 'source'>): ModerationCaseRecord {
    const row: ModerationCaseRecord = {
      id: randomUUID(),
      appealed: false,
      appealText: null,
      wasEverPublished: false,
      lastApprovedName: null,
      lastApprovedDescription: null,
      internalSignals: [],
      closed: false,
      ...input,
    }
    this.cases.push(row)
    return { ...row, internalSignals: [...row.internalSignals] }
  }

  async findById(id: string): Promise<ModerationCaseRecord | null> {
    const row = this.cases.find((item) => item.id === id)
    return row ? { ...row, internalSignals: [...row.internalSignals] } : null
  }

  async findOpenByLinkId(linkId: string): Promise<ModerationCaseRecord | null> {
    const row = [...this.cases].reverse().find((item) => item.linkId === linkId && !item.closed)
    return row ? { ...row, internalSignals: [...row.internalSignals] } : null
  }

  async listOpen(tenantId: string): Promise<ModerationCaseRecord[]> {
    return this.cases
      .filter((row) => row.tenantId === tenantId && !row.closed)
      .map((row) => ({ ...row, internalSignals: [...row.internalSignals] }))
  }

  async listByLinkId(linkId: string): Promise<ModerationCaseRecord[]> {
    return this.cases.filter((item) => item.linkId === linkId).map((row) => ({ ...row, internalSignals: [...row.internalSignals] }))
  }

  async create(data: NewModerationCaseData): Promise<ModerationCaseRecord> {
    return this.addCase(data)
  }

  async ensureOpen(data: NewModerationCaseData): Promise<ModerationCaseRecord> {
    const existing = await this.findOpenByLinkId(data.linkId)
    if (existing) return existing
    return this.create(data)
  }

  async saveAppeal(id: string, text: string): Promise<ModerationCaseRecord | null> {
    const row = this.cases.find((item) => item.id === id)
    if (!row || row.appealed) return null
    row.appealed = true
    row.appealText = text
    row.source = 'APPEAL'
    return { ...row, internalSignals: [...row.internalSignals] }
  }

  startSubmission(input: Partial<ModerationCaseRecord> & Pick<ModerationCaseRecord, 'tenantId' | 'linkId' | 'source'>): ModerationCaseRecord {
    for (const row of this.cases) {
      if (row.linkId === input.linkId && !row.closed) row.closed = true
    }
    return this.addCase({ ...input, appealed: false, appealText: null, closed: false })
  }

  async close(id: string): Promise<ModerationCaseRecord | null> {
    const row = this.cases.find((item) => item.id === id)
    if (!row) return null
    row.closed = true
    return { ...row, internalSignals: [...row.internalSignals] }
  }
}

const CASE_INCLUDE = {
  link: { select: { everPublished: true, approvedName: true, approvedDescription: true } },
} as const

type PrismaCaseRow = {
  id: string
  tenantId: string
  linkId: string
  appealText: string | null
  appealedAt: Date | null
  closedAt: Date | null
  link: { everPublished: boolean; approvedName: string | null; approvedDescription: string | null }
}

/**
 * Only appeal data is stored. A case without appeal is an envio na fila.
 * Closure and last-approved data derive from the link. Internal signals
 * are never persisted.
 */
function toCaseRecord(row: PrismaCaseRow): ModerationCaseRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    linkId: row.linkId,
    source: row.appealedAt ? 'APPEAL' : 'SUBMISSION',
    appealed: row.appealedAt !== null,
    appealText: row.appealText,
    wasEverPublished: row.link.everPublished,
    lastApprovedName: row.link.approvedName,
    lastApprovedDescription: row.link.approvedDescription,
    internalSignals: [],
    closed: row.closedAt !== null,
  }
}

export class PrismaModerationCasesRepository implements ModerationCasesRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(id: string): Promise<ModerationCaseRecord | null> {
    const row = await this.client.moderationCase.findUnique({ where: { id }, include: CASE_INCLUDE })
    return row ? toCaseRecord(row) : null
  }

  async listOpen(tenantId: string): Promise<ModerationCaseRecord[]> {
    const rows = await this.client.moderationCase.findMany({
      where: { tenantId, closedAt: null },
      orderBy: { createdAt: 'asc' },
      include: CASE_INCLUDE,
    })
    return rows.map(toCaseRecord)
  }

  async findOpenByLinkId(linkId: string): Promise<ModerationCaseRecord | null> {
    const row = await this.client.moderationCase.findFirst({
      where: { linkId, closedAt: null },
      orderBy: { createdAt: 'desc' },
      include: CASE_INCLUDE,
    })
    return row ? toCaseRecord(row) : null
  }

  async listByLinkId(linkId: string): Promise<ModerationCaseRecord[]> {
    const rows = await this.client.moderationCase.findMany({
      where: { linkId },
      orderBy: { createdAt: 'asc' },
      include: CASE_INCLUDE,
    })
    return rows.map(toCaseRecord)
  }

  async create(data: NewModerationCaseData): Promise<ModerationCaseRecord> {
    const row = await this.client.moderationCase.create({
      data: {
        tenantId: data.tenantId,
        linkId: data.linkId,
        appealText: data.appealText ?? null,
        appealedAt: data.appealed ? new Date() : null,
      },
      include: CASE_INCLUDE,
    })
    return toCaseRecord(row)
  }

  async ensureOpen(data: NewModerationCaseData): Promise<ModerationCaseRecord> {
    const existing = await this.findOpenByLinkId(data.linkId)
    if (existing) return existing
    try {
      return await this.create(data)
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
      const raced = await this.findOpenByLinkId(data.linkId)
      if (raced) return raced
      throw error
    }
  }

  async openMissingPending(tenantId: string): Promise<void> {
    const missing = await this.client.link.findMany({
      where: {
        tenantId,
        status: 'PENDING_MODERATION',
        moderationCases: { none: { closedAt: null } },
      },
      select: { id: true },
    })
    for (const link of missing) {
      await this.ensureOpen({
        tenantId,
        linkId: link.id,
        source: 'SUBMISSION',
        wasEverPublished: false,
        lastApprovedName: null,
        lastApprovedDescription: null,
        internalSignals: [],
      })
    }
  }

  async saveAppeal(id: string, text: string): Promise<ModerationCaseRecord | null> {
    const result = await this.client.moderationCase.updateMany({
      where: { id, appealedAt: null },
      data: { appealText: text, appealedAt: new Date() },
    })
    if (result.count === 0) return null
    return this.findById(id)
  }

  async close(id: string): Promise<ModerationCaseRecord | null> {
    await this.client.moderationCase.updateMany({
      where: { id, closedAt: null },
      data: { closedAt: new Date() },
    })
    return this.findById(id)
  }
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

const moderationCasesRepository: ModerationCasesRepository =
  process.env.NODE_ENV === 'test'
    ? new InMemoryModerationCasesRepository()
    : new PrismaModerationCasesRepository(prisma)

export function getModerationCasesRepository(): ModerationCasesRepository {
  return moderationCasesRepository
}

export function resetModerationCasesRepositoryForTest(): void {
  if (process.env.NODE_ENV !== 'test') return
  const repo = moderationCasesRepository
  if (repo instanceof InMemoryModerationCasesRepository) {
    repo.reset()
  }
}
