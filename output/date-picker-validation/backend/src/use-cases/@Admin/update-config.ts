import type { PrismaClient } from '@prisma/client'
import { CONFIG_KEYS, readConfig, type ConfigKey } from '@/domain/config/read-config'
import { authorize } from '@/http/authorize'
import { authorizeDenialCode } from '@/http/errors'
import type { AuditLogsRepository } from '@/repositories/audit-logs-repository'
import { PrismaAuditLogsRepository } from '@/repositories/audit-logs-repository'
import type { ConfigRecord, ConfigsRepository } from '@/repositories/configs-repository'
import { PrismaConfigsRepository } from '@/repositories/configs-repository'

export class ConfigAuthorizeDeniedError extends Error {
  constructor(public readonly code: 'forbidden' | 'not_found') {
    super('acesso negado')
  }
}

export class UnknownConfigKeyError extends Error {
  constructor() {
    super('chave de config desconhecida')
  }
}

export class InvalidConfigValueError extends Error {
  constructor() {
    super('valor de config inválido')
  }
}

export class ConfigNotFoundError extends Error {
  constructor() {
    super('config não encontrada')
  }
}

function isConfigKey(key: string): key is ConfigKey {
  return (CONFIG_KEYS as readonly string[]).includes(key)
}

export class UpdateAdminConfigUseCase {
  constructor(
    private readonly configsRepository: ConfigsRepository,
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly prisma?: PrismaClient,
  ) {}

  async execute(input: {
    resourceTenantId: string
    key: string
    value: string
    actorId: string
    jwtTenantId: string
    role: string
    requestId: string
  }): Promise<{
    config: ConfigRecord
    audit: {
      action: string
      entityType: string
      entityId: string
      actorId: string
      before: { value: string }
      after: { value: string }
      requestId: string
    }
  }> {
    if (!isConfigKey(input.key)) {
      throw new UnknownConfigKeyError()
    }

    const config = await this.configsRepository.findByTenantAndKey(input.resourceTenantId, input.key)
    if (!config) {
      throw new ConfigNotFoundError()
    }

    const role = input.role === 'USER' || input.role === 'ADMIN' ? input.role : null
    const authorizeContext = {
      actorId: input.actorId,
      tenantId: input.jwtTenantId,
      ownerId: config.id,
      resourceTenantId: input.resourceTenantId,
      role: (role ?? 'USER') as 'USER' | 'ADMIN',
      action: 'config.update',
    }
    if (!role || !authorize(authorizeContext)) {
      throw new ConfigAuthorizeDeniedError(authorizeDenialCode(authorizeContext))
    }

    if (input.value.length === 0) {
      throw new InvalidConfigValueError()
    }
    if (input.key === 'SHOW_IMPRESSIONS' && input.value !== '0' && input.value !== '1') {
      throw new InvalidConfigValueError()
    }

    try {
      readConfig({ [input.key]: input.value }, input.key)
    } catch {
      throw new InvalidConfigValueError()
    }

    const previous = config.value
    const auditInput = {
      tenantId: input.resourceTenantId,
      actorId: input.actorId,
      action: 'config.update',
      entityType: 'Config',
      entityId: config.id,
      before: { value: previous },
      after: { value: input.value },
      requestId: input.requestId,
    }

    if (this.prisma) {
      return await this.prisma.$transaction(async (tx) => {
        const configsRepository = new PrismaConfigsRepository(tx)
        const auditLogsRepository = new PrismaAuditLogsRepository(tx)
        const updated = await configsRepository.updateValue(config.id, input.value)
        const audit = await auditLogsRepository.create(auditInput)
        return this.buildResult(updated, audit, input.actorId, previous, input.value, input.requestId)
      })
    }

    const updated = await this.configsRepository.updateValue(config.id, input.value)
    try {
      const audit = await this.auditLogsRepository.create(auditInput)
      return this.buildResult(updated, audit, input.actorId, previous, input.value, input.requestId)
    } catch (error) {
      await this.configsRepository.updateValue(config.id, previous)
      throw error
    }
  }

  private buildResult(
    updated: ConfigRecord,
    audit: { action: string; entityType: string; entityId: string },
    actorId: string,
    previous: string,
    nextValue: string,
    requestId: string,
  ) {
    return {
      config: updated,
      audit: {
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        actorId,
        before: { value: previous },
        after: { value: nextValue },
        requestId,
      },
    }
  }
}
