import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SearchOpportunitiesPanel, type SearchOpportunityReport } from './search-opportunities-panel'
const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: request }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
const report: SearchOpportunityReport = { threshold: 10, retentionDays: 180, from: '2026-10-01', to: '2026-10-17', page: 1, total: 1, items: [{ term: 'aulas de violão', searches: 12, empty: 12, exits: 0, withResults: 0, exitRate: 0, opportunity: 'NO_RESULTS' }], networks: [], niches: [], coverage: [{ outcome: 'FAILED', count: null }] }
it('F08-C01 presents demand and limitations without presenting failures as zero results', async () => {
  request.mockResolvedValue({ status: 200, body: report }); render(<SearchOpportunitiesPanel />)
  expect(await screen.findByRole('article', { name: 'aulas de violão' })).toBeTruthy()
  expect(screen.getByText('Sem oferta')).toBeTruthy()
  expect(screen.getByText('Falhas técnicas: amostra insuficiente')).toBeTruthy()
  expect(screen.getByText(/Mínimo de 10/).textContent).toContain('180 dias')
})
it('F08-C02 applies explicit date filters, ignores a stale request and keeps loading geometry', async () => {
  let finish!: (value: unknown) => void
  request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValue({ status: 200, body: report })
  const view = render(<SearchOpportunitiesPanel />)
  expect(view.container.querySelectorAll('[data-skeleton] article')).toHaveLength(3)
  fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } })
  fireEvent.submit(screen.getByRole('form', { name: 'Filtrar oportunidades' }))
  await screen.findByRole('article', { name: 'aulas de violão' })
  expect(request.mock.calls.at(-1)![0]).toContain('from=2026-10-01')
  finish({ status: 200, body: { ...report, items: [], total: 0 } })
  await waitFor(() => expect(screen.getByRole('article', { name: 'aulas de violão' })).toBeTruthy())
})
it('F08-C03 empty, unauthorized and offline/retry states never invent a report', async () => {
  request.mockResolvedValue({ status: 403 }); const denied = render(<SearchOpportunitiesPanel />)
  expect(await screen.findByText(/administradora ativa/)).toBeTruthy(); expect(screen.queryByRole('article')).toBeNull(); denied.unmount()
  request.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 200, body: { ...report, items: [], total: 0 } })
  render(<SearchOpportunitiesPanel />); fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
  expect(await screen.findByText('Sem buscas suficientes neste período e filtros.')).toBeTruthy()
})

it('F08-C04 keeps invalid period feedback and the supplied filters for correction', async () => {
  request.mockResolvedValue({ status: 400, body: { message: 'Escolha até 180 dias.' } })
  render(<SearchOpportunitiesPanel />)
  expect((await screen.findByRole('alert')).textContent).toContain('Escolha até 180 dias.')
  expect(screen.getByRole('button', { name: 'Aplicar filtros' })).toBeTruthy()
})
