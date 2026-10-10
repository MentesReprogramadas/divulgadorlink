'use client'

import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { api } from '@/lib/api'

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

type Fees = { pixBp: number; cardBp: number; cardFixedCents: number }

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
  const [fees, setFees] = useState({ pix: '', card: '', fixed: '' })
  const [notice, setNotice] = useState('')

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
  const peak = Math.max(1, ...(view?.heatmap.map((cell) => cell.orders) ?? [1]))
  const dayPeak = Math.max(1, ...(view?.daily.map((row) => row.revenueCents) ?? [1]))
  const payPeak = Math.max(1, ...(view?.timeToPay.map((row) => row.orders) ?? [1]))

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

          <div className="office-metrics">
            <p className="metric"><span className="metric-value">{formatCents(view.summary.revenueCents)}</span><span className="metric-label">receita · {count(view.summary.paidOrders)} pedidos pagos</span></p>
            <p className="metric"><span className="metric-value">{formatCents(view.summary.netCents)}</span><span className="metric-label">líquido estimado · {formatCents(view.summary.feesCents)} em taxas</span></p>
            <p className="metric"><span className="metric-value">{formatCents(view.summary.avgTicketCents)}</span><span className="metric-label">ticket médio · {formatCents(view.summary.savingsCents)} em desconto</span></p>
            <p className="metric"><span className="metric-value">{count(view.summary.buyers)}</span><span className="metric-label">pagantes · {count(view.summary.newBuyers)} novos · {count(view.summary.renewalOrders)} renovações</span></p>
          </div>

          <h2>Pix e cartão</h2>
          <div className="refund-grid">
            {view.methods.map((row) => (
              <article key={row.method} className="summary-card">
                <h2>{METHOD_LABEL[row.method]}</h2>
                <p>{formatCents(row.revenueCents)} · taxa {formatCents(row.feesCents)}</p>
                <p>{count(row.paid)} de {count(row.checkouts)} checkouts pagos · {percent(row.conversion)}</p>
                <p>{count(row.expired)} expirados · {count(row.pending)} pendentes · {count(row.paidLate)} pagos fora do prazo</p>
                <p>Mediana até pagar: {duration(row.medianSecondsToPay)}</p>
              </article>
            ))}
          </div>

          <h2>Receita por dia</h2>
          {view.daily.length === 0 ? <p>Nenhum pagamento no período.</p> : (
            <ul className="traffic-bars">
              {view.daily.map((row) => (
                <li key={row.day}>
                  <span>{showDay(row.day).slice(0, 5)}</span>
                  <span className="traffic-bar" style={{ width: `${(row.revenueCents / dayPeak) * 100}%` }} />
                  <span>{formatCents(row.revenueCents)}</span>
                </li>
              ))}
            </ul>
          )}

          <h2>Quando pagam</h2>
          <div className="finance-heat" role="table" aria-label="Pagamentos por dia da semana e hora">
            <div role="row" className="finance-heat-row">
              <span role="columnheader" />
              {Array.from({ length: 24 }, (_, hour) => <span key={hour} role="columnheader">{hour % 3 === 0 ? hour : ''}</span>)}
            </div>
            {WEEKDAYS.map((label, weekday) => (
              <div key={label} role="row" className="finance-heat-row">
                <span role="rowheader">{label}</span>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = view.heatmap.find((item) => item.weekday === weekday && item.hour === hour)
                  return (
                    <span
                      key={hour}
                      role="cell"
                      className="finance-heat-cell"
                      style={{ opacity: cell ? 0.15 + 0.85 * (cell.orders / peak) : 0.04 }}
                      title={`${label} ${hour}h: ${cell?.orders ?? 0} pagamentos, ${formatCents(cell?.revenueCents ?? 0)}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          <h2>Tempo até pagar</h2>
          <ul className="traffic-bars">
            {view.timeToPay.map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                <span className="traffic-bar" style={{ width: `${(row.orders / payPeak) * 100}%` }} />
                <span>{count(row.orders)}</span>
              </li>
            ))}
          </ul>

          <h2>Produtos</h2>
          {view.products.length === 0 ? <p>Nenhum produto vendido.</p> : (
            <div className="refund-grid">
              {view.products.map((row) => (
                <article key={`${row.productCode}-${row.durationDays}`} className="summary-card">
                  <h2>{PRODUCTS[row.productCode] ?? row.productCode} · {row.durationDays} dias</h2>
                  <p>{count(row.orders)} pedidos · {formatCents(row.revenueCents)}</p>
                </article>
              ))}
            </div>
          )}

          <h2>Estornos</h2>
          <p className="office-note">Recebido no período: {formatCents(view.summary.receivedCents)}. Já devolvido: {formatCents(view.summary.refundedCents)}. Ainda a devolver: {formatCents(view.summary.refundOwedCents)}.</p>
          <div className="refund-grid">
            {view.refunds.map((row) => (
              <article key={row.status} className="summary-card">
                <h2>{REFUND_LABEL[row.status] ?? row.status}</h2>
                <p>{count(row.orders)} pedidos · {formatCents(row.amountCents)}</p>
              </article>
            ))}
          </div>

          <h2>Receita por campanha</h2>
          <p className="office-note">Só links de quem aceitou cookies carregam a campanha. O restante não aparece aqui.</p>
          {view.campaigns.length === 0 ? <p>Nenhuma venda atribuída.</p> : (
            <div className="refund-grid">
              {view.campaigns.map((row) => (
                <article key={`${row.source}|${row.medium}|${row.campaign}`} className="summary-card">
                  <h2>{row.campaign}</h2>
                  <p>{row.source || '—'} / {row.medium || '—'}</p>
                  <p>{count(row.orders)} pedidos · {formatCents(row.revenueCents)}</p>
                </article>
              ))}
            </div>
          )}

          <h2>Quem paga</h2>
          <p className="office-note">
            {count(view.buyersTotal)} pagantes no filtro{view.buyersTotal > view.buyers.length ? `, mostrando ${view.buyers.length}` : ''}.{' '}
            <a href={`/bff/v1/admin/finance/export?${financeQuery(applied, { kind: 'buyers' })}`}>Baixar pagantes (CSV)</a>{' · '}
            <a href={`/bff/v1/admin/finance/export?${financeQuery(applied, { kind: 'orders' })}`}>Baixar pedidos (CSV)</a>
          </p>
          {view.buyers.length === 0 ? <p>Ninguém pagou no período.</p> : (
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr><th>Nome</th><th>E-mail</th><th>Pedidos</th><th>Receita</th><th>Método</th><th>Primeiro</th><th>Último</th></tr>
                </thead>
                <tbody>
                  {view.buyers.map((row) => (
                    <tr key={row.userId}>
                      <td>{row.name || 'Sem nome'}{row.isNew ? <small> · novo</small> : null}</td>
                      <td>{row.email}</td>
                      <td>{count(row.orders)}</td>
                      <td>{formatCents(row.revenueCents)}</td>
                      <td>{row.methods.map((item) => METHOD_LABEL[item]).join(' + ')}</td>
                      <td>{showDay(row.firstPaidAt)}</td>
                      <td>{showDay(row.lastPaidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>Taxas do gateway</h2>
          <p className="office-note">Estimativa: o gateway não informa a taxa por pedido. Confira os valores do seu contrato com Woovi e Stripe.</p>
          <form className="finance-filters" onSubmit={(event) => { event.preventDefault(); void saveFees() }}>
            <label className="field-block"><span className="field-label">Pix (%)</span><input className="field" inputMode="decimal" value={fees.pix} onChange={(event) => setFees({ ...fees, pix: event.target.value })} /></label>
            <label className="field-block"><span className="field-label">Cartão (%)</span><input className="field" inputMode="decimal" value={fees.card} onChange={(event) => setFees({ ...fees, card: event.target.value })} /></label>
            <label className="field-block"><span className="field-label">Cartão fixo (R$)</span><input className="field" inputMode="decimal" value={fees.fixed} onChange={(event) => setFees({ ...fees, fixed: event.target.value })} /></label>
            <Button type="submit" variant="secondary">Salvar taxas</Button>
          </form>
          {notice ? <p role="status">{notice}</p> : null}
        </>
      ) : null}
    </section>
  )
}
