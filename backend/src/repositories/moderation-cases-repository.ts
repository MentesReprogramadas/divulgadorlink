import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ModerationSource = 'AI' | 'BLOCKLIST' | 'PRE_REFUSAL' | 'APPEAL'

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
  create(data: NewModerationCaseData): Promise<ModerationCaseRecord>
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
    const row = this.cases.find((item) => item.linkId === linkId && !item.closed)
    return row ? { ...row, internalSignals: [...row.internalSignals] } : null
  }

  async create(data: NewModerationCaseData): Promise<ModerationCaseRecord> {
    return this.addCase(data)
  }

  async saveAppeal(id: string, text: string): Promise<ModerationCaseRecord | null> {
    const row = this.cases.find((item) => item.id === id)
    if (!row) return null
    row.appealed = true
    row.appealText = text
    row.source = 'APPEAL'
    return { ...row, internalSignals: [...row.internalSignals] }
  }

  async close(id: string): Promise<ModerationCaseRecord | null> {
    const row = this.cases.find((item) => item.id === id)
    if (!row) return null
    row.closed = true
    return { ...row, internalSignals: [...row.internalSignals] }
  }
}

const CASE_INCLUDE = { link: { select: { status: true, name: true, description: true } } } as const

type PrismaCaseRow = {
  id: string
  tenantId: string
  linkId: string
  appealText: string | null
  appealedAt: Date | null
  link: { status: string; name: string; description: string }
}

/**
 * Only appeal data is stored. Source, closure and last-approved data derive from
 * the link: a case is open while its link is PENDING_MODERATION, and internal
 * signals are never persisted.
 */
function toCaseRecord(row: PrismaCaseRow): ModerationCaseRecord {
  const published = row.link.status === 'PUBLISHED'
  return {
    id: row.id,
    tenantId: row.tenantId,
    linkId: row.linkId,
    source: row.appealedAt ? 'APPEAL' : 'PRE_REFUSAL',
    appealed: row.appealedAt !== null,
    appealText: row.appealText,
    wasEverPublished: published,
    lastApprovedName: published ? row.link.name : null,
    lastApprovedDescription: published ? row.link.description : null,
    internalSignals: [],
    closed: row.link.status !== 'PENDING_MODERATION',
  }
}

export class PrismaModerationCasesRepository implements ModerationCasesRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(id: string): Promise<ModerationCaseRecord | null> {
    const row = await this.client.moderationCase.findUnique({ where: { id }, include: CASE_INCLUDE })
    return row ? toCaseRecord(row) : null
  }

  /** linkId is unique, so the single case is returned even when closed; `appealed` enforces one appeal per link. */
  async findOpenByLinkId(linkId: string): Promise<ModerationCaseRecord | null> {
    const row = await this.client.moderationCase.findUnique({ where: { linkId }, include: CASE_INCLUDE })
    return row ? toCaseRecord(row) : null
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

  async saveAppeal(id: string, text: string): Promise<ModerationCaseRecord | null> {
    const result = await this.client.moderationCase.updateMany({
      where: { id, appealedAt: null },
      data: { appealText: text, appealedAt: new Date() },
    })
    if (result.count === 0) return null
    return this.findById(id)
  }

  async close(id: string): Promise<ModerationCaseRecord | null> {
    return this.findById(id)
  }
}

let moderationCasesRepository: ModerationCasesRepository =
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
