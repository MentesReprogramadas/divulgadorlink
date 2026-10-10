import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { HomeExplore } from '@/components/domain/facet-filters'

beforeAll(() => {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
})

afterEach(() => {
  cleanup()
})

describe('explorar da home', () => {
  it('mostra os nichos restritos na lista, fora do topo', () => {
    render(
      <HomeExplore
        niches={[
          { slug: 'compras', name: 'Compras' },
          { slug: 'jogos', name: 'Jogos' },
          { slug: 'ganhar-dinheiro', name: 'Ganhar Dinheiro' },
          { slug: 'divulgacao', name: 'Divulgação' },
          { slug: 'adulto', name: 'Adulto', requiresAge: true },
          { slug: 'musicas', name: 'Músicas' },
          { slug: 'apostas', name: 'Apostas' },
          { slug: 'streaming', name: 'Streaming' },
        ]}
        networks={[
          { slug: 'telegram', name: 'Telegram' },
          { slug: 'kwai', name: 'Kwai' },
          { slug: 'onlyfans', name: 'OnlyFans', requiresAge: true },
          { slug: 'fansly', name: 'Fansly', requiresAge: true },
        ]}
      />,
    )

    const nicheLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/nicho/'))
    const networkLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/rede/'))
    expect(nicheLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/nicho/compras',
      '/nicho/ganhar-dinheiro',
      '/nicho/divulgacao',
      '/nicho/adulto',
      '/nicho/streaming',
      '/nicho/apostas',
      '/nicho/jogos',
      '/nicho/musicas',
    ])
    expect(networkLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/rede/telegram',
      '/rede/kwai',
      '/rede/onlyfans',
      '/rede/fansly',
    ])
    expect(screen.queryByRole('button', { name: 'Ver mais' })).toBeNull()
  })
})
