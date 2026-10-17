import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReminderPreferenceForm } from './reminder-preference-form'
import { RenewalRemindersScreen } from '../renewal-reminders-screen'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('F02 preferências e avisos', () => {
  it('F02-C01 só confirma após persistir e bloqueia duplicação', async () => {
    let finish = () => {}
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    render(<ReminderPreferenceForm enabled={false} onSave={save} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Receber lembretes por e-mail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferência' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Preferência de lembretes' }))
    expect(save).toHaveBeenCalledTimes(1); expect(screen.queryByText('Preferência salva.')).toBeNull()
    finish(); await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Preferência salva.'))
  })
  it('F02-C01 mantém a opção após erro de rede e permite tentar de novo', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Sem conexão.')).mockResolvedValue(undefined)
    render(<ReminderPreferenceForm enabled={false} onSave={save} />)
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Salvar preferência' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Sem conexão.')
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferência' })); await screen.findByText('Preferência salva.')
  })
  it('F02-C02 não renderiza payload privado de uma resposta negada', async () => {
    vi.mocked(api).mockResolvedValue({ status: 404, body: { secret: 'sentinela-privada', reminders: [{ link: { name: 'segredo' } }] } })
    render(<RenewalRemindersScreen />)
    await screen.findByRole('alert'); expect(document.body.textContent).not.toContain('sentinela-privada'); expect(screen.queryByRole('checkbox')).toBeNull()
  })
  it('F02-C01 mostra vazio e recupera falha de carregamento', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 200, body: { preferences: { emailRenewal: false, expectedVersion: 0 }, reminders: [] } })
    render(<RenewalRemindersScreen />); fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await screen.findByText('Nada por aqui ainda.')
  })
})
