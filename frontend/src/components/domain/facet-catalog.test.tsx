import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { FacetCatalog } from '@/components/domain/facet-catalog'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}))

beforeAll(() => {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

beforeEach(() => {
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove())
})

afterEach(() => {
  cleanup()
})

const card = {
  id: 'receitas',
  name: 'Receitas',
  description: 'bolos',
  surfaceToken: 'token',
  impressions: 3,
  niche: { name: 'Jogos', slug: 'jogos' },
  network: { name: 'Telegram', slug: 'telegram' },
}

describe('catálogo de faceta', () => {
  it('entrega o título e os links no primeiro HTML', () => {
    render(
      <FacetCatalog
        pageClass="niche-page"
        descriptionClass="niche-description"
        backClass="niche-back"
        listPrefix="niche"
        mark="niche"
        route="niche"
        slug="jogos"
        facetLabel="Redes"
        facetKind="network"
        active={null}
        facets={[{ id: 'net-telegram', name: 'Telegram', slug: 'telegram' }]}
        body={{
          heading: 'Jogos',
          seo: {
            title: 'Jogos | Tem Link Aqui',
            description: 'Links de Jogos organizados por rede.',
            robots: 'index,follow',
            structuredData: { '@type': 'CollectionPage' },
          },
          showImpressions: true,
          sponsored: [],
          organic: [card],
        }}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Jogos' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Trilha' }).textContent).toContain('Início')
    expect(screen.getByRole('link', { name: 'Início' }).getAttribute('href')).toBe('/')
    expect(screen.getByText('Links de Jogos organizados por rede.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Receitas' }).getAttribute('href')).toBe('/link/receitas?surfaceToken=token')
    expect(screen.getAllByRole('link', { name: 'Telegram' }).map((link) => link.getAttribute('href'))).toContain('/nicho/jogos?rede=telegram')
    expect(screen.queryByText('Carregando')).toBeNull()
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain('CollectionPage')
  })

  it('não publica json-ld quando a faceta é noindex', () => {
    render(
      <FacetCatalog
        pageClass="niche-page"
        descriptionClass="niche-description"
        backClass="niche-back"
        listPrefix="niche"
        mark="niche"
        route="niche"
        slug="apostas"
        facetLabel="Redes"
        facetKind="network"
        active={null}
        facets={[]}
        body={{
          heading: 'Apostas',
          seo: { title: 'Apostas | Tem Link Aqui', description: 'Apostas', robots: 'noindex,nofollow' },
          ageRequired: true,
          sponsored: [],
          organic: [],
        }}
      />,
    )
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Receitas' })).toBeNull()
  })

  it('mostra o resumo longo no lugar da frase automática', () => {
    const summary = 'c'.repeat(80)
    render(
      <FacetCatalog
        pageClass="niche-page"
        descriptionClass="niche-description"
        backClass="niche-back"
        listPrefix="niche"
        mark="niche"
        route="niche"
        slug="jogos"
        facetLabel="Redes"
        facetKind="network"
        active={null}
        facets={[]}
        body={{
          heading: 'Jogos',
          seo: {
            title: 'Jogos | Tem Link Aqui',
            description: summary,
            robots: 'index,follow',
          },
          sponsored: [],
          organic: [],
        }}
      />,
    )
    expect(screen.getByText(summary)).toBeTruthy()
    expect(screen.queryByText('Links de Jogos organizados por rede.')).toBeNull()
  })

  it('noindex,follow não publica json-ld', () => {
    render(
      <FacetCatalog
        pageClass="niche-page"
        descriptionClass="niche-description"
        backClass="niche-back"
        listPrefix="niche"
        mark="niche"
        route="niche"
        slug="jogos"
        facetLabel="Redes"
        facetKind="network"
        active={null}
        facets={[]}
        body={{
          heading: 'Jogos',
          seo: {
            title: 'Jogos | Tem Link Aqui',
            description: 'Links de Jogos organizados por rede.',
            robots: 'noindex,follow',
            structuredData: { '@type': 'CollectionPage' },
          },
          sponsored: [],
          organic: [],
        }}
      />,
    )
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
  })
})
