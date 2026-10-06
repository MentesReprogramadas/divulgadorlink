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
        slug="jogos"
        facetLabel="Redes"
        facetKind="network"
        active={null}
        facets={[{ id: 'net-telegram', name: 'Telegram', slug: 'telegram' }]}
        hrefFor={(slug) => slug ? `/nicho/jogos?rede=${slug}` : '/nicho/jogos'}
        body={{
          seo: {
            title: 'Jogos',
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
    expect(screen.getByText('Links de Jogos organizados por rede.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Receitas' }).getAttribute('href')).toBe('/link/receitas?surfaceToken=token')
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
        slug="apostas"
        facetLabel="Redes"
        facetKind="network"
        active={null}
        facets={[]}
        hrefFor={() => '/nicho/apostas'}
        body={{
          seo: { title: 'Apostas', description: 'Apostas', robots: 'noindex,nofollow' },
          ageRequired: true,
          sponsored: [],
          organic: [],
        }}
      />,
    )
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Receitas' })).toBeNull()
  })
})
