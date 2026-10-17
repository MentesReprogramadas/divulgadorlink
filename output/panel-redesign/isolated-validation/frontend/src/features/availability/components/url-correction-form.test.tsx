import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UrlCorrectionForm } from './url-correction-form'
import { AvailabilityScreen } from '../availability-screen'
import { UrlProposalQueue } from '../url-proposal-queue'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('F07 correção e fila', () => {
  it('F07-C01 espera persistência e neutraliza envio repetido', async () => {
    let finish = () => {}
    const submit = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    render(<UrlCorrectionForm onSubmit={submit} />)
    fireEvent.change(screen.getByLabelText('Convite para análise'), { target: { value: 'https://example.com/corrigido' } })
    const form = screen.getByRole('form', { name: 'Corrigir convite' })
    fireEvent.submit(form); fireEvent.submit(form)
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith('https://example.com/corrigido')
    expect(screen.queryByText('Correção enviada para análise')).toBeNull()
    finish()
    expect(await screen.findByRole('heading', { name: 'Correção enviada para análise' })).toBe(document.activeElement)
  })
  it('F07-C01 mantém a URL em erro e permite nova tentativa', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('Sem conexão. Tente novamente.')).mockResolvedValue(undefined)
    render(<UrlCorrectionForm onSubmit={submit} />)
    fireEvent.change(screen.getByLabelText('Convite para análise'), { target: { value: 'https://example.com/certo' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Corrigir convite' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Convite para análise') as HTMLInputElement).value).toBe('https://example.com/certo')
    fireEvent.submit(screen.getByRole('form', { name: 'Corrigir convite' }))
    await screen.findByRole('heading', { name: 'Correção enviada para análise' })
  })
  it('F07-C02 negação não exibe proposta privada nem ações', async () => {
    vi.mocked(api).mockResolvedValue({ status: 404, body: { canonicalUrl: 'PRIVATE_CANDIDATE' } })
    const { container } = render(<AvailabilityScreen linkId="foreign" />)
    await screen.findByRole('alert')
    expect(container.innerHTML).not.toContain('PRIVATE_CANDIDATE')
    expect(screen.queryByRole('button', { name: 'Enviar correção' })).toBeNull()
  })
  it('F07-C01 fila vazia e erro recuperável não anunciam decisão salva', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 200, body: { proposals: [], nextCursor: null } })
    render(<UrlProposalQueue />)
    await screen.findByRole('button', { name: 'Tentar de novo' })
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByText('Nada por aqui ainda.')
    expect(screen.queryByText('Decisão salva.')).toBeNull()
  })
})
