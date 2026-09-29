import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { not_found } from '@/http/errors'
import {
  getAuditLogsRepository,
  InMemoryAuditLogsRepository,
  resetAuditLogsRepositoryForTest,
} from '@/repositories/audit-logs-repository'
import {
  getLinksRepository,
  InMemoryLinksRepository,
  resetLinksRepositoryForTest,
} from '@/repositories/links-repository'
import {
  getModerationCasesRepository,
  InMemoryModerationCasesRepository,
  resetModerationCasesRepositoryForTest,
} from '@/repositories/moderation-cases-repository'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'
const OWNER_ID = 'user-owner'
const ADMIN_ID = 'admin-1'

function accessToken(input: { sub: string; role: string; tenantId: string }) {
  return app.jwt.sign({ ...input, typ: 'access' }, { expiresIn: '5m' })
}

function linksRepo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) throw new Error('repositório em memória esperado')
  return current
}

function casesRepo(): InMemoryModerationCasesRepository {
  const current = getModerationCasesRepository()
  if (!(current instanceof InMemoryModerationCasesRepository)) {
    throw new Error('repositório de casos em memória esperado')
  }
  return current
}

describe('moderação HTTP', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    resetModerationCasesRepositoryForTest()
    resetAuditLogsRepositoryForTest()
    linksRepo().addUser({
      id: OWNER_ID,
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [],
    })
  })

  it('contestação única volta para fila sem sinal interno', async () => {
    const link = linksRepo().addLink({
      tenantId: TENANT_ID,
      ownerId: OWNER_ID,
      status: 'PRE_REJECTED',
      canonicalUrl: 'https://t.me/contest',
    })
    casesRepo().addCase({
      tenantId: TENANT_ID,
      linkId: link.id,
      source: 'PRE_REFUSAL',
      internalSignals: ['phone'],
    })

    const token = accessToken({ sub: OWNER_ID, role: 'USER', tenantId: TENANT_ID })
    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/links/${link.id}/appeal`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: { text: 'foi engano' },
    })

    expect(first.statusCode).toBe(200)
    expect(first.json()).toEqual({ status: 'PENDING_MODERATION' })
    expect(first.body).not.toMatch(/phone|niche_mismatch/i)
    expect(linksRepo().links[0]?.status).toBe('PENDING_MODERATION')

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/links/${link.id}/appeal`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: { text: 'de novo' },
    })
    expect(second.statusCode).toBe(409)
    expect(casesRepo().cases.filter((row) => row.appealed)).toHaveLength(1)
  })

  it('admin aprova com alerta de nicho e não troca URL', async () => {
    const link = linksRepo().addLink({
      tenantId: TENANT_ID,
      ownerId: OWNER_ID,
      status: 'PENDING_MODERATION',
      canonicalUrl: 'https://t.me/original',
      name: 'Grupo',
      description: 'entra no nicho de Apostas',
      nicheId: 'niche-jogos',
    })
    const moderationCase = casesRepo().addCase({
      tenantId: TENANT_ID,
      linkId: link.id,
      source: 'APPEAL',
      appealed: true,
      appealText: 'foi engano',
    })

    const token = accessToken({ sub: ADMIN_ID, role: 'ADMIN', tenantId: TENANT_ID })
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/moderation/${moderationCase.id}`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: { decision: 'APPROVE' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      status: 'PUBLISHED',
      url: 'https://t.me/original',
      occupiesSlot: true,
    })
    expect(linksRepo().links[0]?.canonicalUrl).toBe('https://t.me/original')
    expect(casesRepo().cases[0]?.internalSignals).toContain('niche_mismatch')
  })

  it('user do tenant recebe not_found na rota admin', async () => {
    const link = linksRepo().addLink({ tenantId: TENANT_ID, ownerId: OWNER_ID, status: 'PENDING_MODERATION' })
    const moderationCase = casesRepo().addCase({ tenantId: TENANT_ID, linkId: link.id, source: 'AI' })

    const token = accessToken({ sub: OWNER_ID, role: 'USER', tenantId: TENANT_ID })
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/moderation/${moderationCase.id}`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: { decision: 'REJECT' },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: not_found })
  })

  it('corpo com url extra retorna 400 e não altera link', async () => {
    const link = linksRepo().addLink({
      tenantId: TENANT_ID,
      ownerId: OWNER_ID,
      status: 'PENDING_MODERATION',
      canonicalUrl: 'https://t.me/original',
    })
    const moderationCase = casesRepo().addCase({ tenantId: TENANT_ID, linkId: link.id, source: 'AI' })
    const token = accessToken({ sub: ADMIN_ID, role: 'ADMIN', tenantId: TENANT_ID })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/moderation/${moderationCase.id}`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: { decision: 'APPROVE', url: 'https://t.me/outro' },
    })

    expect(response.statusCode).toBe(400)
    expect(linksRepo().links[0]?.canonicalUrl).toBe('https://t.me/original')
  })

  it('rejeição final libera vaga e grava auditoria com motivo', async () => {
    const link = linksRepo().addLink({
      tenantId: TENANT_ID,
      ownerId: OWNER_ID,
      status: 'PENDING_MODERATION',
      everPublished: false,
      occupiesSlot: true,
    })
    const moderationCase = casesRepo().addCase({
      tenantId: TENANT_ID,
      linkId: link.id,
      source: 'APPEAL',
      wasEverPublished: false,
    })
    const token = accessToken({ sub: ADMIN_ID, role: 'ADMIN', tenantId: TENANT_ID })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/moderation/${moderationCase.id}`,
      headers: { host: HOST, authorization: `Bearer ${token}`, 'x-request-id': 'req-mod-1' },
      payload: { decision: 'REJECT', reason: 'não atende' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'PRE_REJECTED', occupiesSlot: false })
    expect(linksRepo().links[0]?.occupiesSlot).toBe(false)

    const auditRepo = getAuditLogsRepository()
    expect(auditRepo).toBeInstanceOf(InMemoryAuditLogsRepository)
    const stored = (auditRepo as InMemoryAuditLogsRepository).items[0]
    expect(stored?.after).toMatchObject({ reason: 'não atende' })
    expect(stored?.requestId).toBe('req-mod-1')
  })
})
