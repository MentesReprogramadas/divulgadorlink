'use client'

import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { api } from '@/lib/api'
import { InsightTabs, panelProps } from './insight-tabs'

type Method = 'PIX' | 'CARD'

type Finance = {
  filters: { from: string; to: string }
  fees: Fees
  truncated: boolean
  sample: { paidOrders: number; checkouts: number }
  summary: {
    revenueCents: number
    paidOrders: number
    avgTicketCents: number
    receivedCents: number
    refundedCents: number
    refundOwedCents: number
    feesCents: number
    netCents: number
    savingsCents: number
    buyers: number
    newBuyers: number
    renewalOrders: number
  }
  methods: Array<{
    method: Method
    checkouts: number
    paid: number
    conversion: number
    expired: number
    paidLate: number
    pending: number
    revenueCents: number
    feesCents: number
    medianSecondsToPay: number | null
  }>
  daily: Array<{ day: string; orders: number; revenueCents: number }>
  heatmap: Array<{ weekday: number; hour: number; orders: number; revenueCents: number }>
  timeToPay: Array<{ label: string; orders: number }>
  products: Array<{ productCode: string; durationDays: number; orders: number; revenueCents: number }>
  refunds: Array<{ status: string; orders: number; amountCents: number }>
  campaigns: Array<{ source: string; medium: string; campaign: string; orders: number; revenueCents: number }>
  buyers: Array<{ userId: string; name: string; email: string; orders: number; revenueCents: number; firstPaidAt: string; lastPaidAt: string; methods: Method[]; isNew: boolean }>
  buyersTotal: number
}

type Fees = { pixBp: number; pixFixedCents: number; cardBp: number; cardFixedCents: number }

type Filters = { from: string; to: string; method: string; product: string; durationDays: string; renewal: string }

const PRODUCTS: Record<string, string> = {
  SEARCH: 'Busca',
  NICHE: 'Nicho',
  HOME: 'Home',
  SEARCH_NICHE: 'Busca + nicho',
  SEARCH_NICHE_HOME: 'Busca + nicho + home',
}

const REFUND_LABEL: Record<string, string> = {
  PAID_LATE: 'Pago após expirar',
  REFUND_PENDING: 'Estorno em curso',
  REFUNDED: 'Estornado',
  REFUND_FAILED: 'Estorno falhou',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const METHOD_LABEL: Record<Method, string> = { PIX: 'Pix', CARD: 'Cartão' }

type Tab = 'resumo' | 'horarios' | 'vendas' | 'pagantes' | 'taxas'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'horarios', label: 'Horários' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'pagantes', label: 'Pagantes' },
  { id: 'taxas', label: 'Taxas' },
]

function count(value: number): string {
  return value.toLocaleString('pt-BR')
}

