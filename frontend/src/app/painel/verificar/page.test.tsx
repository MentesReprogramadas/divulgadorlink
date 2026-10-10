import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Page from './page'

const api = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))
vi.mock('@/components/domain/panel', () => {
  const session = { role: 'USER', status: 'ACTIVE', canSubmit: false }
  return { useAreaSession: () => session }
})

afterEach(() => {
  cleanup()
  api.mockReset()
})

describe('tela de confirmar e-mail', () => {
  it('envia o código sozinha quando o anterior já expirou', async () => {
    api
      .mockResolvedValueOnce({ status: 200, body: { confirmed: false, retryAfter: 0 } })
      .mockResolvedValueOnce({ status: 200, body: { retryAfter: 60 } })
    render(<Page />)
    expect(await screen.findByText('Enviamos o código para o seu e-mail. Olhe também o spam.')).toBeTruthy()
    expect(api.mock.calls[1]?.[0]).toBe('/v1/auth/confirm')
    expect(JSON.parse(String((api.mock.calls[1]?.[1] as RequestInit).body))).toEqual({ kind: 'EMAIL', resend: true })
    expect(screen.queryByRole('navigation', { name: 'Áreas do painel' })).toBeNull()
  })

  it('não reenvia enquanto o código ainda vale', async () => {
    api.mockResolvedValueOnce({ status: 200, body: { confirmed: false, retryAfter: 40 } })
    render(<Page />)
    expect(await screen.findByText('O código já foi enviado para o seu e-mail. Olhe também o spam.')).toBeTruthy()
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Reenviar em 40s' })).toBeTruthy()
  })
})
