import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RetentionPanel } from './retention-panel'

const api = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))

afterEach(() => {
  cleanup()
  api.mockReset()
})

describe('retenção na gestão', () => {
  it('mostra o que passou do prazo e confirma o apagamento', async () => {
    api
      .mockResolvedValueOnce({ status: 200, body: { before: '2025-10-10', pending: 2 } })
      .mockResolvedValueOnce({ status: 202, body: { queued: true } })
      .mockResolvedValueOnce({ status: 200, body: { before: '2025-10-10', pending: 2 } })
    render(<RetentionPanel />)
    expect(await screen.findByText('além do prazo')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pedir expurgo' }))
    expect(await screen.findByText('Pedido enviado ao worker. A contagem cai quando ele termina. Pedido e pagamento não entram.')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('não oferece o botão quando a leitura falha', async () => {
    api.mockResolvedValueOnce({ status: 500, body: { message: 'falhou' } })
    render(<RetentionPanel />)
    expect(await screen.findByText('Não foi possível ler a retenção.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apagar agora' })).toBeNull()
  })
})
