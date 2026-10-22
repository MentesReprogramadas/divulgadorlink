import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import {
  getAuditLogsRepository,
  InMemoryAuditLogsRepository,
  resetAuditLogsRepositoryForTest,
} from '@/repositories/audit-logs-repository'
import { getConfigsRepository, resetConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { forbidden, not_found } from '@/http/errors'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'
const CONFIG_KEY = 'SEARCH_RELEVANCE_THRESHOLD'

function accessToken(input: { sub: string; role: string; tenantId: string }) {
  return app.jwt.sign({ ...input, typ: 'access' }, { expiresIn: '5m' })
}

async function patchConfig(input: {
  token: string
  key: string
  body: Record<string, unknown>
  requestId?: string
}) {
  const headers: Record<string, string> = {
    host: HOST,
    authorization: `Bearer ${input.token}`,
  }
  if (input.requestId) {
    headers['x-request-id'] = input.requestId
  }
  return app.inject({
    method: 'PATCH',
    url: `/api/v1/admin/config/${input.key}`,
    headers,
    payload: input.body,
  })
}

describe('PATCH /api/v1/admin/config/:key', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetConfigsRepositoryForTest()
    resetAuditLogsRepositoryForTest()
  })

  it('admin do tenant atualiza config e grava auditoria', async () => {
    const token = accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })

    const response = await patchConfig({
      token,
      key: CONFIG_KEY,
      body: { value: '0.5' },
      requestId: 'req-admin-config-1',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json() as {
      config: { id: string; key: string; value: string }
      audit: {
        action: string
        entityType: string
        entityId: string
        actorId: string
        before: { value: string }
        after: { value: string }
        requestId: string
      }
    }
    expect(body.config.value).toBe('0.5')
    expect(body.audit).toMatchObject({
      action: 'config.update',
      entityType: 'Config',
      entityId: 'cfg-1',
      actorId: 'admin-1',
      before: { value: '0.35' },
      after: { value: '0.5' },
      requestId: 'req-admin-config-1',
    })

    const row = await getConfigsRepository().findByTenantAndKey(TENANT_ID, CONFIG_KEY)
    expect(row?.value).toBe('0.5')

    const auditRepo = getAuditLogsRepository()
    expect(auditRepo).toBeInstanceOf(InMemoryAuditLogsRepository)
    const stored = (auditRepo as InMemoryAuditLogsRepository).items
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      action: 'config.update',
      actorId: 'admin-1',
      requestId: 'req-admin-config-1',
      before: { value: '0.35' },
      after: { value: '0.5' },
    })
  })

  it('user do mesmo tenant recebe not_found e não altera o valor', async () => {
    const token = accessToken({ sub: 'user-1', role: 'USER', tenantId: TENANT_ID })

    const response = await patchConfig({
      token,
      key: CONFIG_KEY,
      body: { value: '0.5' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json() as { code: string }
    expect(body.code).toBe(not_found)

    const row = await getConfigsRepository().findByTenantAndKey(TENANT_ID, CONFIG_KEY)
    expect(row?.value).toBe('0.35')
  })

  it('admin de outro tenant recebe forbidden e não altera o valor', async () => {
    const token = accessToken({ sub: 'admin-2', role: 'ADMIN', tenantId: 'outro-tenant' })

    const response = await patchConfig({
      token,
      key: CONFIG_KEY,
      body: { value: '0.5' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json() as { code: string }
    expect(body.code).toBe(forbidden)

    const row = await getConfigsRepository().findByTenantAndKey(TENANT_ID, CONFIG_KEY)
    expect(row?.value).toBe('0.35')
  })

  it('value vazio não atualiza', async () => {
    const token = accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })

    const response = await patchConfig({
      token,
      key: CONFIG_KEY,
      body: { value: '' },
    })

    expect(response.statusCode).not.toBe(200)

    const row = await getConfigsRepository().findByTenantAndKey(TENANT_ID, CONFIG_KEY)
    expect(row?.value).toBe('0.35')
  })

  it('tenantId no body retorna 400', async () => {
    const token = accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })

    const response = await patchConfig({
      token,
      key: CONFIG_KEY,
      body: { value: '0.5', tenantId: 'outro' },
    })

    expect(response.statusCode).toBe(400)

    const row = await getConfigsRepository().findByTenantAndKey(TENANT_ID, CONFIG_KEY)
    expect(row?.value).toBe('0.35')
  })

  it('chave desconhecida não atualiza', async () => {
    const token = accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })

    const response = await patchConfig({
      token,
      key: 'NAO_EXISTE',
      body: { value: '0.5' },
    })

    expect(response.statusCode).not.toBe(200)

    const row = await getConfigsRepository().findByTenantAndKey(TENANT_ID, CONFIG_KEY)
    expect(row?.value).toBe('0.35')
  })
})

describe('limiar de aprovação da IA', () => {
  const key = 'MODERATION_AUTO_APPROVE_THRESHOLD'
  beforeEach(async () => {
    resetConfigsRepositoryForTest()
    resetAuditLogsRepositoryForTest()
    await getConfigsRepository().create({ tenantId: TENANT_ID, key, value: '0.85' })
  })
  it('lê o valor salvo, aceita limites e audita a alteração', async () => {
    const token = accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })
    const get = await app.inject({ method: 'GET', url: '/api/v1/admin/settings/moderation', headers: { host: HOST, authorization: `Bearer ${token}` } })
    expect(get.statusCode).toBe(200)
    expect(get.json()).toEqual({ threshold: 0.85 })
    for (const value of ['0', '0.1', '1']) {
      const result = await patchConfig({ token, key, body: { value } })
      expect(result.statusCode).toBe(200)
      expect(result.json().audit.after.value).toBe(value)
    }
  })
  it('rejeita fora da escala, vazio e injeção de tenant sem alterar configuração', async () => {
    const token = accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })
    for (const value of ['-0.01', '1.01', '10', 'NaN', 'Infinity', '   ', '']) expect((await patchConfig({ token, key, body: { value } })).statusCode).toBe(400)
    expect((await patchConfig({ token, key, body: { value: '0', tenantId: 'outro' } })).statusCode).toBe(400)
    expect((await getConfigsRepository().findByTenantAndKey(TENANT_ID, key))?.value).toBe('0.85')
  })
  it('protege leitura e escrita contra usuário e outro tenant', async () => {
    for (const [role, tenantId, status] of [['USER', TENANT_ID, 404], ['ADMIN', 'outro', 403]] as const) {
      const token = accessToken({ sub: 'actor', role, tenantId })
      expect((await app.inject({ method: 'GET', url: '/api/v1/admin/settings/moderation', headers: { host: HOST, authorization: `Bearer ${token}` } })).statusCode).toBe(status)
      expect((await patchConfig({ token, key, body: { value: '0' } })).statusCode).toBe(status)
    }
  })
})

it('leitura sem configuração ou com valor inválido não oferece aprovação em zero', async () => {
  const token = accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })
  const read = () => app.inject({ method: 'GET', url: '/api/v1/admin/settings/moderation', headers: { host: HOST, authorization: `Bearer ${token}` } })
  resetConfigsRepositoryForTest()
  expect((await read()).statusCode).toBe(503)
  await getConfigsRepository().create({ tenantId: TENANT_ID, key: 'MODERATION_AUTO_APPROVE_THRESHOLD', value: ' ' })
  expect((await read()).statusCode).toBe(503)
})
