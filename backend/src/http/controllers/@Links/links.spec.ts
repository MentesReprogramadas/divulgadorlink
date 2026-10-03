import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import {
  getLinksRepository,
  InMemoryLinksRepository,
  resetLinksRepositoryForTest,
} from '@/repositories/links-repository'
import { business_rule } from '@/http/errors'

const HOST = 'temlinkaqui.com'
const TENANT_ID = 'seed-temlinkaqui'
const VERIFIED_ID = 'user-verified'
const UNVERIFIED_ID = 'user-unverified'

function repo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) {
    throw new Error('repositório em memória esperado')
  }
  return current
}

function accessToken(sub: string) {
  return app.jwt.sign({ sub, role: 'USER', tenantId: TENANT_ID, typ: 'access' }, { expiresIn: '5m' })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://t.me/livre',
    name: 'grupo de jogos',
    description: 'grupo de jogos',
    networkId: 'net-telegram',
    nicheId: 'niche-jogos',
    ...overrides,
  }
}

function submit(sub: string, payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/links',
    headers: { host: HOST, authorization: `Bearer ${accessToken(sub)}` },
    payload,
  })
}

describe('POST /api/v1/links', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    const confirmedAt = new Date('2026-09-01T00:00:00Z')
    repo().addUser({
      id: VERIFIED_ID,
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [
        { id: 'id-ana-email', kind: 'EMAIL', normalizedValue: 'ana@example.com', confirmedAt, replacedAt: null },
        { id: 'id-ana-phone', kind: 'PHONE', normalizedValue: '11988887777', confirmedAt, replacedAt: null },
      ],
    })
    repo().addUser({
      id: UNVERIFIED_ID,
      tenantId: TENANT_ID,
      status: 'ACTIVE',
      identifiers: [
        { id: 'id-bia-email', kind: 'EMAIL', normalizedValue: 'bia@example.com', confirmedAt: null, replacedAt: null },
        { id: 'id-bia-phone', kind: 'PHONE', normalizedValue: '11977776666', confirmedAt: null, replacedAt: null },
      ],
    })
  })

  it('usuário verificado envia e o link fica em moderação com IA pendente', async () => {
    const response = await submit(VERIFIED_ID, validBody({ otherNote: 'nota do admin' }))

    expect(response.statusCode).toBe(201)
    const body = response.json() as Record<string, unknown>
    expect(body).toMatchObject({ status: 'PENDING_MODERATION', runAi: true, occupiesSlot: true })
    expect(typeof body.id).toBe('string')
    expect(body).not.toHaveProperty('otherNote')
    expect(Object.keys(body).sort()).toEqual(['id', 'occupiesSlot', 'runAi', 'status'])

    expect(repo().links).toHaveLength(1)
    expect(repo().links[0]).toMatchObject({
      id: body.id,
      tenantId: TENANT_ID,
      ownerId: VERIFIED_ID,
      canonicalUrl: 'https://t.me/livre',
      status: 'PENDING_MODERATION',
      otherNote: 'nota do admin',
    })
  })

  it('quinto envio com 4 vagas ocupadas retorna 409 e não grava', async () => {
    for (const status of ['PENDING_MODERATION', 'PUBLISHED', 'PRE_REJECTED', 'PENDING_MODERATION'] as const) {
      repo().addLink({ ownerId: VERIFIED_ID, tenantId: TENANT_ID, status })
    }

    const response = await submit(VERIFIED_ID, validBody())

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ code: business_rule, message: 'cota esgotada' })
    expect(repo().links).toHaveLength(4)
  })

  it('rede Outro vai para o admin sem IA', async () => {
    const response = await submit(VERIFIED_ID, validBody({ networkId: 'net-outro' }))

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ status: 'PENDING_MODERATION', runAi: false })
  })

  it('menção a outro nicho com lista de termos vazia não roda IA e não publica', async () => {
    const response = await submit(
      VERIFIED_ID,
      validBody({ description: 'entra no nicho de Apostas' }),
    )

    expect(response.statusCode).toBe(201)
    const body = response.json() as { status: string; runAi: boolean }
    expect(body.runAi).toBe(false)
    expect(body.status).not.toBe('PUBLISHED')
    expect(repo().links[0]?.status).not.toBe('PUBLISHED')
  })

  it('usuário sem e-mail confirmado recebe 403 e nada é gravado', async () => {
    const response = await submit(UNVERIFIED_ID, validBody())

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({
      code: business_rule,
      message: 'Conta não pode enviar link.',
    })
    expect(repo().links).toHaveLength(0)
  })

  it('telefone substituído igual ao de banido pré-recusa, grava e não nomeia o sinal', async () => {
    repo().addUser({
      id: 'user-banned',
      tenantId: TENANT_ID,
      status: 'BANNED',
      identifiers: [
        { id: 'id-ban-phone', kind: 'PHONE', normalizedValue: '11911112222', confirmedAt: null, replacedAt: null },
      ],
    })
    repo().users[0]!.identifiers.push({
      id: 'id-ana-old-phone',
      kind: 'PHONE',
      normalizedValue: '11911112222',
      confirmedAt: new Date('2026-01-01T00:00:00Z'),
      replacedAt: new Date('2026-02-01T00:00:00Z'),
    })

    const response = await submit(VERIFIED_ID, validBody())

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      status: 'PRE_REJECTED',
      runAi: false,
      occupiesSlot: true,
      message: 'Envio não aceito.',
    })
    expect(response.body).not.toMatch(/phone|telefone|email|url/i)
    expect(repo().links).toHaveLength(1)
    expect(repo().links[0]?.status).toBe('PRE_REJECTED')
  })

  it('tenantId no body retorna 400', async () => {
    const response = await submit(VERIFIED_ID, validBody({ tenantId: 'outro' }))

    expect(response.statusCode).toBe(400)
    expect(repo().links).toHaveLength(0)
  })
})
