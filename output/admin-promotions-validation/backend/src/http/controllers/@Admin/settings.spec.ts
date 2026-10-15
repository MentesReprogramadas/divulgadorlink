import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { getConfigsRepository, resetConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { resetAuditLogsRepositoryForTest } from '@/repositories/audit-logs-repository'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'

function accessToken(input: { sub: string; role: string; tenantId: string }) {
  return app.jwt.sign({ ...input, typ: 'access' }, { expiresIn: '5m' })
}

function adminToken() {
  return accessToken({ sub: 'admin-1', role: 'ADMIN', tenantId: TENANT_ID })
}

describe('configuração de impressões públicas', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetConfigsRepositoryForTest()
    resetAuditLogsRepositoryForTest()
  })

  it('liga por padrão quando a linha não existe e o admin desliga', async () => {
    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/settings/impressions',
      headers: { host: HOST, authorization: `Bearer ${adminToken()}` },
    })
    expect(missing.statusCode).toBe(200)
    expect(missing.json()).toEqual({ showImpressions: true })

    const off = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/settings/impressions',
      headers: { host: HOST, authorization: `Bearer ${adminToken()}` },
      payload: { showImpressions: false },
    })
    expect(off.statusCode).toBe(200)
    expect(off.json()).toEqual({ showImpressions: false })

    const stored = await getConfigsRepository().findByTenantAndKey(TENANT_ID, 'SHOW_IMPRESSIONS')
    expect(stored?.value).toBe('0')

    const home = await app.inject({ method: 'GET', url: '/api/v1/home', headers: { host: HOST } })
    expect(home.statusCode).toBe(200)
    expect(home.json().showImpressions).toBe(false)
  })

  it('recusa valor que não é 0 ou 1 na rota genérica', async () => {
    await getConfigsRepository().create({ tenantId: TENANT_ID, key: 'SHOW_IMPRESSIONS', value: '1' })
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/config/SHOW_IMPRESSIONS',
      headers: { host: HOST, authorization: `Bearer ${adminToken()}` },
      payload: { value: '2' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('esconde a rota de quem não é admin', async () => {
    const token = accessToken({ sub: 'user-1', role: 'USER', tenantId: TENANT_ID })
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/settings/impressions',
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: { showImpressions: false },
    })
    expect(response.statusCode).toBe(404)
    expect(await getConfigsRepository().findByTenantAndKey(TENANT_ID, 'SHOW_IMPRESSIONS')).toBeNull()
  })
})