function percent(value: number): string {
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export function duration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  return `${(seconds / 3600).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
}

function showDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return day && month && year ? `${day}/${month}/${year}` : iso
}

function today(offsetDays = 0): string {
  const at = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

export function financeQuery(filters: Filters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...filters, ...extra })) if (value) params.set(key, value)
  return params.toString()
}

export function FinancePanel() {
  const [filters, setFilters] = useState<Filters>({ from: today(-29), to: today(), method: '', product: '', durationDays: '', renewal: '' })
  const [applied, setApplied] = useState(filters)
  const [view, setView] = useState<Finance | null>(null)
  const [failed, setFailed] = useState('')
  const [fees, setFees] = useState({ pix: '', pixFixed: '', card: '', fixed: '' })
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<Tab>('resumo')

  async function load(current: Filters) {
    setFailed('')
    const response = await api<Finance & { message?: string }>(`/v1/admin/finance?${financeQuery(current)}`)
    if (response.status !== 200) {
      setFailed(response.body.message ?? 'Não foi possível ler o financeiro.')
      return
    }
    setView(response.body)
    setFees({
      pix: String(response.body.fees.pixBp / 100),
      pixFixed: String(response.body.fees.pixFixedCents / 100),
      card: String(response.body.fees.cardBp / 100),
      fixed: String(response.body.fees.cardFixedCents / 100),
    })
  }

  useEffect(() => {
    void load(applied)
  }, [applied])

  async function saveFees() {
    setNotice('')
    const body = {
      pixBp: Math.round(Number(fees.pix.replace(',', '.')) * 100),
      pixFixedCents: Math.round(Number(fees.pixFixed.replace(',', '.')) * 100),
      cardBp: Math.round(Number(fees.card.replace(',', '.')) * 100),
      cardFixedCents: Math.round(Number(fees.fixed.replace(',', '.')) * 100),
    }
    const response = await api<{ message?: string }>('/v1/admin/finance/fees', { method: 'PATCH', body: JSON.stringify(body) })
    if (response.status !== 200) {
      setNotice(response.body.message ?? 'Taxa não salva.')
      return
    }
    setNotice('Taxas salvas. O líquido usa estes valores para todo o período.')
    await load(applied)
  }

  const update = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }))
  const dayPeak = Math.max(1, ...(view?.daily.map((row) => row.revenueCents) ?? [1]))
  const payPeak = Math.max(1, ...(view?.timeToPay.map((row) => row.orders) ?? [1]))
  const weekdays = WEEKDAYS.map((label, weekday) => {
    const cells = view?.heatmap.filter((cell) => cell.weekday === weekday) ?? []
    return {
      label,
      orders: cells.reduce((total, cell) => total + cell.orders, 0),
      revenueCents: cells.reduce((total, cell) => total + cell.revenueCents, 0),
    }
  })
  const weekdayPeak = Math.max(1, ...weekdays.map((row) => row.orders))
  const slots = [...(view?.heatmap ?? [])].sort((a, b) => b.orders - a.orders || b.revenueCents - a.revenueCents)

  return (
    <section aria-label="Financeiro" className="finance">
      <form className="finance-filters" onSubmit={(event) => { event.preventDefault(); setApplied(filters) }}>
        <label className="field-block"><span className="field-label">De</span><input className="field" type="date" value={filters.from} onChange={(event) => update({ from: event.target.value })} /></label>
        <label className="field-block"><span className="field-label">Até</span><input className="field" type="date" value={filters.to} onChange={(event) => update({ to: event.target.value })} /></label>
        <label className="field-block">
          <span className="field-label">Método</span>
          <select className="field" value={filters.method} onChange={(event) => update({ method: event.target.value })}>
            <option value="">Todos</option><option value="PIX">Pix</option><option value="CARD">Cartão</option>
          </select>
        </label>
        <label className="field-block">
          <span className="field-label">Produto</span>
          <select className="field" value={filters.product} onChange={(event) => update({ product: event.target.value })}>
            <option value="">Todos</option>
            {Object.entries(PRODUCTS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label className="field-block">
          <span className="field-label">Duração</span>
          <select className="field" value={filters.durationDays} onChange={(event) => update({ durationDays: event.target.value })}>
            <option value="">Todas</option><option value="7">7 dias</option><option value="14">14 dias</option><option value="28">28 dias</option>
          </select>
        </label>
        <label className="field-block">
          <span className="field-label">Compra</span>
          <select className="field" value={filters.renewal} onChange={(event) => update({ renewal: event.target.value })}>
            <option value="">Todas</option><option value="new">Primeira</option><option value="renewal">Renovação</option>
          </select>
        </label>
        <Button type="submit">Aplicar</Button>
      </form>

      {failed ? <ErrorState onRetry={() => load(applied)} /> : null}
      {!view && !failed ? <p>Carregando…</p> : null}
      {view ? (
        <>
          <p className="office-note">
            {showDay(view.filters.from)} a {showDay(view.filters.to)}, horário de São Paulo. {count(view.sample.paidOrders)} pagamentos e {count(view.sample.checkouts)} checkouts na amostra
            {view.sample.paidOrders < 30 ? ': poucos para tirar padrão de hora ou produto.' : '.'}
            {view.truncated ? ' O período passou de 20 mil pedidos e foi cortado; reduza o intervalo.' : ''}
          </p>

          <InsightTabs name="financeiro" label="Financeiro" tabs={TABS} current={tab} onChange={setTab} />

          {tab === 'resumo' ? (
            <div {...panelProps('financeiro', 'resumo')}>
              <dl className="insight-metrics">
                <div><dt>Receita</dt><dd>{formatCents(view.summary.revenueCents)} · {count(view.summary.paidOrders)} pedidos</dd></div>
                <div><dt>Líquido estimado</dt><dd>{formatCents(view.summary.netCents)} · taxa {formatCents(view.summary.feesCents)}</dd></div>
                <div><dt>Ticket médio</dt><dd>{formatCents(view.summary.avgTicketCents)} · desconto {formatCents(view.summary.savingsCents)}</dd></div>
                <div><dt>Pagantes</dt><dd>{count(view.summary.buyers)} · {count(view.summary.newBuyers)} novos · {count(view.summary.renewalOrders)} renovações</dd></div>
              </dl>
              <h2>Pix e cartão</h2>
              <ul className="insight-rows">
                {view.methods.map((row) => (
                  <li key={row.method}>
                    <strong>{METHOD_LABEL[row.method]} · {formatCents(row.revenueCents)}</strong>
                    <span>Taxa {formatCents(row.feesCents)} · mediana até pagar {duration(row.medianSecondsToPay)}</span>
                    <span>{count(row.paid)} de {count(row.checkouts)} checkouts pagos · {percent(row.conversion)}</span>
                    <span>{count(row.expired)} expirados · {count(row.pending)} pendentes · {count(row.paidLate)} pagos fora do prazo</span>
                  </li>
                ))}
              </ul>
              <h2>Receita por dia</h2>
              {view.daily.length === 0 ? <p>Nenhum pagamento no período.</p> : (
                <ul className="traffic-bars insight-bars">
                  {view.daily.map((row) => (
                    <li key={row.day}>
                      <span>{showDay(row.day).slice(0, 5)}</span>
                      <span className="traffic-bar" style={{ width: `${(row.revenueCents / dayPeak) * 100}%` }} />
                      <span>{formatCents(row.revenueCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'horarios' ? (
            <div {...panelProps('financeiro', 'horarios')}>
              <h2>Dia da semana</h2>
              <ul className="traffic-bars insight-bars">
                {weekdays.map((row) => (
                  <li key={row.label}>
                    <span>{row.label}</span>
                    <span className="traffic-bar" style={{ width: `${(row.orders / weekdayPeak) * 100}%` }} />
                    <span>{count(row.orders)}</span>
                  </li>
                ))}
              </ul>
              <h2>Horários com pagamento</h2>
              {slots.length === 0 ? <p>Nenhum pagamento no período.</p> : (
                <ul className="insight-rows">
                  {slots.map((cell) => (
                    <li key={`${cell.weekday}-${cell.hour}`}>
                      <strong>{WEEKDAYS[cell.weekday]} {cell.hour}h</strong>
                      <span>{count(cell.orders)} pagamentos · {formatCents(cell.revenueCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <h2>Tempo até pagar</h2>
              <ul className="traffic-bars insight-bars">
                {view.timeToPay.map((row) => (
                  <li key={row.label}>
                    <span>{row.label}</span>
                    <span className="traffic-bar" style={{ width: `${(row.orders / payPeak) * 100}%` }} />
                    <span>{count(row.orders)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tab === 'vendas' ? (
            <div {...panelProps('financeiro', 'vendas')}>
              <h2>Produtos</h2>
              {view.products.length === 0 ? <p>Nenhum produto vendido.</p> : (
                <ul className="insight-rows">
                  {view.products.map((row) => (
                    <li key={`${row.productCode}-${row.durationDays}`}>
                      <strong>{PRODUCTS[row.productCode] ?? row.productCode} · {row.durationDays} dias</strong>
                      <span>{count(row.orders)} pedidos · {formatCents(row.revenueCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <h2>Estornos</h2>
              <p className="office-note">Recebido no período: {formatCents(view.summary.receivedCents)}. Já devolvido: {formatCents(view.summary.refundedCents)}. Ainda a devolver: {formatCents(view.summary.refundOwedCents)}.</p>
              {view.refunds.length === 0 ? <p>Nenhum estorno.</p> : (
                <ul className="insight-rows">
                  {view.refunds.map((row) => (
                    <li key={row.status}>
                      <strong>{REFUND_LABEL[row.status] ?? row.status}</strong>
                      <span>{count(row.orders)} pedidos · {formatCents(row.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <h2>Campanhas</h2>
              <p className="office-note">Só links de quem aceitou cookies carregam a campanha. O restante não aparece aqui.</p>
              {view.campaigns.length === 0 ? <p>Nenhuma venda atribuída.</p> : (
                <ul className="insight-rows">
                  {view.campaigns.map((row) => (
                    <li key={`${row.source}|${row.medium}|${row.campaign}`}>
                      <strong>{row.campaign}</strong>
                      <span>{row.source || '—'} / {row.medium || '—'}</span>
                      <span>{count(row.orders)} pedidos · {formatCents(row.revenueCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'pagantes' ? (
            <div {...panelProps('financeiro', 'pagantes')}>
              <p className="office-note">
                {count(view.buyersTotal)} pagantes no filtro{view.buyersTotal > view.buyers.length ? `, mostrando ${view.buyers.length}` : ''}.{' '}
                <a href={`/bff/v1/admin/finance/export?${financeQuery(applied, { kind: 'buyers' })}`}>Baixar pagantes (CSV)</a>{' · '}
                <a href={`/bff/v1/admin/finance/export?${financeQuery(applied, { kind: 'orders' })}`}>Baixar pedidos (CSV)</a>
              </p>
              {view.buyers.length === 0 ? <p>Ninguém pagou no período.</p> : (
                <ul className="insight-rows">
                  {view.buyers.map((row) => (
                    <li key={row.userId}>
                      <strong>{row.name || 'Sem nome'}{row.isNew ? ' · novo' : ''}</strong>
                      <span>{row.email}</span>
                      <span>{formatCents(row.revenueCents)} em {count(row.orders)} pedidos · {row.methods.map((item) => METHOD_LABEL[item]).join(' + ')}</span>
                      <span>Primeiro {showDay(row.firstPaidAt)} · último {showDay(row.lastPaidAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'taxas' ? (
            <div {...panelProps('financeiro', 'taxas')}>
              <p className="office-note">Pix é um valor por pagamento confirmado. No cartão, 3,99% + R$ 0,39</p>
              <form className="finance-filters" onSubmit={(event) => { event.preventDefault(); void saveFees() }}>
                <label className="field-block"><span className="field-label">Pix (%)</span><input className="field" inputMode="decimal" value={fees.pix} onChange={(event) => setFees({ ...fees, pix: event.target.value })} /></label>
                <label className="field-block"><span className="field-label">Pix por pagamento (R$)</span><input className="field" inputMode="decimal" value={fees.pixFixed} onChange={(event) => setFees({ ...fees, pixFixed: event.target.value })} /></label>
                <label className="field-block"><span className="field-label">Cartão (%)</span><input className="field" inputMode="decimal" value={fees.card} onChange={(event) => setFees({ ...fees, card: event.target.value })} /></label>
                <label className="field-block"><span className="field-label">Cartão fixo (R$)</span><input className="field" inputMode="decimal" value={fees.fixed} onChange={(event) => setFees({ ...fees, fixed: event.target.value })} /></label>
                <Button type="submit" variant="secondary">Salvar taxas</Button>
              </form>
              {notice ? <p role="status">{notice}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
