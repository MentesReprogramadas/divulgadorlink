import { chooseSelect } from '@/test-select'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReportForm } from './report-form'
import { ReportQueue } from '../report-queue'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('F06 formulário e fila', () => {
  it('F06-C01 envia uma vez, espera persistência e não mostra campos privados da resposta', async () => {
    let finish: (value: { id: string; status: 'RECEIVED'; createdAt: string; privateComment: string }) => void = () => {}
    const promise = new Promise<{ id: string; status: 'RECEIVED'; createdAt: string; privateComment: string }>(resolve => { finish = resolve })
    const submit = vi.fn().mockReturnValue(promise)
    const { container } = render(<ReportForm name="Grupo de estudo" onSubmit={submit} />)
    await chooseSelect(screen.getByLabelText('Motivo'), 'SPAM')
    fireEvent.change(screen.getByLabelText('Comentário (opcional)'), { target: { value: '<script>texto</script>' } })
    const form = screen.getByRole('form', { name: 'Denunciar um link' })
    fireEvent.submit(form); fireEvent.submit(form)
    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith({ reason: 'SPAM', comment: '<script>texto</script>' })
    expect(screen.queryByText('Denúncia registrada')).toBeNull()
    expect((screen.getByRole('button', { name: 'Enviar denúncia' }) as HTMLButtonElement).disabled).toBe(true)
    finish({ id: 'protocol-123', status: 'RECEIVED', createdAt: '2026-10-14T12:00Z', privateComment: 'PRIVATE_SENTINEL' })
    await screen.findByText('Denúncia registrada')
    expect(container.textContent).toContain('protocol-123')
    expect(container.innerHTML).not.toContain('PRIVATE_SENTINEL')
    expect(container.querySelector('script')).toBeNull()
  })
  it('F06-C01 conserva comentário e motivo após falha recuperável', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('Sem conexão. Tente novamente.')).mockResolvedValue({ id: 'retry-ok', status: 'RECEIVED', createdAt: '2026-10-14' })
    render(<ReportForm name="Grupo" onSubmit={submit} />)
    await chooseSelect(screen.getByLabelText('Motivo'), 'EXPIRED_INVITE')
    fireEvent.change(screen.getByLabelText('Comentário (opcional)'), { target: { value: 'Convite não abre' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Denunciar um link' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Comentário (opcional)') as HTMLTextAreaElement).value).toBe('Convite não abre')
    fireEvent.submit(screen.getByRole('form', { name: 'Denunciar um link' }))
    await screen.findByText('Denúncia registrada')
    expect(submit).toHaveBeenCalledTimes(2)
  })
  it('F06-C02 fila vazia e negação não expõem conteúdo nem ações administrativas', async () => {
    vi.mocked(api).mockResolvedValueOnce({ status: 404, body: { privateComment: 'PRIVATE_SENTINEL' } })
    const { container, unmount } = render(<ReportQueue filters={{}} />)
    await screen.findByText('Fila indisponível para esta conta.')
    expect(container.innerHTML).not.toContain('PRIVATE_SENTINEL')
    expect(screen.queryByRole('button', { name: 'Salvar decisão' })).toBeNull()
    unmount()
    vi.mocked(api).mockResolvedValueOnce({ status: 200, body: { reports: [], nextCursor: null } })
    render(<ReportQueue filters={{}} />)
    await screen.findByText('Nada por aqui ainda.')
  })
  it('F06-C01 fila apresenta falha recuperável e nova leitura real do adapter', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 200, body: { reports: [], nextCursor: null } })
    render(<ReportQueue filters={{}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await screen.findByText('Nada por aqui ainda.')
    expect(api).toHaveBeenCalledTimes(2)
  })
})
