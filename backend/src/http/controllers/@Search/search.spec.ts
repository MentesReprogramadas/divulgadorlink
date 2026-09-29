import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { resetSearchCandidatesForTest, setSearchCandidatesForTest } from '@/http/controllers/@Search/routes'
import { resetConfigsRepositoryForTest } from '@/repositories/configs-repository'

describe('GET /api/v1/search', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetConfigsRepositoryForTest()
    resetSearchCandidatesForTest()
    setSearchCandidatesForTest([
      {
        id: 'pago',
        name: 'Receitas',
        description: 'doces',
        relevance: 0,
        textScore: 1,
        semanticScore: 1,
        embeddingState: 'READY',
        searchActivatedAt: new Date('2026-09-01'),
        requiresAge: false,
      },
      {
        id: 'sem-vetor',
        name: 'Receitas caseiras',
        description: 'bolo',
        relevance: 0,
        textScore: 1,
        semanticScore: null,
        embeddingState: 'ABSENT',
        searchActivatedAt: null,
        requiresAge: false,
      },
      {
        id: 'adulto',
        name: 'Adulto secreto',
        description: 'oculto',
        relevance: 0,
        textScore: 1,
        semanticScore: 1,
        embeddingState: 'READY',
        searchActivatedAt: null,
        requiresAge: true,
      },
    ])
  })

  it('corta pelo limiar, separa o pago e não esconde link sem vetor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=receitas',
      headers: { host: 'temlinkaqui.com' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.sponsored.map((row: { id: string }) => row.id)).toEqual(['pago'])
    expect(body.organic.map((row: { id: string }) => row.id)).toEqual(['sem-vetor'])
    expect(body.organic[0]).toMatchObject({ embeddingState: 'ABSENT', semanticScore: null })
    expect(body.sponsored[0].relevanceScore).toBeGreaterThan(body.organic[0].relevanceScore)
    expect(JSON.stringify(body)).not.toContain('adulto')
  })

  it('autocomplete não devolve o id adulto e não chama embedding', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggest?q=re',
      headers: { host: 'temlinkaqui.com', cookie: 'age=no' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().ids).toEqual(['pago', 'sem-vetor'])
    const source = readFileSync(path.join(__dirname, 'routes.ts'), 'utf8')
    const suggest = source.slice(source.indexOf('export async function getSuggest'))
    expect(suggest).not.toContain('.embed(')
  })
})
