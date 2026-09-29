import { describe, expect, it } from 'vitest'
import type { AuditLogRecord, CreateAuditLogInput } from '@/repositories/audit-logs-repository'
import { InMemoryAuditLogsRepository } from '@/repositories/audit-logs-repository'
import { InMemoryConfigsRepository } from '@/repositories/configs-repository'
import { UpdateAdminConfigUseCase } from '@/use-cases/@Admin/update-config'

const TENANT_ID = 'seed-temlinkaqui'
const CONFIG_KEY = 'SEARCH_RELEVANCE_THRESHOLD'

class ThrowingAuditLogsRepository extends InMemoryAuditLogsRepository {
  async create(_input: CreateAuditLogInput): Promise<AuditLogRecord> {
    throw new Error('falha ao gravar auditoria')
  }
}

describe('UpdateAdminConfigUseCase', () => {
  it('reverte o valor da config quando a auditoria falha', async () => {
    const configsRepository = InMemoryConfigsRepository.seeded()
    const auditLogsRepository = new ThrowingAuditLogsRepository()
    const useCase = new UpdateAdminConfigUseCase(configsRepository, auditLogsRepository)

    await expect(
      useCase.execute({
        resourceTenantId: TENANT_ID,
        key: CONFIG_KEY,
        value: '0.5',
        actorId: 'admin-1',
        jwtTenantId: TENANT_ID,
        role: 'ADMIN',
        requestId: 'req-rollback-1',
      }),
    ).rejects.toThrow('falha ao gravar auditoria')

    const row = await configsRepository.findByTenantAndKey(TENANT_ID, CONFIG_KEY)
    expect(row?.value).toBe('0.35')
    expect(auditLogsRepository.items).toHaveLength(0)
  })
})
