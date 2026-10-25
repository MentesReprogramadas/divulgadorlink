import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { HomeCollections } from './home-collections'

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
})
afterEach(cleanup)

describe('coleções Ondas a partir da mídia pública do catálogo', () => {
  it('usa até três assuntos reais distintos com capa e conserva a query de descoberta', () => {
    render(<HomeCollections discoveryQuery="languageTag=pt-BR" links={[
      { id: 'without-photo', name: 'Sem foto', niche: { slug: 'gastronomia', name: 'Gastronomia' } },
      { id: 'without-niche', name: 'Sem assunto', imageUrl: '/api/v1/links/without-niche/media/photo' },
      { id: 'blank-photo', name: 'Sem capa válida', imageUrl: '  ', niche: { slug: 'outro', name: 'Outro' } },
      { id: 'nature', name: 'Fora do roteiro', imageUrl: '/api/v1/links/nature/media/photo', imageAlt: 'Trilha da comunidade', niche: { slug: 'viagens/aventura', name: 'Viagens' } },
      { id: 'nature-again', name: 'Outra viagem', imageUrl: '/api/v1/links/nature-again/media/photo', niche: { slug: 'viagens/aventura', name: 'Viagens' } },
      { id: 'reading', name: 'Leitura em grupo', imageUrl: '/api/v1/links/reading/media/photo', imageAlt: 'Livros compartilhados', niche: { slug: 'educacao-cursos', name: 'Educação' } },
      { id: 'code', name: 'Código aberto', imageUrl: '/api/v1/links/code/media/photo', imageAlt: 'Encontro de programação', niche: { slug: 'tecnologia-internet', name: 'Tecnologia' } },
      { id: 'music', name: 'Som novo', imageUrl: '/api/v1/links/music/media/photo', niche: { slug: 'musicas', name: 'Música' } },
    ]} />)
    const section = screen.getByRole('region', { name: 'Deixe a curiosidade levar.' })
    expect(within(section).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      '/nicho/viagens%2Faventura?languageTag=pt-BR',
      '/nicho/educacao-cursos?languageTag=pt-BR',
      '/nicho/tecnologia-internet?languageTag=pt-BR',
    ])
    expect(within(section).getAllByRole('img')).toHaveLength(3)
    expect(within(section).getByRole('link', { name: /Viagens.*Fora do roteiro/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Trilha da comunidade' }).getAttribute('src')).toBe('/bff/v1/links/nature/media/photo')
    expect(within(section).getByText('Fora do roteiro')).toBeTruthy()
    expect(screen.queryByText('Outra viagem')).toBeNull()
    expect(screen.queryByText('Som novo')).toBeNull()
  })

  it('sem mídia não inventa coleções e mantém a publicação gratuita sem prometer resultados', () => {
    render(<HomeCollections links={[{ id: 'no-cover', name: 'Sem foto', niche: { slug: 'jogos', name: 'Jogos' } }]} />)
    expect(screen.queryByRole('heading', { name: 'Deixe a curiosidade levar.' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'A sua comunidade também tem lugar aqui.' })).toBeTruthy()
    expect(screen.getByText(/Publicar é grátis\. Destaques são espaços pagos\./)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Quero divulgar meu link' }).getAttribute('href')).toBe('/divulgar')
    expect(screen.queryByRole('img')).toBeNull()
  })
})
