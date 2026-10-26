import { describe, expect, it } from 'vitest'
import { metadataFromSeo, PRIVATE_PATHS, publicHost, requestHost, searchMetadata, sitemapUrls } from '@/domain/crawler-policy'
import { jsonLdScript } from '@/domain/json-ld'
import { homeStructuredData } from '@/domain/home-structured-data'

describe('política de rastreio', () => {
  it('classifica apenas a representação explícita indicada pelo servidor', () => {
    const base = { title: 'Comunidades', description: 'Descrição pública', canonical: 'https://temlinkaqui.com/nicho/adulto', robots: 'index,follow' }
    expect(metadataFromSeo({ ...base, rating: 'adult' }).other).toEqual({ rating: 'adult' })
    expect(metadataFromSeo(base).other).toBeUndefined()
  })
  it('bloqueia áreas privadas, mas deixa o redirect rastreável com noindex próprio', () => {
    expect(PRIVATE_PATHS).toEqual(expect.arrayContaining([
      '/painel', '/admin', '/login', '/cadastro', '/esqueci-senha', '/recuperar-senha', '/nao-encontrado', '/bff',
    ]))
    expect(PRIVATE_PATHS).not.toContain('/go')
    expect(PRIVATE_PATHS).not.toContain('/busca')
    expect(searchMetadata.robots).toEqual({ index: false, follow: true })
  })

  it('normaliza o host público para sitemap e robots', () => {
    expect(requestHost('WWW.TemLinkAqui.com:443', 'localhost')).toBe('temlinkaqui.com')
    expect(publicHost('links.temlinkaqui.com')).toBe('temlinkaqui.com')
    expect(publicHost('www.outro.example')).toBe('www.outro.example')
  })

  it('monta o canonical a partir do robots da API', () => {
    const metadata = metadataFromSeo({
      title: 'Jogos',
      description: 'Links de Jogos organizados por rede.',
      canonical: 'https://temlinkaqui.com/nicho/jogos',
      robots: 'index,follow',
      openGraph: { title: 'Jogos', description: 'Links de Jogos organizados por rede.', url: 'https://temlinkaqui.com/nicho/jogos' },
    })
    expect(metadata).toMatchObject({
      title: 'Jogos',
      robots: { index: true, follow: true },
      alternates: { canonical: 'https://temlinkaqui.com/nicho/jogos' },
    })
    expect(metadataFromSeo({
      title: 'Apostas',
      description: 'Apostas',
      canonical: 'https://temlinkaqui.com/nicho/apostas',
      robots: 'noindex,nofollow',
    }).robots).toEqual({ index: false, follow: false })
  })

  it('noindex,follow não marca follow como falso', () => {
    expect(metadataFromSeo({
      title: 'Jogos | Tem Link Aqui',
      description: 'Links de Jogos organizados por rede.',
      canonical: 'https://temlinkaqui.com/nicho/jogos',
      robots: 'noindex,follow',
    }).robots).toEqual({ index: false, follow: true })
  })

  it('publica o sitemap só com as URLs absolutas do host', () => {
    expect(sitemapUrls('temlinkaqui.com', [
      { path: '/', updatedAt: '2026-10-01T00:00:00.000Z' },
      { path: '/link/abc', updatedAt: '2026-10-02T00:00:00.000Z' },
    ])).toEqual([
      { url: 'https://temlinkaqui.com/', lastModified: '2026-10-01T00:00:00.000Z' },
      { url: 'https://temlinkaqui.com/link/abc', lastModified: '2026-10-02T00:00:00.000Z' },
    ])
  })
})

describe('json-ld', () => {
  it('não deixa o nome do link fechar a tag de script', () => {
    const html = jsonLdScript({ name: '</script><script>alert(1)</script>' })
    expect(html).not.toContain('<')
    expect(html).toContain('\\u003c/script>')
  })

  it('lista as fichas da home sem token e sem o destino externo', () => {
    const data = homeStructuredData(
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Tem Link Aqui', url: 'https://temlinkaqui.com/' },
      'https://temlinkaqui.com',
      ['abc'],
    )
    const html = jsonLdScript(data)
    expect(html).toContain('WebSite')
    expect(html).toContain('https://temlinkaqui.com/link/abc')
    expect(html).not.toContain('surfaceToken')
    expect(html).not.toContain('t.me')
  })
})
