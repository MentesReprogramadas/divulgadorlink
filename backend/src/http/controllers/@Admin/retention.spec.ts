import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import {
  MemoryRetentionStore,
  resetRetentionViewForTest,
  retentionView,
} from '@/repositories/analytics-retention'
import {
  getAnalyticsPurgeJobsForTest,
  resetAnalyticsPurgeJobsForTest,
} from '@/adapters/queues/enqueue-analytics-purge'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'
const OWNER_ID = 'user-owner'
const ADMIN_ID = 'admin-1'

function accessToken(input: { sub: string; role: string; tenantId: string }) {
  return app.jwt.sign({ ...input, typ: 'access' }, { expiresIn: '5m' })
}

function store(): MemoryRetentionStore {
  const current = retentionView()
  if (!(current instanceof MemoryRetentionStore)) throw new Error('retenção em memória esperada')
  return current
}

describe('retenção de analytics', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetRetentionViewForTest()
    resetAnalyticsPurgeJobsForTest()
  })

  it('esconde a rota de quem não é admin', async () => {
    const token = accessToken({ sub: OWNER_ID, role: 'USER', tenantId: TENANT_ID })
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/retention',
      headers: { host: HOST, authorization: `Bearer ${token}` },
    })
    expect(response.statusCode).toBe(404)
  })

  it('mostra o que passou de 12 meses e apaga só isso', async () => {
    store().rows.push(
      { id: 'old', day: '2020-01-01' },
      { id: 'fresh', day: '2099-01-01' },
    )
    const token = accessToken({ sub: ADMIN_ID, role: 'ADMIN', tenantId: TENANT_ID })
    const headers = { host: HOST, authorization: `Bearer ${token}` }

    const before = await app.inject({ method: 'GET', url: '/api/v1/admin/retention', headers })
    expect(before.statusCode).toBe(200)
    expect(before.json()).toMatchObject({ pending: 1 })
    expect(before.json().before).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const purged = await app.inject({ method: 'POST', url: '/api/v1/admin/retention', headers })
    expect(purged.statusCode).toBe(202)
    expect(purged.json()).toMatchObject({ queued: true })
    expect(getAnalyticsPurgeJobsForTest()).toEqual(['purge-analytics'])
    expect(store().rows.map((row) => row.id)).toEqual(['old', 'fresh'])

    const after = await app.inject({ method: 'GET', url: '/api/v1/admin/retention', headers })
    expect(after.json()).toMatchObject({ pending: 1 })
  })
})
