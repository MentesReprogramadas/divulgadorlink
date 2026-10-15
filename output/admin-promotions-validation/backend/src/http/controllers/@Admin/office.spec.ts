import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
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

describe('gestão HTTP', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    resetAuditLogsRepositoryForTest()
    const confirmedAt = new Date('2026-09-01T00:00:00Z')
    linksRepo().addUser({
      id: OWNER_ID,
      tenantId: TENANT_ID,
      name: 'Dono',
      status: 'ACTIVE',
      identifiers: [{ id: 'email-owner', kind: 'EMAIL', normalizedValue: 'dono@demo.local', confirmedAt, replacedAt: null }],
    })
    linksRepo().addUser({
      id: ADMIN_ID,
      tenantId: TENANT_ID,
      name: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      identifiers: [{ id: 'email-admin', kind: 'EMAIL', normalizedValue: 'admin@demo.local', confirmedAt, replacedAt: null }],
    })
  })

  it('esconde a visão de quem não é admin', async () => {
    const token = accessToken({ sub: OWNER_ID, role: 'USER', tenantId: TENANT_ID })
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/office',
      headers: { host: HOST, authorization: `Bearer ${token}` },
    })
    expect(response.statusCode).toBe(404)
  })

  it('lista a conta e tira um link do ar sem suspender o dono', async () => {
    const link = linksRepo().addLink({
      tenantId: TENANT_ID,
      ownerId: OWNER_ID,
      status: 'PUBLISHED',
      name: 'Grupo visível',
      canonicalUrl: 'https://t.me/visivel',
    })
    linksRepo().promotions.push({ id: 'promo-1', tenantId: TENANT_ID, linkId: link.id, status: 'ACTIVE' })
    const token = accessToken({ sub: ADMIN_ID, role: 'ADMIN', tenantId: TENANT_ID })

    const office = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/office',
      headers: { host: HOST, authorization: `Bearer ${token}` },
    })
    expect(office.statusCode).toBe(200)
    expect(office.json().users.map((row: { id: string }) => row.id)).toContain(OWNER_ID)
    expect(office.json().links.map((row: { id: string }) => row.id)).toContain(link.id)

    const withdrawn = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/links/${link.id}/withdraw`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
    })
    expect(withdrawn.statusCode).toBe(200)
    expect(withdrawn.json()).toEqual({ status: 'UNAVAILABLE', promotionsCancelled: 1 })
    expect(linksRepo().links.find((row) => row.id === link.id)?.status).toBe('UNAVAILABLE')
    expect(linksRepo().users.find((row) => row.id === OWNER_ID)?.status).toBe('ACTIVE')
    const audit = getAuditLogsRepository()
    if (!(audit instanceof InMemoryAuditLogsRepository)) throw new Error('auditoria em memória esperada')
    expect(audit.items.some((row) => row.action === 'link.withdraw' && row.entityId === link.id)).toBe(true)

    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/links/${link.id}/withdraw`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
    })
    expect(again.statusCode).toBe(409)
  })

  it('não deixa o admin suspender a própria conta', async () => {
    const token = accessToken({ sub: ADMIN_ID, role: 'ADMIN', tenantId: TENANT_ID })
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${ADMIN_ID}/ban`,
      headers: { host: HOST, authorization: `Bearer ${token}` },
      payload: {},
    })
    expect(response.statusCode).toBe(403)
    expect(linksRepo().users.find((row) => row.id === ADMIN_ID)?.status).toBe('ACTIVE')
  })
})
