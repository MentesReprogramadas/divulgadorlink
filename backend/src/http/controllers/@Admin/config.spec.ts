import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
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
