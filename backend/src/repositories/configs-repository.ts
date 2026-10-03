import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ConfigRecord = {
  id: string
  tenantId: string
  key: string
  value: string
}

export interface ConfigsRepository {
  findByTenantAndKey(tenantId: string, key: string): Promise<ConfigRecord | null>
  updateValue(id: string, value: string): Promise<ConfigRecord>
  create(input: { tenantId: string; key: string; value: string }): Promise<ConfigRecord>
}

export class InMemoryConfigsRepository implements ConfigsRepository {
  private items: ConfigRecord[]

  constructor(items: ConfigRecord[] = []) {
    this.items = items.map((item) => ({ ...item }))
  }

  static seeded(): InMemoryConfigsRepository {
    return new InMemoryConfigsRepository([
      {
        id: 'cfg-1',
        tenantId: 'seed-temlinkaqui',
        key: 'SEARCH_RELEVANCE_THRESHOLD',
        value: '0.35',
      },
      {
        id: 'cfg-text',
        tenantId: 'seed-temlinkaqui',
        key: 'SEARCH_TEXT_WEIGHT',
        value: '0.4',
      },
      {
        id: 'cfg-semantic',
        tenantId: 'seed-temlinkaqui',
        key: 'SEARCH_SEMANTIC_WEIGHT',
        value: '0.6',
      },
    ])
  }

  reset(): void {
    this.items = InMemoryConfigsRepository.seeded().items.map((item) => ({ ...item }))
  }

  async findByTenantAndKey(tenantId: string, key: string): Promise<ConfigRecord | null> {
    const row = this.items.find((item) => item.tenantId === tenantId && item.key === key)
    return row ? { ...row } : null
  }

  async updateValue(id: string, value: string): Promise<ConfigRecord> {
    const index = this.items.findIndex((item) => item.id === id)
    if (index === -1) {
      throw new Error('config não encontrada')
    }
    this.items[index] = { ...this.items[index], value }
    return { ...this.items[index] }
  }

  async create(input: { tenantId: string; key: string; value: string }): Promise<ConfigRecord> {
    const row = { id: `cfg-${input.key}-${input.tenantId}`, ...input }
    this.items.push(row)
    return { ...row }
  }
}

export class PrismaConfigsRepository implements ConfigsRepository {
  constructor(private readonly client: PrismaClient | Prisma.TransactionClient) {}

  async findByTenantAndKey(tenantId: string, key: string): Promise<ConfigRecord | null> {
    const row = await this.client.config.findUnique({
      where: { tenantId_key: { tenantId, key } },
    })
    if (!row) {
      return null
    }
    return { id: row.id, tenantId: row.tenantId, key: row.key, value: row.value }
  }

  async updateValue(id: string, value: string): Promise<ConfigRecord> {
    const row = await this.client.config.update({
      where: { id },
      data: { value },
    })
    return { id: row.id, tenantId: row.tenantId, key: row.key, value: row.value }
  }

  async create(input: { tenantId: string; key: string; value: string }): Promise<ConfigRecord> {
    const row = await this.client.config.create({ data: input })
    return { id: row.id, tenantId: row.tenantId, key: row.key, value: row.value }
  }
}

let configsRepository: ConfigsRepository =
  process.env.NODE_ENV === 'test'
    ? InMemoryConfigsRepository.seeded()
    : new PrismaConfigsRepository(prisma)

export function getConfigsRepository(): ConfigsRepository {
  return configsRepository
}

export function setConfigsRepositoryForTest(repository: ConfigsRepository): void {
  if (process.env.NODE_ENV !== 'test') return
  configsRepository = repository
}

export function resetConfigsRepositoryForTest(): void {
  if (process.env.NODE_ENV !== 'test') {
    return
  }
  const repo = configsRepository
  if (repo instanceof InMemoryConfigsRepository) {
    repo.reset()
  }
}
