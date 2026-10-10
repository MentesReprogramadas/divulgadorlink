import { describe, expect, it } from 'vitest'
import { buyersCsv, financeReport, type FinanceRow } from '@/domain/finance/report'

function row(patch: Partial<FinanceRow>): FinanceRow {
  return {
    id: 'o',
    userId: 'u1',
    userName: 'Ana',
    email: 'ana@example.com',
    status: 'PAID',
    method: 'PIX',
    productCode: 'SEARCH',
    durationDays: 7,
    amountCents: 1000,
    savingsCents: 0,
    renewal: false,
    createdAt: new Date('2026-10-10T13:00:00Z'),
    paidAt: new Date('2026-10-10T13:02:00Z'),
    firstPaidAt: new Date('2026-10-10T13:02:00Z'),
    source: '',
    medium: '',
    campaign: '',
    ...patch,
  }
}

const fees = { pixBp: 100, cardBp: 399, cardFixedCents: 39 }
const range = { from: '2026-10-01', to: '2026-10-31' }

describe('relatório financeiro', () => {
  const rows = [
    row({ id: 'a' }),
    row({ id: 'b', userId: 'u2', userName: 'Bia', email: 'bia@example.com', method: 'CARD', amountCents: 3000, productCode: 'HOME', firstPaidAt: new Date('2026-09-01T12:00:00Z'), campaign: 'outubro', source: 'meta', medium: 'paid' }),
    row({ id: 'c', status: 'EXPIRED', paidAt: null }),
    row({ id: 'd', status: 'PAID_LATE', paidAt: new Date('2026-10-10T14:00:00Z') }),
    row({ id: 'e', status: 'REFUNDED', amountCents: 500, paidAt: new Date('2026-10-11T14:00:00Z') }),
    row({ id: 'f', createdAt: new Date('2026-09-20T12:00:00Z'), paidAt: new Date('2026-09-20T12:01:00Z') }),
  ]

  it('separa receita mantida, recebida, estornada e taxa estimada', () => {
    const report = financeReport(rows, fees, range)
    expect(report.summary.revenueCents).toBe(4000)
    expect(report.summary.paidOrders).toBe(2)
    expect(report.summary.avgTicketCents).toBe(2000)
    expect(report.summary.receivedCents).toBe(5500)
    expect(report.summary.refundedCents).toBe(500)
    expect(report.summary.refundOwedCents).toBe(1000)
    expect(report.summary.feesCents).toBe(10 + 120 + 39 + 10 + 5)
    expect(report.summary.netCents).toBe(4000 - (10 + 120 + 39 + 10 + 5))
    expect(report.summary.buyers).toBe(2)
    expect(report.summary.newBuyers).toBe(1)
  })

  it('compara Pix e cartão pela conversão do checkout criado no período', () => {
    const report = financeReport(rows, fees, range)
    const pix = report.methods.find((item) => item.method === 'PIX')!
    expect(pix.checkouts).toBe(4)
    expect(pix.paid).toBe(1)
    expect(pix.expired).toBe(1)
    expect(pix.paidLate).toBe(2)
    expect(pix.medianSecondsToPay).toBe(120)
  })

  it('posiciona o pagamento na hora de São Paulo', () => {
    const report = financeReport(rows, fees, range)
    const cell = report.heatmap.find((item) => item.weekday === 6 && item.hour === 10)
    expect(cell).toMatchObject({ orders: 2, revenueCents: 4000 })
  })

  it('aplica filtros de método, produto e renovação', () => {
    expect(financeReport(rows, fees, { ...range, method: 'CARD' }).summary.revenueCents).toBe(3000)
    expect(financeReport(rows, fees, { ...range, product: 'SEARCH' }).summary.revenueCents).toBe(1000)
    expect(financeReport(rows, fees, { ...range, renewal: 'renewal' }).summary.paidOrders).toBe(0)
  })

  it('agrega campanha e pagadores e exporta CSV sem quebrar com vírgula', () => {
    const report = financeReport(rows, fees, range)
    expect(report.campaigns).toEqual([{ source: 'meta', medium: 'paid', campaign: 'outubro', orders: 1, revenueCents: 3000 }])
    expect(report.buyers[0]).toMatchObject({ userId: 'u2', revenueCents: 3000, isNew: false, methods: ['CARD'] })
    const csv = buyersCsv([{ ...report.buyers[0]!, name: 'Bia, "a"' }])
    expect(csv.split('\n')[1]).toContain('"Bia, ""a"""')
  })
})
