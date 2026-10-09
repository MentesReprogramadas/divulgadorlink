import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FacetSummaries } from './facet-summaries'

const api = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))

afterEach(() => cleanup())

const row = {
  id: 'niche-jogos', name: 'Jogos', slug: 'jogos', requiresAge: false, isPublicFacet: true,
  summary: null, substantiveCount: 3, indexable: true,
}

describe('resumos do catálogo', () => {
  it('mostra se entra na busca e conserva o texto quando salvar falha', async () => {
    api.mockResolvedValueOnce({ status: 200, body: { niches: [row], networks: [] } })
    render(<FacetSummaries />)
    expect(await screen.findByText('Na busca')).toBeTruthy()
    const field = screen.getByRole('textbox', { name: 'Resumo de Jogos' })
    fireEvent.change(field, { target: { value: 'texto' } })
    api.mockResolvedValueOnce({ status: 400, body: { message: 'Valor inválido.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Jogos' }))
    expect(await screen.findByText('Valor inválido.')).toBeTruthy()
    expect((field as HTMLTextAreaElement).value).toBe('texto')
  })

  it('não finge lista vazia quando o carregamento falha', async () => {
    api.mockResolvedValueOnce({ status: 500, body: { message: 'falhou' } })
    render(<FacetSummaries />)
    expect(await screen.findByText('Não foi possível carregar os textos.')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('mostra o erro quando o carregamento rejeita e não abre os campos', async () => {
    api.mockRejectedValueOnce(new Error('rede'))
    render(<FacetSummaries />)
    expect(await screen.findByText('Não foi possível carregar os textos.')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('mostra o erro quando salvar rejeita e conserva o texto digitado', async () => {
    api.mockResolvedValueOnce({ status: 200, body: { niches: [row], networks: [] } })
    render(<FacetSummaries />)
    const field = await screen.findByRole('textbox', { name: 'Resumo de Jogos' })
    fireEvent.change(field, { target: { value: 'texto' } })
    api.mockRejectedValueOnce(new Error('rede'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Jogos' }))
    expect(await screen.findByText('Não foi possível salvar.')).toBeTruthy()
    expect((field as HTMLTextAreaElement).value).toBe('texto')
    expect((screen.getByRole('button', { name: 'Salvar Jogos' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('abre um catálogo por vez e guarda o rascunho ao trocar', async () => {
    api.mockResolvedValueOnce({
      status: 200,
      body: {
        niches: [row, { ...row, id: 'niche-filmes', name: 'Filmes', slug: 'filmes-series' }],
        networks: [],
      },
    })
    render(<FacetSummaries />)
    expect(await screen.findByRole('textbox', { name: 'Resumo de Jogos' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Resumo de Filmes' })).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: 'Resumo de Jogos' }), { target: { value: 'rascunho' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filmes' }))
    expect(screen.getByRole('textbox', { name: 'Resumo de Filmes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Jogos' }))
    expect((screen.getByRole('textbox', { name: 'Resumo de Jogos' }) as HTMLTextAreaElement).value).toBe('rascunho')
  })

  it('diz que 18+ continua fora da busca', async () => {
    api.mockResolvedValueOnce({
      status: 200,
      body: { niches: [{ ...row, id: 'niche-apostas', name: 'Apostas', requiresAge: true, indexable: false }], networks: [] },
    })
    render(<FacetSummaries />)
    expect(await screen.findByText('18+, fora da busca')).toBeTruthy()
  })
})
