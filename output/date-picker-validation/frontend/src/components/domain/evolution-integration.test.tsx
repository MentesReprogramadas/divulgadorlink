import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EvolutionIntegration } from './evolution-integration'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const status = { configured: true, enabled: true, actionsEnabled: true, instance: 'Test bot', group: 'test@g.us', backlog: 1, version: null, operators: [], allowedPhones: [], messages: [{ id: 'uncertain', kind: 'REVIEW_CASE', state: 'UNCERTAIN', attempts: 1, lastErrorCode: 'delivery_unconfirmed' }] }
describe('F42 painel Evolution', () => {
  it('exige confirmação antes de reenviar entrega incerta', async () => {
    vi.mocked(api).mockResolvedValue({ status: 200, body: status })
    render(<EvolutionIntegration />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reprocessar entrega' }))
    expect(vi.mocked(api).mock.calls.filter(c => c[1]?.method === 'POST')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reenvio' }))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/v1/admin/integrations/evolution/deliveries/uncertain/retry', { method: 'POST', body: '{"confirmUncertain":true}' }))
  })
  it('desabilita ativação sem configuração e não recebe credenciais', async () => {
    vi.mocked(api).mockResolvedValue({ status: 200, body: { ...status, configured: false, enabled: false, actionsEnabled: false, messages: [] } })
    render(<EvolutionIntegration />)
    const button = await screen.findByRole('button', { name: 'Ativar avisos' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByLabelText('Chave de API')).toBeNull()
    expect(screen.getByRole('region', { name: 'Histórico de entregas' }).textContent).toContain('Nada por aqui ainda.')
  })
  it('mostra falha e permite tentar carregar novamente', async () => {
    vi.mocked(api).mockResolvedValueOnce({ status: 503, body: {} }).mockResolvedValue({ status: 200, body: status })
    render(<EvolutionIntegration />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Test bot')).toBeTruthy()
  })
})
