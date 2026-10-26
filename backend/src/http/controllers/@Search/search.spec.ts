import * as randomOrdering from '@/domain/catalog/random-order'
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
        nicheSlug:'jogos',networkSlug:'telegram',
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
        nicheSlug:'jogos',networkSlug:'telegram',
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
        nicheSlug:'apostas',networkSlug:'telegram',
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

  it('preserva os elegíveis e a separação dos patrocinados ao embaralhar', async () => {
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
    expect(body.sponsored.map((row: { id: string }) => row.id).sort()).toEqual(['y', 'z'])
    expect(body.organic.map((row: { id: string }) => row.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('sorteia outra ordem em cada nova busca, preservando relevância e patrocínio', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: `r${i}`, name: i === 19 ? 'Irrelevante' : 'Receitas', description: 'doces', relevance: 0,
      textScore: i === 19 ? 0 : 1, semanticScore: 0, embeddingState: 'ABSENT' as const,
      searchActivatedAt: i < 5 ? new Date('2026-09-01') : null, requiresAge: false,
    }))
    setSearchCandidatesForTest(rows)
    const seed = vi.spyOn(randomOrdering, 'newOrderSeed')
    try {
      const bodies = []
      for (const value of ['a'.repeat(32), 'b'.repeat(32)]) {
        seed.mockReturnValue(value)
        const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=receitas', headers: { host: 'temlinkaqui.com' } })
        expect(response.statusCode).toBe(200)
        expect(response.headers['cache-control']).toBe('no-store')
        bodies.push(response.json())
      }
      for (const group of ['sponsored', 'organic']) {
        const first = bodies[0][group].map((row: { id: string }) => row.id)
        const second = bodies[1][group].map((row: { id: string }) => row.id)
        expect(first).not.toEqual(second)
        expect([...first].sort()).toEqual([...second].sort())
        expect(first).not.toContain('r19')
      }
    } finally {
      seed.mockRestore()
    }
  })

  it('consulta igual a nicho público devolve a faceta junto dos links', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=Jogos', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      target: { kind: 'niche', slug: 'jogos', name: 'Jogos' },
      facets:[{kind:'niche',slug:'jogos',name:'Jogos',requiresAge:false}],
      threshold: 0.35,
      showImpressions: true,
    })
    expect(response.json().sponsored.map((row:{id:string})=>row.id)).toEqual(['pago'])
    expect(response.json().organic.map((row:{id:string})=>row.id)).toEqual(['sem-vetor'])
    expect(embedding.calls).toEqual([])
  })

  it('IA entende uma frase inédita e usa nicho/rede dinâmicos nas duas rotas',async()=>{
    const repo=getLinksRepository() as InMemoryLinksRepository
    const niche={...repo.niches[0],id:'dynamic-niche',name:'Garimpo para a casa',slug:'garimpo-casa',isPublicFacet:true,requiresAge:false}
    const network={...repo.networks[0],id:'dynamic-network',name:'Mensagens',slug:'mensagens',isPublicFacet:true,requiresAge:false}
    repo.niches.push(niche);repo.networks.push(network)
    const interpret=vi.fn().mockResolvedValue({query:'produtos baratos para casa',niches:['garimpo-casa'],networks:['mensagens'],mode:'facet'})
    composeSearchForTest({interpret})
    setSearchCandidatesForTest([
      {id:'context-match',name:'Comunidade de oportunidades',description:'Produtos',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:false,nicheSlug:'garimpo-casa',networkSlug:'mensagens'},
      {id:'other-network',name:'Outro',description:'Produtos',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:false,nicheSlug:'garimpo-casa',networkSlug:'telegram'},
    ])
    try{
      const query='quero equipar meu cantinho gastando pouco em grupos de conversa'
      for(const path of ['search','search/suggest']){
        const response=await app.inject({method:'GET',url:`/api/v1/${path}?q=${encodeURIComponent(query)}`,headers:{host:'temlinkaqui.com'}})
        expect(response.statusCode).toBe(200)
        const body=response.json()
        expect((body.organic??body.items).map((row:{id:string})=>row.id)).toEqual(['context-match'])
        expect(body.facets.map((row:{slug:string})=>row.slug)).toEqual(['garimpo-casa','mensagens'])
      }
      expect(interpret).toHaveBeenCalledWith(expect.objectContaining({query,niches:expect.arrayContaining([{slug:'garimpo-casa',name:'Garimpo para a casa'}])}))
      expect(interpret.mock.calls[0][0].networks.some((row:{slug:string})=>row.slug==='outro')).toBe(false)
      expect(embedding.calls).toEqual([])
    }finally{repo.niches.splice(repo.niches.indexOf(niche),1);repo.networks.splice(repo.networks.indexOf(network),1)}
  })

  it('falha da interpretação mantém a busca existente',async()=>{
    composeSearchForTest({interpret:async()=>{throw new Error('timeout')}})
    const response=await app.inject({method:'GET',url:'/api/v1/search?q=receitas',headers:{host:'temlinkaqui.com'}})
    expect(response.statusCode).toBe(200)
    expect(response.json().organic.map((row:{id:string})=>row.id)).toContain('sem-vetor')
    expect(embedding.calls).toEqual(['receitas'])
  })

  it('limita a consulta antes de chamar o provedor nas duas rotas',async()=>{
    const interpret=vi.fn()
    composeSearchForTest({interpret})
    for(const path of ['search','search/suggest']){
      const response=await app.inject({method:'GET',url:`/api/v1/${path}?q=${'x'.repeat(301)}`,headers:{host:'temlinkaqui.com'}})
      expect(response.statusCode).toBe(400)
    }
    expect(interpret).not.toHaveBeenCalled()
  })

  it('assunto específico exige semântica mesmo dentro da rede e não aprova todos os links da faceta',async()=>{
    composeSearchForTest({interpret:async()=>({query:'programação funcional avançada',niches:['jogos'],networks:['telegram'],mode:'semantic'})})
    setSearchCandidatesForTest([
      {id:'related',name:'Estudos',description:'Tópico específico',relevance:0,textScore:0,semanticScore:0.9,embeddingState:'READY',searchActivatedAt:null,requiresAge:false,nicheSlug:'jogos',networkSlug:'telegram'},
      {id:'unrelated',name:'Outro assunto',description:'Sem relação',relevance:0,textScore:0,semanticScore:0,embeddingState:'READY',searchActivatedAt:null,requiresAge:false,nicheSlug:'jogos',networkSlug:'telegram'},
    ])
    for(const path of ['search','search/suggest']){
      const response=await app.inject({method:'GET',url:`/api/v1/${path}?q=${encodeURIComponent('quero estudar funções puras no mensageiro')}`,headers:{host:'temlinkaqui.com'}})
      expect(response.statusCode).toBe(200)
      expect((response.json().organic??response.json().items).map((row:{id:string})=>row.id)).toEqual(['related'])
    }
    expect(embedding.calls).toEqual(['programação funcional avançada','programação funcional avançada'])
  })

  it('recomenda o nicho e a rede interpretados quando o assunto específico não tem resultado',async()=>{
    composeSearchForTest({interpret:async()=>({query:'conceito sem correspondência',niches:['jogos'],networks:['telegram'],mode:'semantic'})})
    setSearchCandidatesForTest([
      {id:'context-related',name:'Comunidade relacionada',description:'Mesmo contexto',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:false,nicheSlug:'jogos',networkSlug:'telegram'},
      {id:'other-network',name:'Outra rede',description:'Outro contexto',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:false,nicheSlug:'jogos',networkSlug:'discord'},
      {id:'other-niche',name:'Outro nicho',description:'Outro contexto',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:false,nicheSlug:'apostas',networkSlug:'telegram'},
    ])
    for(const path of ['search','search/suggest']){
      const response=await app.inject({method:'GET',url:`/api/v1/${path}?q=${encodeURIComponent('busco um conceito novo em comunidades')}`,headers:{host:'temlinkaqui.com'}})
      expect(response.statusCode).toBe(200)
      expect((response.json().organic??response.json().items).map((row:{id:string})=>row.id)).toEqual(['context-related'])
    }
  })

  it('sem contexto identificado não recomenda links arbitrários',async()=>{
    composeSearchForTest({interpret:async()=>({query:'conceito sem correspondência',niches:[],networks:[],mode:'semantic'})})
    setSearchCandidatesForTest([{id:'unrelated',name:'Outra comunidade',description:'Sem contexto',relevance:0,textScore:0,semanticScore:0,embeddingState:'READY',searchActivatedAt:null,requiresAge:false,nicheSlug:'jogos',networkSlug:'telegram'}])
    for(const path of ['search','search/suggest']){
      const response=await app.inject({method:'GET',url:`/api/v1/${path}?q=conceito%20novo`,headers:{host:'temlinkaqui.com'}})
      expect(response.statusCode).toBe(200)
      expect(response.json().organic??response.json().items).toEqual([])
    }
  })

  it('recomendação de contexto sem resultado específico continua protegida por maioridade',async()=>{
    composeSearchForTest({interpret:async()=>({query:'assunto restrito sem correspondência',niches:['apostas'],networks:['telegram'],mode:'semantic'})})
    setSearchCandidatesForTest([{id:'related-adult',name:'Comunidade restrita relacionada',description:'Somente adultos',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:true,nicheSlug:'apostas',networkSlug:'telegram'}])
    for(const path of ['search','search/suggest']){
      const get=(cookie?:string)=>app.inject({method:'GET',url:`/api/v1/${path}?q=${encodeURIComponent('quero entretenimento reservado em grupos')}`,headers:{host:'temlinkaqui.com',...(cookie?{cookie}:{})}})
      const closed=await get()
      expect(closed.json().ageRequired).toBe(true)
      expect(closed.body).not.toContain('related-adult')
      const open=await get('age=yes')
      expect((open.json().organic??open.json().items).map((row:{id:string})=>row.id)).toEqual(['related-adult'])
      const refused=await get('age=no')
      expect(refused.body).not.toContain('related-adult')
      expect(refused.headers['cache-control']).toBe('no-store')
    }
  })

  it('IA não libera conteúdo adulto sem aceite, mesmo interpretando frase não enumerada',async()=>{
    composeSearchForTest({interpret:async()=>({query:'conteúdo para adultos',niches:['apostas'],networks:['telegram'],mode:'facet'})})
    for(const path of ['search','search/suggest']){
      const get=(cookie?:string)=>app.inject({method:'GET',url:`/api/v1/${path}?q=${encodeURIComponent('busco entretenimento reservado só para maiores')}`,headers:{host:'temlinkaqui.com',...(cookie?{cookie}:{})}})
      const closed=await get()
      expect(closed.json().ageRequired).toBe(true)
      expect(closed.body).not.toContain('Adulto secreto')
      const open=await get('age=yes')
      expect((open.json().organic??open.json().items).map((row:{id:string})=>row.id)).toEqual(['adulto'])
      const no=await get('age=no')
      expect(no.body).not.toContain('Adulto secreto')
    }
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
    const interpret=vi.fn().mockResolvedValue({query:'Telegram',niches:[],networks:['telegram'],mode:'semantic'})
    composeSearchForTest({interpret})
    const response = await app.inject({ method: 'GET', url: '/api/v1/search?q=Telegram', headers: { host: 'temlinkaqui.com' } })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      target: { kind: 'network', slug: 'telegram', name: 'Telegram' },
      facets:[{kind:'network',slug:'telegram',name:'Telegram',requiresAge:false}],
      threshold: 0.35,
      showImpressions: true,
    })
    expect(response.json().sponsored.map((row:{id:string})=>row.id)).toEqual(['pago'])
    expect(response.json().organic.map((row:{id:string})=>row.id)).toEqual(['sem-vetor'])
    expect(response.json().ageRequired).toBe(true)
    expect(embedding.calls).toEqual([])
    expect(interpret).not.toHaveBeenCalled()
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

  it('sugestão +18 pede a idade e só lista o link depois do sim', async () => {
    const unknown = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggest?q=secreto',
      headers: { host: 'temlinkaqui.com' },
    })
    expect(unknown.statusCode).toBe(200)
    expect(unknown.json().ageRequired).toBe(true)
    expect(unknown.json().ids).not.toContain('adulto')

    const confirmed = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggest?q=secreto',
      headers: { host: 'temlinkaqui.com', cookie: 'age=yes' },
    })
    expect(confirmed.json().ageRequired).toBeUndefined()
    expect(confirmed.json().ids).toContain('adulto')
    expect(confirmed.headers['cache-control']).toBe('no-store')

    const refused = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggest?q=secreto',
      headers: { host: 'temlinkaqui.com', cookie: 'age=no' },
    })
    expect(refused.json().ageRequired).toBeUndefined()
    expect(refused.json().ids).not.toContain('adulto')
  })

  it('sinônimo no autocomplete e tema com rede usam o mesmo contexto sem chamar IA',async()=>{
    const repository=getLinksRepository() as InMemoryLinksRepository
    const adult={...repository.niches[0],id:'context-adult',name:'Adulto',slug:'adulto',requiresAge:true,isPublicFacet:true}
    repository.niches.push(adult)
    setSearchCandidatesForTest([
      {id:'adult-telegram',name:'Comunidade restrita',description:'somente adultos',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:true,nicheSlug:'adulto',networkSlug:'telegram'},
      {id:'adult-discord',name:'Outra comunidade',description:'somente adultos',relevance:0,textScore:0,semanticScore:null,embeddingState:'ABSENT',searchActivatedAt:null,requiresAge:true,nicheSlug:'adulto',networkSlug:'discord'},
    ])
    try{
      const get=(path:string,cookie?:string)=>app.inject({method:'GET',url:'/api/v1/'+path,headers:{host:'temlinkaqui.com',...(cookie?{cookie}:{})}})
      const closed=await get('search/suggest?q=corno')
      expect(closed.json().ageRequired).toBe(true)
      expect(closed.json().items).toEqual([])
      expect(closed.body).not.toContain('Comunidade restrita')
      const open=await get('search/suggest?q=corno','age=yes')
      expect(open.json().ids.sort()).toEqual(['adult-discord','adult-telegram'])
      expect(open.json().facets).toContainEqual({kind:'niche',slug:'adulto',name:'Adulto',requiresAge:true})
      const combined=await get('search?q=corno%20telegram','age=yes')
      expect(combined.json().organic.map((row:{id:string})=>row.id)).toEqual(['adult-telegram'])
      expect(embedding.calls).toEqual([])
    }finally{repository.niches.splice(repository.niches.indexOf(adult),1)}
  })

  it('busca do nicho +18 pede a idade e, com o sim, devolve os links', async () => {
    const unknown = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=Apostas',
      headers: { host: 'temlinkaqui.com' },
    })
    expect(unknown.statusCode).toBe(200)
    expect(unknown.json().ageRequired).toBe(true)
    expect(unknown.json().organic).toEqual([])
    expect(embedding.calls).toEqual([])

    const confirmed = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=Apostas',
      headers: { host: 'temlinkaqui.com', cookie: 'age=yes' },
    })
    expect(confirmed.json().ageRequired).toBeUndefined()
    expect(confirmed.json().organic.map((row: { id: string }) => row.id)).toContain('adulto')
    expect(embedding.calls).toEqual([])
  })

  it('autocomplete não devolve o id adulto e não chama embedding', async () => {
    const interpret=vi.fn()
    composeSearchForTest({interpret})
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/search/suggest?q=re',
      headers: { host: 'temlinkaqui.com', cookie: 'age=no' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().ids).toEqual(['pago', 'sem-vetor'])
    expect(interpret).not.toHaveBeenCalled()
    const source = readFileSync(path.join(__dirname, 'routes.ts'), 'utf8')
    const suggest = source.slice(source.indexOf('export async function getSuggest'))
    expect(suggest).not.toContain('.embed(')
  })
})
