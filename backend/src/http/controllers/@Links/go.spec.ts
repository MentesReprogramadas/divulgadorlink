import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { not_found } from '@/http/errors'
import {
  getLinksRepository,
  InMemoryLinksRepository,
  resetLinksRepositoryForTest,
} from '@/repositories/links-repository'

const TENANT_ID = 'seed-temlinkaqui'

function repo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) {
    throw new Error('repositório em memória esperado')
  }
  return current
}

describe('GET /go/:linkId', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
  })

  it('redireciona para a URL canônica gravada e ignora query to', async () => {
    const link = repo().addLink({
      id: 'link-publicado',
      tenantId: TENANT_ID,
      status: 'PUBLISHED',
      canonicalUrl: 'https://t.me/grupo-oficial',
    })

    const response = await app.inject({
      method: 'GET',
      url: `/go/${link.id}?to=https://evil.example`,
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('https://t.me/grupo-oficial')
  })

  it('link indisponível não redireciona', async () => {
    const link = repo().addLink({
      id: 'link-indisponivel',
      tenantId: TENANT_ID,
      status: 'UNAVAILABLE',
      canonicalUrl: 'https://t.me/fora',
    })

    const response = await app.inject({
      method: 'GET',
      url: `/go/${link.id}`,
    })

    expect(response.statusCode).not.toBe(302)
    expect(response.headers.location).toBeUndefined()
    expect(response.json()).toMatchObject({ code: not_found })
  })
})
