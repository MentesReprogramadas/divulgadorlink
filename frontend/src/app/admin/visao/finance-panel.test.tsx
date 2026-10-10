import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { duration, FinancePanel, financeQuery } from './finance-panel'

const api = vi.fn()
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => api(...args) }))

afterEach(() => {
  cleanup()
  api.mockReset()
})

const report = {
  filters: { from: '2026-09-11', to: '2026-10-10' },
  fees: { pixBp: 0, pixFixedCents: 85, cardBp: 399, cardFixedCents: 39 },
  truncated: false,
  sample: { paidOrders: 2, checkouts: 3 },
  summary: {
    revenueCents: 3980, paidOrders: 2, avgTicketCents: 1990, receivedCents: 3980, refundedCents: 0, refundOwedCents: 0,
    feesCents: 134, netCents: 3846, savingsCents: 0, buyers: 1, newBuyers: 1, renewalOrders: 0,
  },
  methods: [
    { method: 'PIX', checkouts: 2, paid: 1, conversion: 0.5, expired: 1, paidLate: 0, pending: 0, revenueCents: 1990, feesCents: 16, medianSecondsToPay: 90 },
    { method: 'CARD', checkouts: 1, paid: 1, conversion: 1, expired: 0, paidLate: 0, pending: 0, revenueCents: 1990, feesCents: 118, medianSecondsToPay: 20 },
  ],
  daily: [{ day: '2026-10-09', orders: 2, revenueCents: 3980 }],
  heatmap: [{ weekday: 5, hour: 21, orders: 2, revenueCents: 3980 }],
  timeToPay: [{ label: 'até 1 min', orders: 1 }, { label: '1 a 5 min', orders: 1 }],
  products: [{ productCode: 'HOME', durationDays: 7, orders: 2, revenueCents: 3980 }],
  refunds: [],
  campaigns: [{ source: 'meta', medium: 'cpc', campaign: 'outubro', orders: 1, revenueCents: 1990 }],
  buyers: [{ userId: 'u1', name: 'Ana', email: 'ana@example.com', orders: 2, revenueCents: 3980, firstPaidAt: '2026-10-09T21:00:00.000Z', lastPaidAt: '2026-10-09T21:30:00.000Z', methods: ['PIX', 'CARD'], isNew: true }],
  buyersTotal: 1,
}

describe('financeiro na gestão', () => {
  it('mostra Pix contra cartão, pagantes e exporta com o filtro aplicado', async () => {
    api.mockResolvedValue({ status: 200, body: report })
    render(<FinancePanel />)
    expect(await screen.findByText('1 de 2 checkouts pagos · 50%')).toBeTruthy()
    expect(screen.queryByText('ana@example.com')).toBeNull()
    expect(screen.getByText(/poucos para tirar padrão/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Pagantes' }))
    expect(await screen.findByText('ana@example.com')).toBeTruthy()
    expect(screen.getByText(/Pix \+ Cartão/)).toBeTruthy()
    const csv = screen.getByRole('link', { name: 'Baixar pagantes (CSV)' }).getAttribute('href') ?? ''
    expect(csv).toContain('/bff/v1/admin/finance/export?')
    expect(csv).toContain('kind=buyers')

    fireEvent.click(screen.getByRole('tab', { name: 'Resumo' }))
    fireEvent.change(screen.getByLabelText('Método'), { target: { value: 'PIX' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(String(api.mock.calls.at(-1)?.[0])).toContain('method=PIX'))
  })

  it('salva taxas em pontos-base e centavos', async () => {
    api.mockResolvedValue({ status: 200, body: report })
    render(<FinancePanel />)
    await screen.findByText('1 de 2 checkouts pagos · 50%')
    fireEvent.click(screen.getByRole('tab', { name: 'Taxas' }))
    fireEvent.change(screen.getByLabelText('Pix (%)'), { target: { value: '0,99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar taxas' }))
    await screen.findByText(/Taxas salvas/)
    const patch = api.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === 'PATCH')
    expect(JSON.parse(String((patch?.[1] as RequestInit).body))).toEqual({ pixBp: 99, pixFixedCents: 85, cardBp: 399, cardFixedCents: 39 })
  })

  it('formata filtro e duração', () => {
    expect(financeQuery({ from: '2026-10-01', to: '', method: 'CARD', product: '', durationDays: '', renewal: '' }, { kind: 'orders' })).toBe('from=2026-10-01&method=CARD&kind=orders')
    expect(duration(null)).toBe('—')
    expect(duration(90)).toBe('2 min')
    expect(duration(5400)).toBe('1,5 h')
  })
})
