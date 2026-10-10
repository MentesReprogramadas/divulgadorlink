export type FinanceStatus = 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'PAID_LATE' | 'REFUND_PENDING' | 'REFUNDED' | 'REFUND_FAILED'
export type FinanceMethod = 'PIX' | 'CARD'

export type FinanceRow = {
  id: string
  userId: string | null
  userName: string
  email: string
  status: FinanceStatus
  method: FinanceMethod
  productCode: string
  durationDays: number
  amountCents: number
  savingsCents: number
  renewal: boolean
  createdAt: Date
  paidAt: Date | null
  firstPaidAt: Date | null
  source: string
  medium: string
  campaign: string
}

export type FinanceFees = { pixBp: number; pixFixedCents: number; cardBp: number; cardFixedCents: number }

export const CONTRACT_FEES: FinanceFees = { pixBp: 0, pixFixedCents: 85, cardBp: 399, cardFixedCents: 39 }

export type FinanceFilters = {
  from: string
  to: string
  method?: FinanceMethod
  product?: string
  durationDays?: number
  renewal?: 'new' | 'renewal'
}

export type BuyerSummary = {
  userId: string
  name: string
  email: string
  orders: number
  revenueCents: number
  firstPaidAt: string
  lastPaidAt: string
  methods: FinanceMethod[]
  isNew: boolean
}

const LATE = new Set<FinanceStatus>(['PAID_LATE', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'])
const OWED = new Set<FinanceStatus>(['PAID_LATE', 'REFUND_PENDING', 'REFUND_FAILED'])
const BUCKETS: Array<[string, number]> = [['até 1 min', 60], ['1 a 5 min', 300], ['5 a 15 min', 900], ['15 a 60 min', 3600], ['mais de 1 h', Infinity]]

const SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
})
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function saoPaulo(at: Date): { day: string; hour: number; weekday: number } {
  const parts = Object.fromEntries(SP.formatToParts(at).map((part) => [part.type, part.value]))
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? ''),
  }
}

function within(at: Date | null, filters: FinanceFilters): boolean {
  if (!at) return false
  const day = saoPaulo(at).day
  return day >= filters.from && day <= filters.to
}

export function feeCents(row: Pick<FinanceRow, 'method' | 'amountCents'>, fees: FinanceFees): number {
  if (row.method === 'PIX') return Math.round(row.amountCents * fees.pixBp / 10_000) + fees.pixFixedCents
  return Math.round(row.amountCents * fees.cardBp / 10_000) + fees.cardFixedCents
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2) : sorted[middle]!
}

function secondsToPay(row: FinanceRow): number | null {
  if (!row.paidAt) return null
  return Math.max(0, Math.round((row.paidAt.getTime() - row.createdAt.getTime()) / 1000))
}

function matches(row: FinanceRow, filters: FinanceFilters): boolean {
  if (filters.method && row.method !== filters.method) return false
  if (filters.product && row.productCode !== filters.product) return false
  if (filters.durationDays && row.durationDays !== filters.durationDays) return false
  if (filters.renewal === 'new' && row.renewal) return false
  if (filters.renewal === 'renewal' && !row.renewal) return false
  return true
}

export function filterRows(rows: FinanceRow[], filters: FinanceFilters): FinanceRow[] {
  return rows.filter((row) => matches(row, filters))
}

