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

export class PrismaModerationCasesRepository implements ModerationCasesRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(): Promise<ModerationCaseRecord | null> {
    throw new Error('ModerationCase ainda não persistido no Prisma')
  }

  async findOpenByLinkId(): Promise<ModerationCaseRecord | null> {
    throw new Error('ModerationCase ainda não persistido no Prisma')
  }

  async create(): Promise<ModerationCaseRecord> {
    throw new Error('ModerationCase ainda não persistido no Prisma')
  }

  async saveAppeal(): Promise<ModerationCaseRecord | null> {
    throw new Error('ModerationCase ainda não persistido no Prisma')
  }

  async close(): Promise<ModerationCaseRecord | null> {
    throw new Error('ModerationCase ainda não persistido no Prisma')
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
