import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import {
  getLinksRepository,
  InMemoryLinksRepository,
  resetLinksRepositoryForTest,
} from '@/repositories/links-repository'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'

function repo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) throw new Error('memória')
  return current
}

function token(sub: string, role: 'USER' | 'ADMIN') {
  return app.jwt.sign({ sub, role, tenantId: TENANT_ID, typ: 'access' }, { expiresIn: '5m' })
}

describe('banimento', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    const confirmedAt = new Date('2026-09-01T00:00:00Z')
    repo().addUser({
      id: 'ana',
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [
        { id: 'email', kind: 'EMAIL', normalizedValue: 'ana@example.com', confirmedAt, replacedAt: null },
        { id: 'phone', kind: 'PHONE', normalizedValue: '+5511999999999', confirmedAt, replacedAt: null },
      ],
    })
    repo().addUser({
      id: 'admin',
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [],
    })
    const link = repo().addLink({
      id: 'link-1',
      tenantId: TENANT_ID,
      ownerId: 'ana',
      status: 'PUBLISHED',
      name: 'Receitas',
    })
    repo().promotions.push({ id: 'promo-1', tenantId: TENANT_ID, linkId: link.id, status: 'ACTIVE' })
  })

  it('admin banido tira o link, cancela o destaque e não estorna', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/ana/ban',
      headers: { host: HOST, authorization: `Bearer ${token('admin', 'ADMIN')}` },
      payload: { reason: 'golpe' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ userStatus: 'BANNED', refunds: [] })
    expect(repo().users.find((row) => row.id === 'ana')?.status).toBe('BANNED')
    expect(repo().links[0]).toMatchObject({ status: 'UNAVAILABLE', occupiesSlot: false })
    expect(repo().promotions[0]?.status).toBe('CANCELLED')
    expect(repo().bans[0]).toMatchObject({ actorId: 'admin', reason: 'golpe', refunds: [] })
    expect(repo().users.find((row) => row.id === 'ana')?.identifiers).toHaveLength(2)
  })

  it('usuário comum não bane e não enumera', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/ana/ban',
      headers: { host: HOST, authorization: `Bearer ${token('ana', 'USER')}` },
      payload: {},
    })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'not_found' })
    expect(repo().users.find((row) => row.id === 'ana')?.status).toBe('ACTIVE')
  })

  it('conta banida não envia, não edita, não compra e não troca identificador', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/ana/ban',
      headers: { host: HOST, authorization: `Bearer ${token('admin', 'ADMIN')}` },
      payload: {},
    })
    const headers = { host: HOST, authorization: `Bearer ${token('ana', 'USER')}` }
    const phoneBefore = repo().users.find((row) => row.id === 'ana')?.identifiers.find((row) => row.kind === 'PHONE')?.normalizedValue

    const submit = await app.inject({
      method: 'POST',
      url: '/api/v1/links',
      headers,
      payload: {
        url: 'https://t.me/livre',
        name: 'grupo',
        description: 'grupo',
        networkId: 'net-telegram',
        nicheId: 'niche-jogos',
      },
    })
    const edit = await app.inject({
      method: 'PATCH',
      url: '/api/v1/links/link-1',
      headers,
      payload: { name: 'outro' },
    })
    const checkout = await app.inject({
      method: 'POST',
      url: '/api/v1/links/link-1/checkout',
      headers,
      payload: { surfaces: ['SEARCH'], durationDays: 7 },
    })
    const email = await app.inject({
      method: 'POST',
      url: '/api/v1/links/account/email',
      headers,
      payload: { email: 'nova@example.com' },
    })
    const phone = await app.inject({
      method: 'POST',
      url: '/api/v1/links/account/phone',
      headers,
      payload: { phone: '+5511888888888' },
    })

    for (const response of [submit, edit, checkout, email, phone]) {
      expect(response.statusCode).toBe(403)
    }
    expect(repo().links).toHaveLength(1)
    expect(repo().links[0]?.name).toBe('Receitas')
    expect(repo().users.find((row) => row.id === 'ana')?.identifiers.find((row) => row.kind === 'PHONE')?.normalizedValue).toBe(phoneBefore)
  })

  it('outro dono não edita o link pelo id', async () => {
    repo().addUser({
      id: 'bia',
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [],
    })
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/links/link-1',
      headers: { host: HOST, authorization: `Bearer ${token('bia', 'USER')}` },
      payload: { name: 'roubo' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ code: 'not_found' })
    expect(repo().links[0]?.name).toBe('Receitas')
  })
})
