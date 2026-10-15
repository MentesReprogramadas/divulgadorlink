import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './login-form'

const api = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))

afterEach(() => { cleanup(); api.mockReset() })

describe('entrada da conta', () => {
  it('recupera o formulário depois de uma falha de conexão', async () => {
    api.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<LoginForm />)
    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Verifique sua conexão'))
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('bloqueia o envio enquanto espera resposta', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined
    api.mockReturnValue(new Promise(resolve => { resolveRequest = resolve }))
    render(<LoginForm />)
    const button = screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement
    fireEvent.submit(button.closest('form')!)
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    resolveRequest({ status: 401, body: { message: 'Credenciais inválidas.' } })
    await waitFor(() => expect(button.disabled).toBe(false))
    expect(screen.getByRole('alert').textContent).toBe('Credenciais inválidas.')
  })
})
