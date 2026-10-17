import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SearchBox } from './search-box'

const { api, push } = vi.hoisted(() => ({ api: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const suggestions = {
  status: 200,
  body: {
    facet: { kind: 'niche', slug: 'jogos', name: 'Jogos' },
    items: [{ id: 'guilda', name: 'Guilda de RPG', surfaceToken: 'signed+token', sponsored: true, niche: { name: 'Jogos', slug: 'jogos' }, network: { name: 'Discord', slug: 'discord' } }],
  },
}

beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); api.mockReset(); push.mockReset() })

describe('sugestões da busca', () => {
  it('separa facetas de links e mantém os metadados dentro de uma única ação', async () => {
    api.mockResolvedValue(suggestions)
    render(<SearchBox id="search" label="Busca" />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jogos' } })
    const facets = await screen.findByRole('group', { name: 'Nichos e redes' })
    const links = screen.getByRole('group', { name: 'Links sugeridos' })
    expect(within(facets).getAllByRole('option')).toHaveLength(1)
    const option = within(links).getByRole('option')
    expect(option.getAttribute('href')).toBe('/link/guilda?surfaceToken=signed%2Btoken')
    expect(within(option).getByText('Discord').closest('a')).toBe(option)
    expect(within(option).getByText('Patrocinado')).toBeTruthy()
    expect(option.querySelector('a')).toBeNull()
    expect(screen.getByRole('link', { name: /Ver todos os resultados/ }).getAttribute('href')).toBe('/busca?q=jogos')
    fireEvent.click(option)
    expect(push).toHaveBeenCalledWith('/link/guilda?surfaceToken=signed%2Btoken')
  })

  it('preserva a ordem pelo teclado e fecha com Escape', async () => {
    api.mockResolvedValue(suggestions)
    render(<SearchBox id="search" label="Busca" />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'jogos' } })
    await screen.findByRole('listbox')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/link/guilda?surfaceToken=signed%2Btoken')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('ignora respostas antigas quando a consulta muda', async () => {
    let resolveOld: (value: typeof suggestions) => void = () => undefined
    api.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve }))
    api.mockResolvedValueOnce({ status: 200, body: { items: [{ id: 'novo', name: 'Resultado novo' }] } })
    render(<SearchBox id="search" label="Busca" />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jogos' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'novo' } })
    await screen.findByText('Resultado novo')
    await act(async () => { resolveOld(suggestions) })
    expect(screen.queryByText('Guilda de RPG')).toBeNull()
    expect(screen.getByText('Resultado novo')).toBeTruthy()
  })
})
