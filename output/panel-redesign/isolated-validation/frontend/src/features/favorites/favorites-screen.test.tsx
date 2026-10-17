import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FavoritesScreen } from './favorites-screen'

const api = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); api.mockReset() })

it('abre a pasta sem os controles gerais e Voltar devolve o foco ao card da coleção', async () => {
  const collection = { id: 'study', name: 'Estudos', version: 7 }
  api.mockImplementation(async (path: string) => ({ status: 200, body: path.endsWith('collections/study') ? { collection, items: [], nextCursor: null } : { items: path.endsWith('collections') ? [collection] : [], nextCursor: null } }))
  render(<FavoritesScreen />)
  fireEvent.click(await screen.findByRole('tab', { name: 'Coleções' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Estudos' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Editar' }).hasAttribute('disabled')).toBe(false))
  expect(screen.queryByRole('region', { name: 'Suas coleções' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Nova coleção' })).toBeNull()
  expect(screen.queryByRole('group', { name: 'Ações da página' })).toBeNull()
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Estudos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Estudos' })))
})

it('adiciona pelo card com a versão da coleção e mantém a escolha quando falha', async () => {
  let fail = true
  api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      if (fail) throw new Error('Offline')
      return { status: 200, body: {} }
    }
    return { status: 200, body: { items: path.endsWith('collections') ? [{ id: 'study', name: 'Estudos', version: 7 }] : [{ id: 'saved-one', linkId: 'one', available: true, name: 'Clube', description: 'Leitura', href: '/link/one', collectionIds: [] }], nextCursor: null } }
  })
  render(<FavoritesScreen />)
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar à coleção' }))
  const picker = screen.getByRole('dialog', { name: 'Adicionar à coleção' })
  expect(within(picker).getByText('Clube')).toBeTruthy()
  fireEvent.click(within(picker).getByRole('button', { name: 'Estudos' }))
  await waitFor(() => expect(within(picker).getByRole('alert').textContent).toContain('Sem conexão'))
  expect(picker.getAttribute('open')).not.toBeNull()
  expect(api.mock.calls.find(([, init]) => init?.method === 'PUT')).toEqual(['/v1/me/collections/study/items/saved-one', { method: 'PUT', body: JSON.stringify({ expectedVersion: 7 }) }])
  fail = false
  fireEvent.click(within(picker).getByRole('button', { name: 'Estudos' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Adicionar à coleção' })).toBeNull())
  expect(screen.getByRole('link', { name: 'Clube' }).getAttribute('href')).toBe('/link/one')
})

it('F04-C01 foco de sucesso aguarda o texto ser renderizado, mesmo com frame antes do commit', async () => {
  // An animation frame is not a React commit boundary. Reproduce its earliest timing.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0 })
  const focusedStatusText: string[] = [], focus = HTMLElement.prototype.focus
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('role') === 'status') focusedStatusText.push(this.textContent ?? '')
    focus.call(this)
  })
  let saved = false
  api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') { saved = true; return { status: 200, body: {} } }
    return { status: 200, body: { items: path.endsWith('collections') && saved ? [{ id: 'collection', name: 'Estudos', version: 1 }] : [], nextCursor: null } }
  })
  render(<FavoritesScreen />)
  fireEvent.click(await screen.findByRole('tab', { name: 'Coleções' })); fireEvent.click(screen.getByRole('button', { name: 'Nova coleção' })); const input = screen.getByLabelText('Nome da coleção')
  fireEvent.change(input, { target: { value: 'Estudos' } })
  fireEvent.submit(screen.getByRole('form', { name: 'Nova coleção' }))
  const status = await screen.findByText('Alteração salva.')
  await waitFor(() => expect(document.activeElement).toBe(status))
  expect(focusedStatusText).toEqual(['Alteração salva.'])
  expect(api.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
})
