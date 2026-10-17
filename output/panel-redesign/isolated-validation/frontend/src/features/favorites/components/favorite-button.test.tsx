import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { FavoriteButton } from './favorite-button'
vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear() })
it('F04-C01 no optimistic success, duplicate request blocked, failure preserves confirmed favorite state', async () => {
  let resolve: (r: { status: number; body: { saved: boolean } }) => void = () => {}
  vi.mocked(api).mockImplementationOnce(() => new Promise(done => { resolve = done }))
  render(<FavoriteButton linkId="one" />)
  const button = screen.getByRole('button', { name: 'Salvar favorito' })
  fireEvent.click(button); fireEvent.click(button)
  expect(api).toHaveBeenCalledTimes(1); expect(button.getAttribute('aria-pressed')).toBe('false')
  resolve({ status: 200, body: { saved: true } })
  await screen.findByRole('button', { name: 'Remover favorito' })
  vi.mocked(api).mockRejectedValueOnce(new Error('Sem conexão.'))
  fireEvent.click(screen.getByRole('button', { name: 'Remover favorito' }))
  await screen.findByRole('alert'); expect(screen.getByRole('button', { name: 'Remover favorito' }).getAttribute('aria-pressed')).toBe('true')
})