export function financeReport(all: FinanceRow[], fees: FinanceFees, filters: FinanceFilters) {
  const rows = filterRows(all, filters)
  const received = rows.filter((row) => within(row.paidAt, filters))
  const paid = received.filter((row) => row.status === 'PAID')
  const created = rows.filter((row) => within(row.createdAt, filters))
  const revenueCents = paid.reduce((total, row) => total + row.amountCents, 0)
  const feesCents = received.reduce((total, row) => total + feeCents(row, fees), 0)

  const buyers = new Map<string, BuyerSummary>()
  for (const row of paid) {
    if (!row.userId) continue
    const at = row.paidAt!.toISOString()
    const current = buyers.get(row.userId) ?? {
      userId: row.userId,
      name: row.userName,
      email: row.email,
      orders: 0,
      revenueCents: 0,
      firstPaidAt: at,
      lastPaidAt: at,
      methods: [],
      isNew: within(row.firstPaidAt, filters),
    }
    current.orders += 1
    current.revenueCents += row.amountCents
    if (at < current.firstPaidAt) current.firstPaidAt = at
    if (at > current.lastPaidAt) current.lastPaidAt = at
    if (!current.methods.includes(row.method)) current.methods.push(row.method)
    buyers.set(row.userId, current)
  }
  const buyerList = [...buyers.values()].sort((a, b) => b.revenueCents - a.revenueCents)

  const methods = (['PIX', 'CARD'] as const).map((method) => {
    const started = created.filter((row) => row.method === method)
    const converted = started.filter((row) => row.status === 'PAID')
    return {
      method,
      checkouts: started.length,
      paid: converted.length,
      conversion: started.length === 0 ? 0 : converted.length / started.length,
      expired: started.filter((row) => row.status === 'EXPIRED').length,
      paidLate: started.filter((row) => LATE.has(row.status)).length,
      pending: started.filter((row) => row.status === 'PENDING_PAYMENT').length,
      revenueCents: paid.filter((row) => row.method === method).reduce((total, row) => total + row.amountCents, 0),
      feesCents: received.filter((row) => row.method === method).reduce((total, row) => total + feeCents(row, fees), 0),
      medianSecondsToPay: median(converted.map(secondsToPay).filter((value): value is number => value !== null)),
    }
  })

  const heat = new Map<string, { weekday: number; hour: number; orders: number; revenueCents: number }>()
  for (const row of paid) {
    const { weekday, hour } = saoPaulo(row.paidAt!)
    const key = `${weekday}:${hour}`
    const cell = heat.get(key) ?? { weekday, hour, orders: 0, revenueCents: 0 }
    cell.orders += 1
    cell.revenueCents += row.amountCents
    heat.set(key, cell)
  }

  const timeToPay = BUCKETS.map(([label]) => ({ label, orders: 0 }))
  for (const row of paid) {
    const seconds = secondsToPay(row) ?? 0
    const index = BUCKETS.findIndex(([, limit]) => seconds <= limit)
    timeToPay[index]!.orders += 1
  }

  const group = <T extends Record<string, unknown>>(source: FinanceRow[], key: (row: FinanceRow) => T) => {
    const map = new Map<string, T & { orders: number; revenueCents: number }>()
    for (const row of source) {
      const base = key(row)
      const id = JSON.stringify(base)
      const current = map.get(id) ?? { ...base, orders: 0, revenueCents: 0 }
      current.orders += 1
      current.revenueCents += row.amountCents
      map.set(id, current)
    }
    return [...map.values()].sort((a, b) => b.revenueCents - a.revenueCents)
  }

  const refunds = (['PAID_LATE', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'] as const).map((status) => {
    const list = received.filter((row) => row.status === status)
    return { status, orders: list.length, amountCents: list.reduce((total, row) => total + row.amountCents, 0) }
  })

  return {
    filters,
    fees,
    sample: { paidOrders: paid.length, checkouts: created.length },
    summary: {
      revenueCents,
      paidOrders: paid.length,
      avgTicketCents: paid.length === 0 ? 0 : Math.round(revenueCents / paid.length),
      receivedCents: received.reduce((total, row) => total + row.amountCents, 0),
      refundedCents: received.filter((row) => row.status === 'REFUNDED').reduce((total, row) => total + row.amountCents, 0),
      refundOwedCents: received.filter((row) => OWED.has(row.status)).reduce((total, row) => total + row.amountCents, 0),
      feesCents,
      netCents: revenueCents - feesCents,
      savingsCents: paid.reduce((total, row) => total + row.savingsCents, 0),
      buyers: buyerList.length,
      newBuyers: buyerList.filter((item) => item.isNew).length,
      renewalOrders: paid.filter((row) => row.renewal).length,
    },
    methods,
    daily: group(paid, (row) => ({ day: saoPaulo(row.paidAt!).day })).sort((a, b) => a.day.localeCompare(b.day)),
    heatmap: [...heat.values()],
    timeToPay,
    products: group(paid, (row) => ({ productCode: row.productCode, durationDays: row.durationDays })),
    refunds,
    campaigns: group(paid.filter((row) => row.campaign !== ''), (row) => ({ source: row.source, medium: row.medium, campaign: row.campaign })),
    buyers: buyerList,
  }
}

function cell(value: string | number | boolean): string {
  const text = String(value)
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buyersCsv(buyers: BuyerSummary[]): string {
  const header = ['usuario', 'nome', 'email', 'pedidos', 'receita_reais', 'primeiro_pagamento', 'ultimo_pagamento', 'metodos', 'novo_no_periodo']
  const lines = buyers.map((row) => [
    row.userId, row.name, row.email, row.orders, (row.revenueCents / 100).toFixed(2),
    row.firstPaidAt, row.lastPaidAt, row.methods.join('+'), row.isNew ? 'sim' : 'nao',
  ].map(cell).join(','))
  return [header.join(','), ...lines].join('\n')
}

export function ordersCsv(rows: FinanceRow[], fees: FinanceFees): string {
  const header = ['pedido', 'usuario', 'nome', 'email', 'status', 'metodo', 'produto', 'dias', 'valor_reais', 'taxa_estimada_reais', 'renovacao', 'criado_em', 'pago_em', 'campanha']
  const lines = rows.map((row) => [
    row.id, row.userId ?? '', row.userName, row.email, row.status, row.method, row.productCode, row.durationDays,
    (row.amountCents / 100).toFixed(2), row.paidAt ? (feeCents(row, fees) / 100).toFixed(2) : '0.00',
    row.renewal ? 'sim' : 'nao', row.createdAt.toISOString(), row.paidAt?.toISOString() ?? '', row.campaign,
  ].map(cell).join(','))
  return [header.join(','), ...lines].join('\n')
}
