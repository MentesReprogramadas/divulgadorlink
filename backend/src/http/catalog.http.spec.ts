import * as randomOrdering from '@/domain/catalog/random-order'
import { randomUUID } from 'node:crypto'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '@/app'
import { readSurface } from '@/domain/analytics/surface-token'
import { resetImpressionLimitForTest } from '@/http/controllers/@Analytics/routes'
import { resetCatalogLinksForTest, setCatalogLinksForTest } from '@/http/controllers/@Catalog/routes'
import { resetEditVerdictForTest, setEditVerdictForTest } from '@/http/controllers/@Links/routes'
import { composeSearchForTest, resetSearchCandidatesForTest, setSearchCandidatesForTest } from '@/http/controllers/@Search/routes'
import { DeterministicTestEmbeddingService } from '@/test-support/deterministic-test-embedding'
import { resetRefreshRevocationsForTest } from '@/http/controllers/@auth/routes'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { InMemoryTenantsRepository } from '@/repositories/tenants-repository'
import {
  getLinksRepository,
  InMemoryLinksRepository,
  resetLinksRepositoryForTest,
} from '@/repositories/links-repository'
import { resetAuditLogsRepositoryForTest } from '@/repositories/audit-logs-repository'
import { RecordingAnalyticsRepository, setAnalyticsRepositoryForTest } from '@/repositories/analytics-repository'
import { getCheckoutStore, resetCheckoutStoreForTest } from '@/use-cases/@Promotions/checkout-store'

const HOST = 'temlinkaqui.com'
const HOST_B = 'outro.example'
const TENANT = 'seed-temlinkaqui'
const TENANT_B = 'tenant-b'
const SECRET = 'test-jwt-secret-min-16'

function repo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) throw new Error('repositório em memória esperado')
  return current
}

function token(sub: string, tenantId = TENANT, role: 'USER' | 'ADMIN' = 'USER') {
  return app.jwt.sign({ sub, role, tenantId, typ: 'access' }, { expiresIn: '5m' })
}

