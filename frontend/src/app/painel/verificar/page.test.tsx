import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.queryByLabelText('Novo e-mail')).toBeNull()
  })

  it('mostra o e-mail censurado e só troca de tela ao pedir outro endereço', async () => {
    api.mockResolvedValueOnce({ status: 200, body: { confirmed: false, retryAfter: 40, destination: 'fernando@gmail.com' } })
    render(<Page />)
    expect(await screen.findByText('f•••••••@gmail.com')).toBeTruthy()
    expect(screen.queryByText('fernando@gmail.com')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Trocar e-mail' }))
    expect(screen.getByRole('heading', { name: 'Trocar e-mail' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Código do e-mail' })).toBeNull()
    expect(screen.getByLabelText('Novo e-mail')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a verificação' }))
    expect(screen.getByRole('heading', { name: 'Confirme o e-mail' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Código do e-mail' })).toBeTruthy()
    expect(screen.getByText('f•••••••@gmail.com')).toBeTruthy()
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('depois de enviar o endereço novo verifica esse e-mail', async () => {
    api
      .mockResolvedValueOnce({ status: 200, body: { confirmed: false, retryAfter: 40, destination: 'ana@example.com' } })
      .mockResolvedValueOnce({ status: 200, body: {} })
    render(<Page />)
    fireEvent.click(await screen.findByRole('button', { name: 'Trocar e-mail' }))
    fireEvent.change(screen.getByLabelText('Novo e-mail'), { target: { value: 'Nova@Exemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByText('Enviamos o código para o novo e-mail.')).toBeTruthy()
    expect(screen.getByText('n•••@exemplo.com')).toBeTruthy()
    expect(screen.queryByLabelText('Novo e-mail')).toBeNull()
    expect(screen.getByRole('group', { name: 'Código do e-mail' })).toBeTruthy()
    expect(api.mock.calls[1]?.[0]).toBe('/v1/links/account/email')
    expect(JSON.parse(String((api.mock.calls[1]?.[1] as RequestInit).body))).toEqual({ email: 'Nova@Exemplo.com' })
  })
})
