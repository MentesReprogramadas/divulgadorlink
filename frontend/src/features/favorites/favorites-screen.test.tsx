import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FavoritesScreen } from './favorites-screen'

const api = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api }))
afterEach(() => { cleanup(); vi.restoreAllMocks(); api.mockReset() })

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
  const input = await screen.findByLabelText('Nome da coleção')
  fireEvent.change(input, { target: { value: 'Estudos' } })
  fireEvent.submit(screen.getByRole('form', { name: 'Nova coleção' }))
  const status = await screen.findByText('Alteração salva.')
  await waitFor(() => expect(document.activeElement).toBe(status))
  expect(focusedStatusText).toEqual(['Alteração salva.'])
  expect(api.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
})
