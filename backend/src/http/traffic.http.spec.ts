import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { resetTrafficLimitForTest } from '@/http/controllers/@Analytics/traffic'
import { resetSiteTrafficForTest } from '@/repositories/site-traffic-repository'
import { getAcquisitionStore, resetAcquisitionStoreForTest } from '@/use-cases/@Acquisition/record-funnel'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'

function token(role: 'ADMIN' | 'USER') {
  return app.jwt.sign({ sub: `${role}-1`, role, tenantId: TENANT_ID, typ: 'access' }, { expiresIn: '5m' })
}

function visit(payload: Record<string, unknown>, cookie = 'analyticsSession=11111111-1111-1111-1111-111111111111') {
  return app.inject({ method: 'POST', url: '/api/v1/analytics/visits', headers: { host: HOST, cookie }, payload })
}

describe('tráfego interno sem depender do aceite', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetSiteTrafficForTest()
    resetTrafficLimitForTest()
    resetAcquisitionStoreForTest()
  })

  it('conta visita, entrada com campanha e escolha de cookies, e mostra ao admin', async () => {
    expect((await visit({ path: '/divulgar', entry: true, source: 'meta', medium: 'paid', campaign: 'outubro' })).statusCode).toBe(204)
    await visit({ path: '/link/abc', entry: false, source: 'meta', medium: 'paid', campaign: 'outubro' })
    await visit({ path: '/link/xyz', entry: false })
    await visit({ path: '/admin/visao', entry: false })
    await visit({ path: '/', entry: true, campaign: '<script>' })
    for (const choice of ['denied', 'denied', 'marketing']) {
      await app.inject({ method: 'POST', url: '/api/v1/analytics/consent', headers: { host: HOST }, payload: { choice } })
    }
    await getAcquisitionStore().recordFunnel({ tenantId: TENANT_ID, eventId: 'u1', name: 'CompleteRegistration', userId: 'u1', linkId: null })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/traffic',
      headers: { host: HOST, authorization: `Bearer ${token('ADMIN')}` },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.views).toBe(4)
    expect(body.entries).toBe(2)
    expect(body.paths).toEqual(expect.arrayContaining([
      { path: '/link/:id', views: 2, entries: 0 },
      { path: '/divulgar', views: 1, entries: 1 },
    ]))
    expect(body.campaigns).toEqual([{ source: 'meta', medium: 'paid', campaign: 'outubro', entries: 1 }])
    expect(body.consent).toEqual({ marketing: 1, denied: 2 })
    expect(body.funnel[0]).toEqual({ name: 'CompleteRegistration', count: 1 })
  })

  it('esconde o relatório de quem não é admin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/traffic',
      headers: { host: HOST, authorization: `Bearer ${token('USER')}` },
    })
    expect(response.statusCode).toBe(404)
  })

  it('limita a mesma sessão', async () => {
    for (let index = 0; index < 300; index += 1) await visit({ path: '/', entry: false })
    expect((await visit({ path: '/', entry: false })).statusCode).toBe(429)
  })
})
