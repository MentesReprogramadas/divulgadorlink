import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

    expect(within(screen.getByRole('region', { name: 'Nichos' })).getAllByRole('link')).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais' }))
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
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeTruthy()
  })

  it('mostra até seis por grupo e permite expandir e recolher', async () => {
    render(
      <HomeExplore
        niches={[
          { slug: 'compras', name: 'Compras' },
          { slug: 'jogos', name: 'Jogos' },
          { slug: 'ganhar-dinheiro', name: 'Ganhar Dinheiro' },
          { slug: 'divulgacao', name: 'Divulgação' },
          { slug: 'adulto', name: 'Adulto', requiresAge: true },
          { slug: 'musicas', name: 'Músicas' },
          { slug: 'streaming', name: 'Streaming' },
        ]}
        networks={[
          { slug: 'telegram', name: 'Telegram' },
          { slug: 'discord', name: 'Discord' },
          { slug: 'instagram', name: 'Instagram' },
          { slug: 'whatsapp', name: 'WhatsApp' },
          { slug: 'kwai', name: 'Kwai' },
        ]}
      />,
    )
    expect(await screen.findByRole('button', { name: 'Ver mais' })).toBeTruthy()
    expect(document.querySelector('.home-explore-columns')?.className).not.toContain('is-open')
    expect(within(screen.getByRole('region', { name: 'Nichos' })).getAllByRole('link')).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais' }))
    expect(document.querySelector('.home-explore-columns')?.className).toContain('is-open')
    expect(screen.getByRole('link', { name: 'Músicas' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }))
    expect(within(screen.getByRole('region', { name: 'Nichos' })).getAllByRole('link')).toHaveLength(6)
  })

  it('não oferece expansão sem itens adicionais', () => {
    render(<HomeExplore niches={[{ slug: 'jogos', name: 'Jogos' }]} networks={[{ slug: 'discord', name: 'Discord' }]} />)
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
