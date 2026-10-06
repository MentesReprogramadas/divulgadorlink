import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { getAuditLogsRepository, resetAuditLogsRepositoryForTest } from '@/repositories/audit-logs-repository'
import { resetLinksRepositoryForTest } from '@/repositories/links-repository'
import { InMemoryTenantsRepository } from '@/repositories/tenants-repository'

const HOST = 'temlinkaqui.com'
const HOST_B = 'outro.example'
const TENANT = 'seed-temlinkaqui'
const TENANT_B = 'tenant-b'

function token(sub: string, tenantId = TENANT, role: 'USER' | 'ADMIN' = 'USER') {
  return app.jwt.sign({ sub, role, tenantId, typ: 'access' }, { expiresIn: '5m' })
}

describe('admin grava o resumo da faceta', () => {
  beforeAll(async () => {
    await app.ready()
    setTenantsRepositoryForTest(new InMemoryTenantsRepository([
      { id: TENANT, host: HOST, name: 'Tem Link Aqui' },
      { id: TENANT_B, host: HOST_B, name: 'Outro' },
    ]))
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    resetAuditLogsRepositoryForTest()
  })

  it('admin lê a régua pronta e grava resumo', async () => {
    const fat = 'd'.repeat(80)
    const headers = { host: HOST, authorization: `Bearer ${token('ana', TENANT, 'ADMIN')}` }
    const denied = await app.inject({ method: 'GET', url: '/api/v1/admin/facets', headers: { ...headers, authorization: `Bearer ${token('ana', TENANT, 'USER')}` } })
    expect(denied.statusCode).toBe(403)
    const foreign = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { host: HOST, authorization: `Bearer ${token('bia', TENANT_B, 'ADMIN')}`, 'content-type': 'application/json' }, payload: { summary: fat } })
    expect(foreign.statusCode).toBe(404)
    const saved = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: `  ${fat}  ` } })
    expect(saved.statusCode).toBe(200)
    expect(saved.json().summary).toBe(fat)
    const audit = await getAuditLogsRepository().latest({ tenantId: TENANT, entityType: 'Niche', entityId: 'niche-jogos', action: 'facet.summary.update' })
    expect(audit?.before).toEqual({ summary: null })
    expect(audit?.after).toEqual({ summary: fat })
    const listed = await app.inject({ method: 'GET', url: '/api/v1/admin/facets', headers })
    expect(listed.json().niches.find((row: { id: string }) => row.id === 'niche-jogos')).toMatchObject({ summary: fat, indexable: true, substantiveCount: 0 })
    const empty = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: '   ' } })
    expect(empty.json().summary).toBeNull()
    const huge = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/niche/niche-jogos', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: 'e'.repeat(501) } })
    expect(huge.statusCode).toBe(400)
    const markup = await app.inject({ method: 'PATCH', url: '/api/v1/admin/facets/network/net-telegram', headers: { ...headers, 'content-type': 'application/json' }, payload: { summary: 'oi <b>' } })
    expect(markup.statusCode).toBe(400)
  })
})
