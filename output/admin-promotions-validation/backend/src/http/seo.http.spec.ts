import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { resetCatalogLinksForTest, setCatalogLinksForTest } from '@/http/controllers/@Catalog/routes'
import { getLinksRepository, InMemoryLinksRepository, resetLinksRepositoryForTest } from '@/repositories/links-repository'

const host = 'temlinkaqui.com'
const tenantId = 'seed-temlinkaqui'

function repo(): InMemoryLinksRepository {
  const current = getLinksRepository()
  if (!(current instanceof InMemoryLinksRepository)) throw new Error('Expected in-memory repository')
  return current
}

describe('indexação pública HTTP', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLinksRepositoryForTest()
    resetCatalogLinksForTest()
  })

  it('home, facetas vazias e link com descrição curta são indexáveis', async () => {
    repo().addLink({ id: 'curto', tenantId, status: 'PUBLISHED', name: 'Grupo', description: 'Jogos' })
    for (const path of ['/home', '/niches/jogos', '/networks/telegram', '/links/curto']) {
      const response = await app.inject({ method: 'GET', url: `/api/v1${path}`, headers: { host } })
      expect(response.statusCode).toBe(200)
      expect(response.json().seo.robots).toBe('index,follow')
      expect(response.json().seo.structuredData).toBeDefined()
    }
    const sitemap = await app.inject({ method: 'GET', url: '/api/v1/sitemap', headers: { host } })
    expect(sitemap.json().entries.map((entry: { path: string }) => entry.path))
      .toEqual(expect.arrayContaining(['/', '/nicho/jogos', '/rede/telegram', '/link/curto']))
  })

  it('cards curtos entram no ItemList e filtros continuam com canonical da faceta', async () => {
    setCatalogLinksForTest([{
      id: 'curto', name: 'Grupo', description: 'Jogos', relevance: 1, requiresAge: false,
      nicheSlug: 'jogos', networkSlug: 'telegram', homeActivatedAt: null, nicheActivatedAt: null,
    }])
    const page = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos', headers: { host } })
    const graph = page.json().seo.structuredData['@graph'] as Array<{ '@type': string; itemListElement?: Array<{ url: string }> }>
    expect(graph.find((node) => node['@type'] === 'ItemList')?.itemListElement)
      .toEqual([expect.objectContaining({ url: 'https://temlinkaqui.com/link/curto' })])
    const filtered = await app.inject({ method: 'GET', url: '/api/v1/niches/jogos?network=telegram', headers: { host } })
    expect(filtered.json().seo).toMatchObject({ robots: 'noindex,follow', canonical: 'https://temlinkaqui.com/nicho/jogos' })
  })

  it('hosts alternativos resolvem o catálogo com canonical no domínio principal', async () => {
    for (const alias of ['www.temlinkaqui.com:443', 'links.temlinkaqui.com']) {
      const response = await app.inject({ method: 'GET', url: '/api/v1/home', headers: { host: alias } })
      expect(response.statusCode).toBe(200)
      expect(response.json().seo.canonical).toBe('https://temlinkaqui.com/')
      const sitemap = await app.inject({ method: 'GET', url: '/api/v1/sitemap', headers: { host: alias } })
      expect(sitemap.statusCode).toBe(200)
      expect(sitemap.json().entries.map((entry: { path: string }) => entry.path)).toContain('/nicho/jogos')
    }
  })

  it('sitemap exclui conteúdo privado, adulto, de outro tenant, rascunho e conta banida', async () => {
    repo().niches.push({ ...repo().niches[0]!, id: 'private', slug: 'privado', isPublicFacet: false })
    repo().addUser({ id: 'ban', tenantId, status: 'BANNED', identifiers: [] })
    repo().addLink({ id: 'adulto', tenantId, status: 'PUBLISHED', nicheId: 'niche-apostas' })
    repo().addLink({ id: 'privado', tenantId, status: 'PUBLISHED', nicheId: 'private' })
    repo().addLink({ id: 'banido', tenantId, status: 'PUBLISHED', ownerId: 'ban' })
    repo().addLink({ id: 'rascunho', tenantId, status: 'DRAFT' })
    repo().addLink({ id: 'off', tenantId, status: 'UNAVAILABLE' })
    repo().addLink({ id: 'outro', tenantId: 'other-tenant', status: 'PUBLISHED' })
    const response = await app.inject({ method: 'GET', url: '/api/v1/sitemap', headers: { host } })
    expect(response.json().entries.map((entry: { path: string }) => entry.path))
      .toEqual(['/', '/privacidade', '/termos', '/nicho/jogos', '/rede/telegram'])
    const adult = await app.inject({ method: 'GET', url: '/api/v1/links/adulto', headers: { host } })
    expect(adult.json().seo.robots).toBe('noindex,nofollow')
  })
})
