import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  it('só mostra adulto, apostas e onlyfans depois do ver mais', () => {
    render(
      <HomeExplore
        niches={[
          { slug: 'jogos', name: 'Jogos' },
          { slug: 'adulto', name: 'Adulto', requiresAge: true },
          { slug: 'apostas', name: 'Apostas' },
          { slug: 'ganhar-dinheiro', name: 'Ganhar Dinheiro' },
        ]}
        networks={[
          { slug: 'telegram', name: 'Telegram' },
          { slug: 'onlyfans', name: 'OnlyFans', requiresAge: true },
          { slug: 'fansly', name: 'Fansly', requiresAge: true },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Jogos' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Telegram' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Adulto 18+' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Apostas' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Ganhar Dinheiro' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'OnlyFans 18+' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Fansly 18+' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ver mais' }))

    expect(screen.getByRole('link', { name: 'Adulto 18+' }).getAttribute('href')).toBe('/nicho/adulto')
    expect(screen.getByRole('link', { name: 'Apostas' }).getAttribute('href')).toBe('/nicho/apostas')
    expect(screen.getByRole('link', { name: 'Ganhar Dinheiro' }).getAttribute('href')).toBe('/nicho/ganhar-dinheiro')
    expect(screen.getByRole('link', { name: 'OnlyFans 18+' }).getAttribute('href')).toBe('/rede/onlyfans')
    expect(screen.getByRole('link', { name: 'Fansly 18+' }).getAttribute('href')).toBe('/rede/fansly')
  })
})
