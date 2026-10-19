import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PerformanceFiltersForm } from './performance-filters-form'
import { PerformanceReport } from './performance-report'
import { PerformanceScreen } from '../performance-screen'
import type { PerformanceReport as Report } from '../performance-contract'
import { api } from '@/lib/api'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('@/lib/api', () => ({ api: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const totals = { impressions: 100, clicks: 10, ctr: 10, investmentCents: 1000, cpcCents: 100 }
const report: Report = {
  link: { id: 'own-link', name: 'Comunidade Aprender' }, from: '2026-10-01', to: '2026-10-07', days: 7, promotionId: null,
  totals: { ...totals, paidClicks: 10 }, daily: [{ ...totals, day: '2026-10-01', highlighted: true, available: true, paidClicks: 10 }],
  surfaces: [{ ...totals, surface: 'HOME' }], coverage: { status: 'COMPLETE', availableFrom: '2025-10-15', investment: 'COMPLETE', currentDayPartial: false },
  dataState: 'RECORDED', comparison: { from: '2026-09-24', to: '2026-09-30', days: 7, totals, coverage: 'COMPLETE' }, campaigns: [],
}
describe('F01 relatório', () => {
  it('aplica automaticamente datas completas sem enviar datas parcialmente digitadas', async () => {
    vi.useFakeTimers()
    const onFiltersChange = vi.fn()
    try {
      render(<PerformanceFiltersForm report={report} filters={{}} onFiltersChange={onFiltersChange} />)
      fireEvent.change(screen.getByLabelText('De'), { target: { value: '02/10/20' } })
      await act(() => vi.advanceTimersByTimeAsync(600))
      expect(onFiltersChange).not.toHaveBeenCalled()
      fireEvent.change(screen.getByLabelText('De'), { target: { value: '02/10/2026' } })
      await act(() => vi.advanceTimersByTimeAsync(600))
      expect(onFiltersChange).toHaveBeenCalledExactlyOnceWith({ from: '2026-10-02', to: '2026-10-07', promotionId: '' })
    } finally { vi.useRealTimers() }
  })
  it('pagina os dias e alterna gráficos sem transformar ausência de histórico em zero', () => {
    const daily = Array.from({ length: 15 }, (_, index) => ({ ...report.daily[0], day: `2026-10-${String(index + 1).padStart(2, '0')}`, clicks: index + 1, available: index !== 7 }))
    render(<PerformanceReport report={{ ...report, daily }} filters={{}} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Tabela' }))
    const table = screen.getByRole('region', { name: 'Resultados diários' })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    expect(screen.queryByText('08/10/2026')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(within(table).getByText('08/10/2026')).toBeTruthy()
    expect(within(table).getAllByText('Indisponível')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect((screen.getByRole('button', { name: 'Próxima' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('tab', { name: 'Gráficos' }))
    expect(screen.queryByRole('region', { name: 'Resultados diários' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Gráficos' }).getAttribute('aria-selected')).toBe('true')
  })
  it('F01-C01 mostra resumo, comparação, filtros rotulados e dias com destaque', () => {
    render(<PerformanceReport report={report} filters={{ from: report.from }} />)
    expect(screen.getByRole('heading', { name: report.link.name })).toBeTruthy()
    expect(screen.getByLabelText('De').getAttribute('value')).toBe('01/10/2026')
    expect(screen.getByRole('form', { name: 'Filtrar relatório' }).getAttribute('method')).toBe('get')
    expect(screen.queryByText(/Comparação:/)).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Tabela' }))
    expect(screen.getByText('Ativo no dia')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Aplicar período' })).toBeNull()
  })
  it('F01-C01 distingue ausência de eventos, retenção e CPC indisponível', () => {
    const value: Report = { ...report, dataState: 'NO_EVENTS', totals: { ...report.totals, clicks: 0, cpcCents: null } }
    const { rerender } = render(<PerformanceReport report={value} filters={{}} />)
    expect(screen.queryByText('Nenhum evento registrado neste período.')).toBeNull()
    expect(screen.queryByRole('term', { name: 'Custo por clique em destaque' })).toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByText(/CPC indisponível:/)).toBeNull()
    rerender(<PerformanceReport report={{ ...value, dataState: 'OUTSIDE_RETENTION', coverage: { ...value.coverage, status: 'UNAVAILABLE' } }} filters={{}} />)
    expect(screen.getByText(/fora do prazo de retenção/)).toBeTruthy()
    expect(screen.queryByText('Nenhum evento registrado neste período.')).toBeNull()
  })
  it('F01-C01 recupera falha sem anunciar sucesso nem perder filtros', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 200, body: report })
    render(<PerformanceScreen linkId="own-link" filters={{ from: report.from, to: report.to }} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { name: report.link.name })
    expect(api).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api).mock.calls[1]?.[0]).toContain('from=2026-10-01&to=2026-10-07')
  })
  it('F01-C02 não mostra métricas ou ações quando o servidor nega acesso', async () => {
    vi.mocked(api).mockResolvedValue({ status: 404, body: { message: 'not_found', secret: 'PRIVATE_SENTINEL' } })
    const { container } = render(<PerformanceScreen linkId="foreign" filters={{}} />)
    await screen.findByRole('alert')
    expect(container.textContent).not.toContain('PRIVATE_SENTINEL')
    expect(screen.queryByRole('button', { name: 'Aplicar período' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Resultados diários' })).toBeNull()
  })
  it('mostra validação do período e mantém a entrada para corrigir', async () => {
    vi.mocked(api).mockResolvedValue({ status: 400, body: { message: 'Período inválido.' } })
    render(<PerformanceScreen linkId="own-link" filters={{ from: '2026-10-10', to: '2026-10-01' }} />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Período inválido.'))
    expect((screen.getByLabelText('De') as HTMLInputElement).value).toBe('10/10/2026')
  })
})
