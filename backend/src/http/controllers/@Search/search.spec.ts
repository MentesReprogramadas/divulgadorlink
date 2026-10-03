import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '@/app'
import { OpenAiEmbeddingService } from '@/adapters/embeddings/openai-embedding-service'
import {
  composeSearchForTest,
  productionSearchComposition,
  resetSearchCandidatesForTest,
  setSearchCandidatesForTest,
} from '@/http/controllers/@Search/routes'
import { resetConfigsRepositoryForTest } from '@/repositories/configs-repository'
import { getLinksRepository, InMemoryLinksRepository } from '@/repositories/links-repository'
import { DeterministicTestEmbeddingService } from '@/test-support/deterministic-test-embedding'

let embedding: DeterministicTestEmbeddingService

describe('GET /api/v1/search', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetConfigsRepositoryForTest()
    resetSearchCandidatesForTest()
    embedding = new DeterministicTestEmbeddingService()
    composeSearchForTest({ embedding: () => embedding })
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
    expect(body.ageRequired).toBe(true)
    expect(body.organic[0]).toMatchObject({ embeddingState: 'ABSENT', semanticScore: null })
    expect(body.sponsored[0].relevanceScore).toBeGreaterThan(body.organic[0].relevanceScore)
    expect(JSON.stringify(body)).not.toContain('adulto')
  })

  it('desempata relevância e activatedAt iguais pelo id, independente da ordem do banco', async () => {
    const tie = (id: string, searchActivatedAt: Date | null) => ({
      id,
      name: `Receitas ${id}`,
      description: 'empate',
      relevance: 0,
      textScore: 1,
      semanticScore: 1,
      embeddingState: 'READY' as const,
      searchActivatedAt,
      requiresAge: false,
    })
    const activatedAt = new Date('2026-09-01')
    setSearchCandidatesForTest([tie('c', null), tie('z', activatedAt), tie('a', null), tie('y', activatedAt), tie('b', null)])

    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=receitas', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.sponsored.map((row: { id: string }) => row.id)).toEqual(['y', 'z'])
    expect(body.organic.map((row: { id: string }) => row.id)).toEqual(['a', 'b', 'c'])
  })

  it('empate sai em id crescente para qualquer ordem de entrada', async () => {
    const tie = (id: string) => ({
      id, name: `Receitas ${id}`, description: 'empate', relevance: 0, textScore: 1, semanticScore: 1,
      embeddingState: 'READY' as const, searchActivatedAt: null, requiresAge: false,
    })
    const permutations = [['b', 'a', 'c'], ['c', 'b', 'a'], ['a', 'c', 'b'], ['b', 'c', 'a']]
    for (const order of permutations) {
      setSearchCandidatesForTest(order.map(tie))
      const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=receitas', headers: { host: 'temlinkaqui.com' } })
      expect(response.json().organic.map((row: { id: string }) => row.id), order.join()).toEqual(['a', 'b', 'c'])
    }
  })

  it('consulta igual a nicho público devolve a faceta sem resultados', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=Jogos', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      target: { kind: 'niche', slug: 'jogos', name: 'Jogos' },
      threshold: 0.35,
      showImpressions: true,
      sponsored: [],
      organic: [],
    })
    expect(embedding.calls).toEqual([])
  })

  it('palavra a mais mantém a rede e ainda busca', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=grupo%20telegram', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json().target).toEqual({ kind: 'network', slug: 'telegram', name: 'Telegram' })
    expect(response.json().organic.map((row: { id: string }) => row.id)).toEqual(['sem-vetor'])
    expect(embedding.calls).toEqual(['grupo telegram'])
  })

  it('prefixo único de uma rede acompanha a busca', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=tele', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json().target).toEqual({ kind: 'network', slug: 'telegram', name: 'Telegram' })
    expect(embedding.calls).toEqual(['tele'])
  })

  it('nicho dentro de uma frase não apaga os resultados', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=jogos%20de%20tabuleiro', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json().target).toEqual({ kind: 'niche', slug: 'jogos', name: 'Jogos' })
    expect(response.json().sponsored.map((row: { id: string }) => row.id)).toEqual(['pago'])
    expect(embedding.calls).toEqual(['jogos de tabuleiro'])
  })

  it('consulta igual a rede pública devolve o nome da rede e não chama embedding', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=Telegram', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      target: { kind: 'network', slug: 'telegram', name: 'Telegram' },
      threshold: 0.35,
      showImpressions: true,
      sponsored: [],
      organic: [],
    })
    expect(embedding.calls).toEqual([])
  })

  it('rede que não é faceta pública continua sendo busca, não destino', async () => {
    const repo = getLinksRepository()
    expect(repo).toBeInstanceOf(InMemoryLinksRepository)
    const outro = (repo as InMemoryLinksRepository).networks.find((row) => row.slug === 'outro')
    expect(outro?.isPublicFacet).toBe(false)
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=Outro', headers: { host: 'temlinkaqui.com' } })
    expect(response.statusCode).toBe(200)
    expect(response.json().target).toEqual({ kind: 'results', slug: null, name: null })
  })

  it('sem elegíveis devolve a estrutura vazia', async () => {
    setSearchCandidatesForTest([{
      id: 'fraco', name: 'Fraco', description: 'x', relevance: 0, textScore: 0.1, semanticScore: 0.1,
      embeddingState: 'READY', searchActivatedAt: null, requiresAge: false,
    }])
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=nada', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ target: { kind: 'results', slug: null, name: null }, threshold: 0.35, showImpressions: true, sponsored: [], organic: [] })
  })

  it('adulto só aparece com a idade confirmada na sessão', async () => {
    const ids = async (cookie?: string) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/search?q=receitas',
        headers: { host: 'temlinkaqui.com', ...(cookie ? { cookie } : {}) },
      })
      return response.json().organic.map((row: { id: string }) => row.id)
    }

    expect(await ids('age=yes')).toContain('adulto')
    expect(await ids('age=no')).not.toContain('adulto')
    expect(await ids()).not.toContain('adulto')
  })

  it('host sem tenant não devolve resultados', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=receitas', headers: { host: 'desconhecido.test' } })

    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('Receitas')
  })

  it('a busca chama o embedding uma vez com a consulta e a faceta não chama', async () => {
    await app.inject({ method: 'GET', url: '/api/v1/search?q=receitas', headers: { host: 'temlinkaqui.com' } })
    await app.inject({ method: 'GET', url: '/api/v1/search?q=Jogos', headers: { host: 'temlinkaqui.com' } })

    expect(embedding.calls).toEqual(['receitas'])
  })

  it('falha do provedor de embedding vira 503 sem resultados', async () => {
    composeSearchForTest({ embedding: () => ({ embed: async () => { throw new Error('provedor fora') } }) })

    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=receitas', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(503)
    expect(response.json()).toMatchObject({ code: 'provider_error' })
    expect(response.body).not.toContain('Receitas')
  })

  it('composição de produção usa a OpenAI, e sem chave não há request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('rede bloqueada no teste'))
    try {
      expect(productionSearchComposition().embedding()).toBeInstanceOf(OpenAiEmbeddingService)
      const service = productionSearchComposition('').embedding()
      expect(service).toBeInstanceOf(OpenAiEmbeddingService)
      await expect(service.embed('receitas')).rejects.toThrow('OPENAI_API_KEY ausente.')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('o provider determinístico só é importado por testes e a busca não desvia por NODE_ENV', () => {
    const root = path.join(__dirname, '..', '..', '..')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && !full.includes('test-support')) {
          if (readFileSync(full, 'utf8').includes('deterministic-test-embedding')) offenders.push(full)
        }
      }
    }
    walk(root)
    expect(offenders).toEqual([])

    const source = readFileSync(path.join(__dirname, 'routes.ts'), 'utf8')
    const searchPath = source.slice(source.indexOf('async function loadCandidates'), source.indexOf('export async function getSuggest'))
    expect(searchPath).not.toContain('NODE_ENV')
    expect(searchPath).not.toContain('listNiches(')
    expect(searchPath).not.toContain('listNetworks(')
    expect(source.slice(source.indexOf('export function productionSearchComposition'), source.indexOf('let composition'))).not.toMatch(/NODE_ENV|process\.env/)
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
