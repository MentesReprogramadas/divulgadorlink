import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { chooseSelect } from '@/test-select'
import { OfficeBoard } from './office'

vi.mock('@/lib/api', () => ({ api: vi.fn(async () => ({ status: 200, body: {
  windowDays: 30, listCap: 100, linkStatusCounts: {},
  metrics: { users: 0, bannedUsers: 0, links: 0, publishedLinks: 0, pendingLinks: 0, impressions: 0, clicks: 0, ctr: 0, paidCents: 0, paidOrders: 0 },
  topLinks: [], topPayers: [], users: [], links: [],
} })) }))
vi.mock('@/components/ui/metric-chart', () => ({ MetricChart: () => <p>Gráfico</p> }))
afterEach(cleanup)

it('informa ausência de cliques sem criar um gráfico ou deixar a área em branco', async () => {
  render(<OfficeBoard />)
  await screen.findByText('Próximas ações')
  await chooseSelect(screen.getByRole('combobox', { name: 'Área de gestão' }), 'cliques')
  expect(screen.getByRole('status').textContent).toBe('Ainda não há links com cliques neste período.')
  expect(screen.queryByText('Gráfico')).toBeNull()
})

it('informa ausência de pagadores sem inventar registros financeiros', async () => {
  render(<OfficeBoard />)
  await screen.findByText('Próximas ações')
  await chooseSelect(screen.getByRole('combobox', { name: 'Área de gestão' }), 'pagadores')
  expect(screen.getByRole('status').textContent).toBe('Ainda não há pagamentos confirmados neste período.')
  expect(screen.queryByRole('table')).toBeNull()
})