describe('contratos HTTP da vitrine', () => {
  beforeAll(async () => {
    await app.ready()
    setTenantsRepositoryForTest(new InMemoryTenantsRepository([
      { id: TENANT, host: HOST, name: 'Tem Link Aqui' },
      { id: TENANT_B, host: HOST_B, name: 'Outro' },
    ]))
  })

  beforeEach(async () => {
    resetLinksRepositoryForTest()
    resetCatalogLinksForTest()
    resetSearchCandidatesForTest()
    resetEditVerdictForTest()
    resetCheckoutStoreForTest()
    resetAuditLogsRepositoryForTest()
    resetImpressionLimitForTest()
    setAnalyticsRepositoryForTest(new RecordingAnalyticsRepository())
    await resetRefreshRevocationsForTest()
    repo().addUser({ id: 'ana', tenantId: TENANT, status: 'ACTIVE', identifiers: [] })
  })

  it('home devolve SEO, facetas públicas e token de superfície sem dado interno', async () => {
    setCatalogLinksForTest([
      {
        id: 'home-pago', name: 'Receitas', description: 'bolos', relevance: 1, requiresAge: false,
        nicheSlug: 'jogos', networkSlug: 'telegram', homeActivatedAt: new Date('2026-09-01'), nicheActivatedAt: null,
      },
      {
        id: 'home-organo', name: 'Massas', description: 'molhos', relevance: 2, requiresAge: false,
        nicheSlug: 'jogos', networkSlug: 'telegram', homeActivatedAt: null, nicheActivatedAt: null,
      },
      {
        id: 'home-adulto', name: 'Oculto', description: 'nao', relevance: 3, requiresAge: true,
        nicheSlug: 'apostas', networkSlug: 'telegram', homeActivatedAt: new Date('2026-09-02'), nicheActivatedAt: null,
      },
    ])
    const analytics = new RecordingAnalyticsRepository()
    setAnalyticsRepositoryForTest(analytics)
    await analytics.insert({
      tenantId: TENANT, sessionId: '11111111-1111-1111-1111-111111111111', linkId: 'home-pago',
      surface: 'HOME', day: '2026-09-01', kind: 'IMPRESSION',
    })
    await analytics.insert({
      tenantId: TENANT, sessionId: '11111111-1111-1111-1111-111111111111', linkId: 'home-pago',
      surface: 'HOME', day: '2026-09-01', kind: 'IMPRESSION',
    })
    const response = await app.inject({ method: 'GET', url: '/api/v1/home', headers: { host: HOST } })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.seo).toMatchObject({
      title: 'Grupos, canais e links por categoria | Tem Link Aqui',
      description: 'Encontre grupos de WhatsApp, canais do Telegram, servidores Discord, perfis e sites por tema. Explore ofertas, comunidades e conteúdos publicados no catálogo.',
      robots: 'index,follow',
    })
    expect(body.seo.canonical).toBe('https://temlinkaqui.com/')
    expect(body.seo.structuredData).toMatchObject({ '@type': 'WebSite', url: 'https://temlinkaqui.com/' })
    expect(body.networks.map((row: { slug: string }) => row.slug)).toContain('telegram')
    expect(body.niches.map((row: { slug: string }) => row.slug)).toEqual(['jogos', 'apostas'])
    expect(body.niches.find((row: { slug: string }) => row.slug === 'apostas')).toMatchObject({ requiresAge: true })
    expect(body.sponsored.map((row: { id: string }) => row.id)).toEqual(['home-pago'])
    expect(body.organic.map((row: { id: string }) => row.id)).toEqual(['home-organo'])
    expect(readSurface(TENANT, 'home-pago', body.sponsored[0].surfaceToken, SECRET)).toBe('home')
    expect(body.sponsored[0].impressions).toBe(1)
    expect(body.organic[0].impressions).toBe(0)
    expect(JSON.stringify(body)).not.toMatch(/ownerId|tenantId|password|gateway|moderation|home-adulto|Oculto/)
  })

  it('nicho e rede emitem o token da origem e slug de outro tenant não existe', async () => {
    repo().addLink({id:'no-nicho',tenantId:TENANT,status:'PUBLISHED',name:'Grupo',description:'jogos'})
    setCatalogLinksForTest([
      {
        id: 'no-nicho', name: 'Grupo', description: 'jogos', relevance: 1, requiresAge: false,
        nicheSlug: 'jogos', networkSlug: 'telegram', homeActivatedAt: null, nicheActivatedAt: new Date('2026-09-01'),
      },
    ])
    const niche = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos', headers: { host: HOST } })
    const network = await app.inject({ method: 'GET', url: '/api/v1/networks/telegram', headers: { host: HOST } })
    const missing = await app.inject({ method: 'GET', url: '/api/v1/niches/nao-existe', headers: { host: HOST } })
    expect(niche.statusCode).toBe(200)
    expect(network.statusCode).toBe(200)
    expect(niche.json().seo).toMatchObject({
      title: 'Grupos e servidores de jogos | Tem Link Aqui',
      description: 'Descubra comunidades e servidores por jogo e rede. Encontre apresentações de grupos para conversar, trocar experiências e organizar partidas.',
      canonical: 'https://temlinkaqui.com/nicho/jogos',
      robots: 'index,follow',
    })
    expect(niche.json().heading).toBe('Grupos e servidores de jogos')
    expect(niche.json().seo.structuredData['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'CollectionPage' }),
    ]))
    expect(network.json().seo).toMatchObject({
      title: 'Grupos e canais do Telegram | Tem Link Aqui',
      robots: 'index,follow',
    })
    const filtered = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos?network=telegram', headers: { host: HOST } })
    expect(filtered.json().seo).toMatchObject({
      canonical: 'https://temlinkaqui.com/nicho/jogos',
      robots: 'noindex,follow',
    })
    const cursorValue = Buffer.from(JSON.stringify({ kind: 'organic', activatedAt: null, id: 'no-nicho' }), 'utf8').toString('base64url')
    const cursor = await app.inject({ method: 'GET', url: `/api/v1/niches/jogos?cursor=${cursorValue}`, headers: { host: HOST } })
    expect(cursor.statusCode).toBe(200)
    expect(cursor.json().seo.robots).toBe('noindex,follow')
    expect(readSurface(TENANT, 'no-nicho', niche.json().sponsored[0].surfaceToken, SECRET)).toBe('niche-home')
    expect(readSurface(TENANT, 'no-nicho', network.json().sponsored[0].surfaceToken, SECRET)).toBe('network-home')
    expect(missing.statusCode).toBe(404)
    expect(missing.json()).toMatchObject({ code: 'not_found' })
  })

  it('rede mista oferece maioridade sem expor links restritos e inclui ambos após aceite', async () => {
    setCatalogLinksForTest([
      { id: 'livre-rede', name: 'Grupo livre', description: 'conversas', relevance: 1, requiresAge: false, nicheSlug: 'jogos', networkSlug: 'telegram', homeActivatedAt: null, nicheActivatedAt: null, languageTag: 'en' },
      { id: 'restrito-rede', name: 'Material restrito', description: 'privado antes do aceite', relevance: 1, requiresAge: true, nicheSlug: 'apostas', networkSlug: 'telegram', homeActivatedAt: null, nicheActivatedAt: null, languageTag: 'pt' },
    ])
    const get = (cookie?: string, query = '') => app.inject({ method: 'GET', url: '/api/v1/networks/telegram' + query, headers: { host: HOST, ...(cookie ? { cookie } : {}) } })
    const unknown = await get()
    expect(unknown.json().ageRequired).toBe(true)
    expect(unknown.json().organic.map((row: {id:string}) => row.id)).toEqual(['livre-rede'])
    expect(unknown.body).not.toMatch(/restrito-rede|Material restrito|privado antes/)
    const accepted = await get('age=yes')
    expect(accepted.json().organic.map((row: {id:string}) => row.id).sort()).toEqual(['livre-rede', 'restrito-rede'])
    expect(accepted.json().ageRequired).not.toBe(true)
    const refused = await get('age=no')
    expect(refused.json().ageRequired).not.toBe(true)
    expect(refused.body).not.toContain('restrito-rede')
    expect((await get(undefined, '?languageTag=en')).json().ageRequired).not.toBe(true)
  })

  it('link restrito pela rede permanece fora dos dados indexáveis do nicho livre após o aceite',async()=>{
    repo().networks.push({...repo().networks[0],id:'network-age-seo',tenantId:TENANT,name:'Rede restrita',slug:'restrita',isPublicFacet:true,requiresAge:true})
    setCatalogLinksForTest([{id:'restrito-redeseo',name:'Restrito',description:'restrito',relevance:1,requiresAge:true,nicheSlug:'jogos',networkSlug:'restrita',homeActivatedAt:null,nicheActivatedAt:null}])
    const response=await app.inject({method:'GET',url:'/api/v1/niches/jogos',headers:{host:HOST,cookie:'age=yes'}})
    expect(response.json().organic[0].indexable).toBe(false)
    expect(JSON.stringify(response.json().seo.structuredData??{})).not.toContain('/link/restrito-redeseo')
  })

  it('busca e autocomplete devolvem no máximo 8 e o token não troca de link', async () => {
    const embedding = new DeterministicTestEmbeddingService()
    composeSearchForTest({ embedding: () => embedding })
    setSearchCandidatesForTest(Array.from({ length: 9 }, (_, index) => ({
      id: `s${index}`,
      name: `Receita ${index}`,
      description: 'doces',
      relevance: 0,
      textScore: 1,
      semanticScore: 1,
      embeddingState: 'READY' as const,
      searchActivatedAt: null,
      requiresAge: false,
    })))
    const search = await app.inject({ method: 'GET', url: '/api/v1/search?q=receita', headers: { host: HOST } })
    const suggest = await app.inject({ method: 'GET', url: '/api/v1/search/suggest?q=re', headers: { host: HOST } })
    expect(search.statusCode).toBe(200)
    expect(suggest.json().ids).toHaveLength(8)
    expect(suggest.json().items).toHaveLength(8)
    const first = search.json().organic[0]
    expect(readSurface(TENANT, first.id, first.surfaceToken, SECRET)).toBe('search')
    expect(readSurface(TENANT_B, first.id, first.surfaceToken, SECRET)).toBeNull()
    expect(JSON.stringify(search.json())).not.toMatch(/ownerId|canonicalUrl|passwordHash/)
  })

  it('página pública distingue publicado, indisponível e o que não é deste tenant', async () => {
    const published = repo().addLink({
      id: 'link-publico', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED',
      name: '<script>alert(1)</script>', description: 'bolos', canonicalUrl: 'https://t.me/secreto',
    })
    repo().addLink({ id: 'link-off', tenantId: TENANT, ownerId: 'ana', status: 'UNAVAILABLE', name: 'Banido', description: 'motivo interno' })
    repo().addLink({ id: 'link-b', tenantId: TENANT_B, ownerId: 'bia', status: 'PUBLISHED', name: 'Do outro', description: 'x', canonicalUrl: 'https://t.me/outro' })

    const open = await app.inject({ method: 'GET', url: `/api/v1/links/${published.id}`, headers: { host: HOST } })
    const unavailable = await app.inject({ method: 'GET', url: '/api/v1/links/link-off', headers: { host: HOST } })
    const missing = await app.inject({ method: 'GET', url: '/api/v1/links/nao-existe', headers: { host: HOST } })
    const foreign = await app.inject({ method: 'GET', url: '/api/v1/links/link-b', headers: { host: HOST } })

    expect(open.statusCode).toBe(200)
    expect(open.headers['content-type']).toContain('application/json')
    expect(open.json().name).toBe('<script>alert(1)</script>')
    expect(open.json().goPath).toContain('/go/link-publico?surfaceToken=')
    expect(open.json().seo).toMatchObject({
      canonical: 'https://temlinkaqui.com/link/link-publico',
      robots: 'index,follow',
    })
    expect(readSurface(TENANT, published.id, open.json().surfaceToken, SECRET)).toBe('organic')
    expect(JSON.stringify(open.json())).not.toMatch(/t\.me\/secreto|ownerId|tenantId|Banido|motivo/)
    expect(open.headers.location).toBeUndefined()

    expect(unavailable.statusCode).toBe(200)
    expect(unavailable.json()).toMatchObject({
      id: 'link-off',
      available: false,
      seo: { canonical: 'https://temlinkaqui.com/link/link-off', robots: 'noindex,nofollow' },
    })
    expect(JSON.stringify(unavailable.json())).not.toMatch(/Banido|motivo|t\.me/)

    expect(missing.statusCode).toBe(404)
    expect(foreign.statusCode).toBe(404)
    expect(foreign.json()).toMatchObject({ code: 'not_found', message: missing.json().message })
  })

  it('nicho 18+ fica noindex mesmo com a idade confirmada', async () => {
    const hidden = await app.inject({
      method: 'GET',
      url: '/api/v1/niches/apostas',
      headers: { host: HOST, cookie: 'age=yes' },
    })
    expect(hidden.statusCode).toBe(200)
    expect(hidden.json().seo).toMatchObject({
      canonical: 'https://temlinkaqui.com/nicho/apostas',
      robots: 'noindex,nofollow',
    })
  })

  it('metadata restrita permanece baseada na apresentação pública, com ou sem idade confirmada', async () => {
    const fat = 'c'.repeat(80)
    const adultNiche = repo().niches.find((row) => row.id === 'niche-apostas')!
    adultNiche.summary = fat
    const closed = await app.inject({ method: 'GET', url: '/api/v1/niches/apostas', headers: { host: HOST } })
    expect(closed.statusCode).toBe(200)
    expect(closed.json().seo.description).toContain('apostas esportivas')
    expect(closed.json().seo.description).not.toContain(fat)
    expect(closed.json().seo.robots).toBe('noindex,nofollow')
    const open = await app.inject({ method: 'GET', url: '/api/v1/niches/apostas', headers: { host: HOST, cookie: 'age=yes' } })
    expect(open.json().seo.description).toBe(closed.json().seo.description)
    expect(open.json().seo.robots).toBe('noindex,nofollow')
  })

  it('rede pública filtrada por nicho 18+ fica noindex,nofollow', async () => {
    const page = await app.inject({
      method: 'GET',
      url: '/api/v1/networks/telegram?niche=apostas',
      headers: { host: HOST },
    })
    expect(page.statusCode).toBe(200)
    expect(page.json().seo.robots).toBe('noindex,nofollow')
  })

  it('faceta e links públicos entram mesmo com texto curto, e 18+ continua fora', async () => {
    const fat = 'c'.repeat(80)
    const niche = repo().niches.find((row) => row.id === 'niche-jogos')!
    niche.summary = fat
    repo().addLink({
      id: 'link-gordo', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED',
      name: 'Receitas', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram',
    })
    repo().addLink({
      id: 'link-gordo-2', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED',
      name: 'Receitas dois', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram',
    })
    repo().addLink({
      id: 'link-gordo-3', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED',
      name: 'Receitas tres', description: fat, nicheId: 'niche-jogos', networkId: 'net-telegram',
    })
    repo().addLink({
      id: 'link-fino', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED',
      name: 'Curto', description: 'x', nicheId: 'niche-jogos', networkId: 'net-telegram',
    })
    const page = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos', headers: { host: HOST } })
    expect(page.json().seo).toMatchObject({
      title: 'Grupos e servidores de jogos | Tem Link Aqui',
      description: fat,
      robots: 'index,follow',
    })
    expect(page.json().seo.structuredData['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'CollectionPage' }),
      expect.objectContaining({ '@type': 'BreadcrumbList' }),
    ]))
    const open = await app.inject({ method: 'GET', url: '/api/v1/links/link-gordo', headers: { host: HOST } })
    expect(open.json().seo).toMatchObject({
      title: 'Receitas | Tem Link Aqui',
      robots: 'index,follow',
    })
    const thin = await app.inject({ method: 'GET', url: '/api/v1/links/link-fino', headers: { host: HOST } })
    expect(thin.statusCode).toBe(200)
    expect(thin.json().seo.robots).toBe('index,follow')
    expect(thin.json().seo.structuredData).toBeDefined()
    const adultNiche = repo().niches.find((row) => row.id === 'niche-apostas')!
    adultNiche.summary = fat
    const adult = await app.inject({ method: 'GET', url: '/api/v1/niches/apostas', headers: { host: HOST, cookie: 'age=yes' } })
    expect(adult.json().seo.robots).toBe('noindex,nofollow')
    const map = await app.inject({ method: 'GET', url: '/api/v1/sitemap', headers: { host: HOST } })
    const paths = map.json().entries.map((row: { path: string }) => row.path)
    expect(paths).toEqual(expect.arrayContaining(['/', '/nicho/jogos', '/link/link-gordo']))
    expect(paths).toContain('/link/link-fino')
    expect(paths).not.toContain('/nicho/apostas')
    expect(map.json().entries.find((row: { path: string }) => row.path === '/nicho/jogos').updatedAt)
      .toBe(niche.updatedAt.toISOString())
  })

  it('faceta indexável inclui o card curto no ItemList sem surfaceToken', async () => {
    repo().addLink({id:'card-gordo',tenantId:TENANT,status:'PUBLISHED',name:'Receitas',description:'Bolos'})
    setCatalogLinksForTest([
      {
        id: 'card-gordo', name: 'Receitas', description: 'Bolos', relevance: 1, requiresAge: false,
        nicheSlug: 'jogos', networkSlug: 'telegram', homeActivatedAt: null, nicheActivatedAt: null,
      },
    ])
    const page = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos', headers: { host: HOST } })
    expect(page.statusCode).toBe(200)
    const graph = page.json().seo.structuredData['@graph'] as Array<{ '@type': string; itemListElement?: Array<{ url: string }> }>
    const list = graph.find((node) => node['@type'] === 'ItemList')
    expect(list?.itemListElement).toEqual([
      expect.objectContaining({ url: 'https://temlinkaqui.com/link/card-gordo' }),
    ])
    expect(JSON.stringify(list)).not.toContain('surfaceToken')
  })

  it('sitemap inclui facetas e links curtos, e esconde 18+, indisponível e banido', async () => {
    repo().addLink({ id: 'link-publico', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED', name: 'Receitas', description: 'bolos', nicheId: 'niche-jogos' })
    repo().addLink({ id: 'link-adulto', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED', name: 'Oculto', description: 'x', nicheId: 'niche-apostas' })
    repo().addLink({ id: 'link-off', tenantId: TENANT, ownerId: 'ana', status: 'UNAVAILABLE', name: 'Fora', description: 'x' })
    repo().addUser({ id: 'ban', tenantId: TENANT, status: 'BANNED', identifiers: [] })
    repo().addLink({ id: 'link-ban', tenantId: TENANT, ownerId: 'ban', status: 'PUBLISHED', name: 'Banido', description: 'x', nicheId: 'niche-jogos' })
    const response = await app.inject({ method: 'GET', url: '/api/v1/sitemap', headers: { host: HOST } })
    expect(response.statusCode).toBe(200)
    const paths = response.json().entries.map((row: { path: string }) => row.path)
    expect(paths).toEqual(expect.arrayContaining(['/', '/nicho/jogos', '/rede/telegram', '/link/link-publico', '/privacidade', '/termos']))
    for (const hidden of ['/nicho/apostas', '/rede/outro', '/link/link-adulto', '/link/link-off', '/link/link-ban']) {
      expect(paths).not.toContain(hidden)
    }
    expect(JSON.stringify(response.json())).not.toMatch(/t\.me|ownerId|Oculto|Banido/)
    const other = await app.inject({ method: 'GET', url: '/api/v1/sitemap', headers: { host: HOST_B } })
    expect(other.json().entries.map((row: { path: string }) => row.path)).not.toContain('/link/link-publico')
  })

  it('impressão usa o token da listagem e rejeita superfície trocada', async () => {
    repo().addLink({ id: 'link-publico', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED', name: 'Receitas', description: 'bolos' })
    const page = await app.inject({ method: 'GET', url: '/api/v1/links/link-publico', headers: { host: HOST } })
    const impression = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST },
      payload: { linkId: 'link-publico', surfaceToken: page.json().surfaceToken },
    })
    const forged = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/impressions',
      headers: { host: HOST },
      payload: { linkId: 'link-publico', surfaceToken: 'home.trocado', tenantId: TENANT_B },
    })
    expect(impression.statusCode).toBe(201)
    expect(forged.statusCode).toBe(400)
    expect(JSON.stringify(forged.json())).not.toMatch(/23505|prisma|SELECT|secret/i)
  })

  it('refresh gira o cookie, replay falha e logout é idempotente', async () => {
    const csrf = 'c'.repeat(32)
    const withCsrf = (refreshToken: string) => ({
      host: HOST,
      cookie: `refreshToken=${refreshToken}; csrf=${csrf}`,
      'x-csrf-token': csrf,
    })
    const refresh = app.jwt.sign(
      { sub: 'ana', role: 'USER', tenantId: TENANT, typ: 'refresh', jti: 'jti-1' },
      { expiresIn: '7d' },
    )
    const missingCsrf = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { host: HOST, cookie: `refreshToken=${refresh}` },
    })
    expect(missingCsrf.statusCode).toBe(403)
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: withCsrf(refresh),
    })
    expect(first.statusCode).toBe(200)
    expect(first.json()).toMatchObject({ role: 'USER' })
    expect(first.json().token).toBeUndefined()
    expect(first.json().refreshToken).toBeUndefined()
    expect(first.cookies.find((cookie) => cookie.name === 'accessToken')?.httpOnly).toBe(true)
    expect(JSON.stringify(first.json())).not.toContain(refresh)
    const rotated = first.cookies.find((cookie) => cookie.name === 'refreshToken')
    expect(rotated?.httpOnly).toBe(true)
    expect(rotated?.sameSite).toBe('Lax')

    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: withCsrf(refresh),
    })
    expect(replay.statusCode).toBe(401)
    expect(replay.json()).toMatchObject({ code: 'unauthenticated' })

    const foreign = app.jwt.sign(
      { sub: 'ana', role: 'USER', tenantId: TENANT_B, typ: 'refresh', jti: 'jti-b' },
      { expiresIn: '7d' },
    )
    const wrongHost = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: withCsrf(foreign),
    })
    expect(wrongHost.statusCode).toBe(403)

    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: withCsrf(rotated?.value ?? ''),
    })
    const again = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { host: HOST } })
    expect(logout.statusCode).toBe(204)
    expect(again.statusCode).toBe(204)
    const after = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: withCsrf(rotated?.value ?? ''),
    })
    expect(after.statusCode).toBe(401)
  })

  it('cookie de acesso autentica GET e mutação por cookie exige CSRF', async () => {
    const link = repo().addLink({
      id: 'link-1', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED', name: 'Receitas', description: 'bolos',
    })
    const access = token('ana')
    const csrf = 'd'.repeat(32)
    const mine = await app.inject({
      method: 'GET',
      url: '/api/v1/links/mine',
      headers: { host: HOST, cookie: `accessToken=${access}` },
    })
    expect(mine.statusCode).toBe(200)

    const payload = { name: 'Bolos', description: 'novos' }
    const noHeader = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers: { host: HOST, cookie: `accessToken=${access}; csrf=${csrf}` },
      payload,
    })
    const wrongHeader = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers: { host: HOST, cookie: `accessToken=${access}; csrf=${csrf}`, 'x-csrf-token': 'e'.repeat(32) },
      payload,
    })
    const shortToken = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers: { host: HOST, cookie: `accessToken=${access}; csrf=abc`, 'x-csrf-token': 'abc' },
      payload,
    })
    expect(noHeader.statusCode).toBe(403)
    expect(noHeader.json()).toMatchObject({ code: 'forbidden' })
    expect(wrongHeader.statusCode).toBe(403)
    expect(shortToken.statusCode).toBe(403)
    expect(repo().links[0]?.name).toBe('Receitas')

    setEditVerdictForTest('PUBLISH')
    const valid = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers: { host: HOST, cookie: `accessToken=${access}; csrf=${csrf}`, 'x-csrf-token': csrf },
      payload,
    })
    expect(valid.statusCode).toBe(200)
    expect(repo().links[0]?.name).toBe('Bolos')

    const refreshTyp = app.jwt.sign({ sub: 'ana', role: 'USER', tenantId: TENANT, typ: 'refresh', jti: 'x' }, { expiresIn: '7d' })
    const refreshAsAccess = await app.inject({
      method: 'GET',
      url: '/api/v1/links/mine',
      headers: { host: HOST, cookie: `accessToken=${refreshTyp}` },
    })
    expect(refreshAsAccess.statusCode).toBe(401)
  })

  it('refresh emite csrf legível e cookies de sessão httpOnly', async () => {
    const csrf = 'c'.repeat(32)
    const refresh = app.jwt.sign(
      { sub: 'ana', role: 'USER', tenantId: TENANT, typ: 'refresh', jti: `jti-${randomUUID()}` },
      { expiresIn: '7d' },
    )
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { host: HOST, cookie: `refreshToken=${refresh}; csrf=${csrf}`, 'x-csrf-token': csrf },
    })
    expect(response.statusCode).toBe(200)
    const byName = new Map(response.cookies.map((cookie) => [cookie.name, cookie]))
    expect(byName.get('accessToken')?.httpOnly).toBe(true)
    expect(byName.get('refreshToken')?.httpOnly).toBe(true)
    expect(byName.get('csrf')?.httpOnly).toBeFalsy()
    expect(byName.get('csrf')?.value).toMatch(/^[0-9a-f]{64}$/)
    expect(byName.get('csrf')?.value).not.toBe(csrf)
  })

  it.each(['/api/v1/home', '/api/v1/niches/jogos?network=telegram', '/api/v1/networks/telegram?niche=jogos'])(
    '%s sorteia a abertura e mantém o cursor ao carregar mais', async (endpoint) => {
      setCatalogLinksForTest(Array.from({ length: 20 }, (_, i) => ({
        id: `r${i}`, name: `Link ${i}`, description: 'd', relevance: i, requiresAge: false,
        nicheSlug: 'jogos', networkSlug: 'telegram',
        homeActivatedAt: i < 5 ? new Date('2026-09-01') : null,
        nicheActivatedAt: i < 5 ? new Date('2026-09-01') : null,
      })))
      const seed = vi.spyOn(randomOrdering, 'newOrderSeed')
      try {
        const orders: string[][] = []
        for (const value of ['a'.repeat(32), 'b'.repeat(32)]) {
          seed.mockReturnValue(value)
          const ids: string[] = []
          let cursor: string | null = null
          const separator = endpoint.includes('?') ? '&' : '?'
          do {
            const url: string = `${endpoint}${separator}limit=3${cursor ? `&cursor=${cursor}` : ''}`
            const response = await app.inject({ method: 'GET', url, headers: { host: HOST } })
            expect(response.statusCode).toBe(200)
            expect(response.headers['cache-control']).toBe('no-store')
            const body = response.json()
            ids.push(...[...body.sponsored, ...body.organic].map((row: { id: string }) => row.id))
            cursor = body.nextCursor
            if (cursor) expect(JSON.parse(Buffer.from(cursor, 'base64url').toString()).seed).toBe(value)
          } while (cursor && ids.length < 30)
          expect(ids).toHaveLength(20)
          expect(new Set(ids).size).toBe(20)
          expect(ids.slice(0, 5).sort()).toEqual(['r0', 'r1', 'r2', 'r3', 'r4'])
          orders.push(ids)
        }
        expect(orders[0]).not.toEqual(orders[1])
        expect([...orders[0]].sort()).toEqual([...orders[1]].sort())
      } finally {
        seed.mockRestore()
      }
    },
  )

  it('home pagina por cursor sem duplicar, limita tamanho e rejeita cursor inválido', async () => {
    setCatalogLinksForTest(Array.from({ length: 60 }, (_, index) => ({
      id: `l${String(index).padStart(2, '0')}`,
      name: `Link ${index}`,
      description: 'd',
      relevance: 0,
      requiresAge: false,
      nicheSlug: 'jogos',
      networkSlug: 'telegram',
      homeActivatedAt: index < 3 ? new Date(`2026-09-0${index + 1}`) : null,
      nicheActivatedAt: null,
    })))
    const seen: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const url: string = `/api/v1/home?limit=25${cursor ? `&cursor=${cursor}` : ''}`
      const response = await app.inject({ method: 'GET', url, headers: { host: HOST } })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      const ids = [...body.sponsored, ...body.organic].map((row: { id: string }) => row.id)
      expect(ids.length).toBeLessThanOrEqual(25)
      seen.push(...ids)
      cursor = body.nextCursor
      pages += 1
    } while (cursor && pages < 10)
    expect(pages).toBe(3)
    expect(new Set(seen).size).toBe(60)
    expect(seen.slice(0, 3).sort()).toEqual(['l00', 'l01', 'l02'])

    const huge = await app.inject({ method: 'GET', url: '/api/v1/home?limit=999999', headers: { host: HOST } })
    const hugeBody = huge.json()
    expect(hugeBody.sponsored.length + hugeBody.organic.length).toBe(50)

    const garbage = await app.inject({ method: 'GET', url: '/api/v1/home?cursor=lixo', headers: { host: HOST } })
    expect(garbage.statusCode).toBe(400)
    expect(garbage.json()).toMatchObject({ code: 'validation' })

    const forged = Buffer.from(JSON.stringify({ kind: 'organic', activatedAt: null, id: 'nao-existe' })).toString('base64url')
    const unknown = await app.inject({ method: 'GET', url: `/api/v1/home?cursor=${forged}`, headers: { host: HOST } })
    expect(unknown.statusCode).toBe(400)
  })

  it('edição aceita só nome e descrição e não publica texto bloqueado', async () => {
    const link = repo().addLink({
      id: 'link-1', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED', name: 'Receitas', description: 'bolos',
    })
    const headers = { host: HOST, authorization: `Bearer ${token('ana')}` }
    const extra = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers,
      payload: { name: 'Bolos', description: 'novos', url: 'https://evil.example', tenantId: TENANT_B },
    })
    expect(extra.statusCode).toBe(400)
    expect(repo().links[0]?.name).toBe('Receitas')

    const blocked = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers,
      payload: { name: 'pix 11999999999', description: 'bolos' },
    })
    expect(blocked.statusCode).toBe(200)
    expect(blocked.json()).toMatchObject({ applied: false, ranAi: false, name: 'Receitas' })

    setEditVerdictForTest('PUBLISH')
    const published = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers,
      payload: { name: 'Bolos', description: 'novos' },
    })
    expect(published.statusCode).toBe(200)
    expect(published.json()).toMatchObject({ applied: true, name: 'Bolos', description: 'novos' })
    expect(repo().links[0]?.name).toBe('Bolos')

    repo().addUser({ id: 'bia', tenantId: TENANT, status: 'ACTIVE', identifiers: [] })
    const idor = await app.inject({
      method: 'PATCH',
      url: `/api/v1/links/${link.id}`,
      headers: { host: HOST, authorization: `Bearer ${token('bia')}` },
      payload: { name: 'Roubo', description: 'x' },
    })
    expect(idor.statusCode).toBe(404)

    const foreignJwt = await app.inject({
      method: 'GET',
      url: '/api/v1/links/mine',
      headers: { host: HOST, authorization: `Bearer ${token('ana', TENANT_B)}` },
    })
    expect(foreignJwt.statusCode).toBe(403)
  })

  it('pedidos e promoções do dono não vazam provider nem pedido alheio', async () => {
    const link = repo().addLink({ id: 'link-1', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED' })
    const created = await getCheckoutStore().createPending({
      tenantId: TENANT,
      userId: 'ana',
      linkId: link.id,
      method: 'PIX',
      surfaces: ['SEARCH'],
      durationDays: 7,
      productCode: 'SEARCH',
      amountCents: 790,
      savingsCents: 0,
      idempotencyKey: 'chave',
      renewal: false,
      pixExpiresAt: new Date('2026-09-29T12:00:00Z'),
    })
    await getCheckoutStore().attachCharge(created.order.id, { gatewayChargeId: 'gw-secreto', brCode: 'pix-secreto' })
    getCheckoutStore().promotions.push({
      id: 'promo-1',
      linkId: link.id,
      surface: 'SEARCH',
      status: 'ACTIVE',
      activatedAt: new Date('2026-09-01T00:00:00Z'),
      expiresAt: new Date('2026-09-29T00:00:00Z'),
    })
    const headers = { host: HOST, authorization: `Bearer ${token('ana')}` }
    const orders = await app.inject({ method: 'GET', url: '/api/v1/orders/mine', headers })
    const one = await app.inject({ method: 'GET', url: `/api/v1/orders/${created.order.id}`, headers })
    const promotions = await app.inject({ method: 'GET', url: '/api/v1/promotions/mine', headers })
    expect(orders.statusCode).toBe(200)
    expect(one.json()).toMatchObject({ amountCents: 790, chargeStarted: true, status: 'PENDING_PAYMENT', brCode: 'pix-secreto' })
    expect(JSON.stringify(orders.json())).not.toMatch(/pix-secreto|gw-secreto|gatewayChargeId/)
    expect(JSON.stringify(one.json())).not.toMatch(/gw-secreto|gatewayChargeId/)
    expect(promotions.json().promotions).toHaveLength(1)

    repo().addUser({ id: 'bia', tenantId: TENANT, status: 'ACTIVE', identifiers: [] })
    const bola = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${created.order.id}`,
      headers: { host: HOST, authorization: `Bearer ${token('bia')}` },
    })
    expect(bola.statusCode).toBe(404)
    expect(JSON.stringify(bola.json())).not.toMatch(/790|gw-secreto/)
  })

  it('método inválido e rajada de impressão continuam no contrato de erro', async () => {
    repo().addLink({ id: 'link-publico', tenantId: TENANT, ownerId: 'ana', status: 'PUBLISHED', name: 'Receitas', description: 'bolos' })
    const page = await app.inject({ method: 'GET', url: '/api/v1/links/link-publico', headers: { host: HOST } })
    const method = await app.inject({
      method: 'POST',
      url: '/api/v1/promotions/checkout',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}` },
      payload: { linkId: 'link-publico', surfaces: ['SEARCH'], durationDays: 7, method: 'BOLETO' },
    })
    expect(method.statusCode).toBe(400)
    let last = 0
    let cookie = ''
    for (let index = 0; index < 31; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/impressions',
        headers: { host: HOST, cookie },
        payload: { linkId: 'link-publico', surfaceToken: page.json().surfaceToken },
      })
      const session = response.cookies.find((item) => item.name === 'analyticsSession')
      if (session) cookie = `analyticsSession=${session.value}`
      last = response.statusCode
    }
    expect(last).toBe(429)
  })
})
