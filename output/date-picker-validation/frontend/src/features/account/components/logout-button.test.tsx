import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LogoutButton } from './logout-button'

const { api, clearSession } = vi.hoisted(() => ({ api: vi.fn(), clearSession: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/domain/session', () => ({ clearSession }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('mantém a sessão e permite tentar novamente quando a saída falha', async () => {
  api.mockResolvedValueOnce({ status: 503 }).mockRejectedValueOnce(new Error('network'))
  render(<LogoutButton />)
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
  await screen.findByRole('alert')
  expect(api).toHaveBeenCalledWith('/v1/auth/logout', { method: 'POST' })
  expect(clearSession).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
  await screen.findByRole('alert')
  expect(clearSession).not.toHaveBeenCalled()
})
