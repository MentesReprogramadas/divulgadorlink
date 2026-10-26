import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { FacetCatalog } from '@/components/domain/facet-catalog'
const ageDecision=vi.hoisted(()=>({confirm:vi.fn(),refresh:vi.fn(),replace:vi.fn()}))
vi.mock('@/components/domain/age-gate',async original=>({...await original<typeof import('@/components/domain/age-gate')>(),confirmAge:ageDecision.confirm}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: ageDecision.refresh,replace:ageDecision.replace }),
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
  vi.clearAllMocks();ageDecision.confirm.mockResolvedValue(true)
  window.history.replaceState({},'','/')
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
  it.each([['yes','Tenho 18 anos ou mais'],['no','Não tenho']])('descarta cursor anterior após resposta %s, preservando os filtros',async(choice,label)=>{
    window.history.replaceState({},'','/rede/telegram?languageTag=pt&cursor=old-page')
    render(<FacetCatalog pageClass="network-page" descriptionClass="network-description" listPrefix="network" mark="network" route="network" slug="telegram" facetLabel="Nichos" facetKind="niche" active={null} facets={[]} body={{heading:'Telegram',seo:{title:'Telegram',robots:'index,follow'},ageRequired:true,sponsored:[],organic:[]}}/>)
    fireEvent.click(screen.getByRole('button',{name:label}))
    await waitFor(()=>expect(ageDecision.replace).toHaveBeenCalledWith('/rede/telegram?languageTag=pt'))
    expect(ageDecision.confirm).toHaveBeenCalledWith(choice)
    expect(ageDecision.refresh).not.toHaveBeenCalled()
  })
  it('mantém o diálogo ocupado até a confirmação terminar e informa falha de rede',async()=>{
    let rejectDecision!:(reason:Error)=>void
    ageDecision.confirm.mockReturnValue(new Promise((_resolve,reject)=>{rejectDecision=reject}))
    render(<FacetCatalog pageClass="network-page" descriptionClass="network-description" listPrefix="network" mark="network" route="network" slug="telegram" facetLabel="Nichos" facetKind="niche" active={null} facets={[]} body={{heading:'Telegram',seo:{title:'Telegram',robots:'index,follow'},ageRequired:true,sponsored:[],organic:[]}}/>)
    const yes=screen.getByRole('button',{name:'Tenho 18 anos ou mais'}) as HTMLButtonElement
    fireEvent.click(yes)
    await waitFor(()=>expect(yes.disabled).toBe(true))
    await act(async()=>rejectDecision(new Error('offline')))
    expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toBe('Não foi possível confirmar sua idade. Tente novamente.')
    expect(yes.disabled).toBe(false)
    expect(ageDecision.refresh).not.toHaveBeenCalled()
    ageDecision.confirm.mockResolvedValue(true)
    fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}))
    await waitFor(()=>expect(ageDecision.confirm).toHaveBeenLastCalledWith('no'))
    expect(ageDecision.refresh).toHaveBeenCalledTimes(1)
  })
  it('recusa persiste a escolha e atualiza a mesma listagem mista',async()=>{
    render(<FacetCatalog pageClass="network-page" descriptionClass="network-description" listPrefix="network" mark="network" route="network" slug="telegram" facetLabel="Nichos" facetKind="niche" active={null} facets={[]} body={{heading:'Telegram',seo:{title:'Telegram',robots:'index,follow'},ageRequired:true,sponsored:[],organic:[card]}}/>)
    fireEvent.click(screen.getByRole('button',{name:'Não tenho'}))
    await waitFor(()=>expect(ageDecision.confirm).toHaveBeenCalledWith('no'))
    expect(ageDecision.refresh).toHaveBeenCalledTimes(1)
  })
  it('entrega o título e os links no primeiro HTML', () => {
    render(
      <FacetCatalog
        pageClass="niche-page"
        descriptionClass="niche-description"
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
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Trilha' })).toBeNull()
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

  it('mantém a description quando ela repete o título com a marca', () => {
    render(
      <FacetCatalog
        pageClass="niche-page"
        descriptionClass="niche-description"
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
            description: 'Jogos | Tem Link Aqui',
            robots: 'index,follow',
          },
          sponsored: [],
          organic: [],
        }}
      />,
    )
    expect(screen.getByText('Jogos | Tem Link Aqui')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Jogos' })).toBeTruthy()
  })

  it('noindex,follow não publica json-ld', () => {
    render(
      <FacetCatalog
        pageClass="niche-page"
        descriptionClass="niche-description"
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
