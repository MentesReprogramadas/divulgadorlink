import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { parseTouch } from '@/domain/acquisition/touch'
import { getAcquisitionStore, resetAcquisitionStoreForTest } from '@/use-cases/@Acquisition/record-funnel'
import {
  getLinksRepository,
  InMemoryLinksRepository,
  resetLinksRepositoryForTest,
} from '@/repositories/links-repository'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'
const VERIFIED_ID = 'user-verified'

function repo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) throw new Error('repositório em memória esperado')
  return current
}

describe('HTTP de aquisição', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetAcquisitionStoreForTest()
    resetLinksRepositoryForTest()
    const confirmedAt = new Date('2026-09-01T00:00:00Z')
    repo().addUser({
      id: VERIFIED_ID,
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [
        { id: 'id-ana-email', kind: 'EMAIL', normalizedValue: 'ana@example.com', confirmedAt, replacedAt: null },
      ],
    })
  })

  it('o início do envio é idempotente no dia e exige sessão', async () => {
    const missing = await app.inject({ method: 'GET', url: '/api/v1/links/submission-started', headers: { host: HOST } })
    expect(missing.statusCode).toBe(401)
    const token = app.jwt.sign({ sub: VERIFIED_ID, role: 'USER', tenantId: TENANT_ID, typ: 'access' }, { expiresIn: '5m' })
    const headers = { host: HOST, authorization: `Bearer ${token}` }
    expect((await app.inject({ method: 'GET', url: '/api/v1/links/submission-started', headers })).statusCode).toBe(204)
    expect((await app.inject({ method: 'GET', url: '/api/v1/links/submission-started', headers })).statusCode).toBe(204)
    expect(getAcquisitionStore().events.filter((row) => row.name === 'StartLinkSubmission')).toHaveLength(1)
  })

  it('copia o toque para o link sem devolvê-lo no JSON', async () => {
    const touch = parseTouch(JSON.stringify({
      source: 'meta', medium: 'paid', campaign: 'outubro', content: 'a', term: 'b', landingPath: '/divulgar',
    }))
    await getAcquisitionStore().rememberRegistration({ tenantId: TENANT_ID, userId: VERIFIED_ID, touch })
    const token = app.jwt.sign({ sub: VERIFIED_ID, role: 'USER', tenantId: TENANT_ID, typ: 'access' }, { expiresIn: '5m' })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/links',
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: {
        url: 'https://t.me/livre',
        name: 'grupo de jogos',
        description: 'grupo de jogos',
        networkId: 'net-telegram',
        nicheId: 'niche-jogos',
      },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json() as { id: string; acquisitionCampaign?: string }
    expect(body.acquisitionCampaign).toBeUndefined()
    expect(getAcquisitionStore().linkTouch(body.id)?.campaign).toBe('outubro')
    const again = await getAcquisitionStore().recordFunnel({
      tenantId: TENANT_ID,
      eventId: body.id,
      name: 'SubmitLink',
      userId: VERIFIED_ID,
      linkId: body.id,
    })
    expect(again).toBe('duplicate')
  })
})
