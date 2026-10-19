'use client'

import { DatePicker } from '@/components/ui/date-picker'
import { InsightSkeleton } from '@/features/administration/components/insight-skeleton'

import { ActionIcon } from '@/components/ui/action-icon'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { Field, Select } from '@/components/ui/input'

import { useEffect, useRef, useState } from 'react'
import { MetricCards } from '@/components/ui/metric-cards'
import { MetricChart } from '@/components/ui/metric-chart'
import { ReportView } from '@/components/ui/report-view'
import styles from '@/components/layout/workspace-dashboard.module.css'
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
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState('')
  const [fees, setFees] = useState({ pix: '', pixFixed: '', card: '', fixed: '' })
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<Tab>('resumo')

  async function load(current: Filters) {
    const sequence = ++requestSequence.current
    setLoading(true)
    setFailed('')
    const response = await api<Finance & { message?: string }>(`/v1/admin/finance?${financeQuery(current)}`).catch(() => null)
    if (sequence !== requestSequence.current) return
    setLoading(false)
    if (!response) { setView(null); setFailed('Não foi possível ler o financeiro.'); return }
    if (response.status !== 200) {
      setView(null)
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

  const filterContainer = useRef<HTMLElement>(null)
  const requestSequence = useRef(0)
  useEffect(() => {
    void load(applied).catch(() => { setView(null); setFailed('Não foi possível ler o financeiro.') })
    return () => { requestSequence.current++ }
  }, [applied])
  useEffect(() => {
    const timer = setTimeout(() => { if (filterContainer.current?.querySelector<HTMLFormElement>('#finance-filters')?.checkValidity()) setApplied(filters) }, 450)
    return () => clearTimeout(timer)
  }, [filters])

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
  const weekdays = WEEKDAYS.map((label, weekday) => ({ label, orders: (view?.heatmap ?? []).filter(cell => cell.weekday === weekday).reduce((sum, cell) => sum + cell.orders, 0) }))
  const slots = [...(view?.heatmap ?? [])].sort((a,b) => b.orders - a.orders || b.revenueCents - a.revenueCents)
  return <section ref={filterContainer} aria-label="Financeiro" className={styles.dashboard} aria-busy={loading}>
    <WorkspaceFilters id="finance-filters" label="Filtrar financeiro" onSubmit={event => { event.preventDefault(); setApplied(filters) }}>
      <Field label="De"><DatePicker value={filters.from} onChange={event => update({ from: event.target.value })}/></Field>
      <Field label="Até"><DatePicker value={filters.to} onChange={event => update({ to: event.target.value })}/></Field>
      <Field label="Método"><Select value={filters.method} onChange={event => update({ method: event.target.value })}><option value="">Todos</option><option value="PIX">Pix</option><option value="CARD">Cartão</option></Select></Field>
      <Field label="Produto"><Select value={filters.product} onChange={event => update({ product: event.target.value })}><option value="">Todos</option>{Object.entries(PRODUCTS).map(([code,label]) => <option key={code} value={code}>{label}</option>)}</Select></Field>
      <Field label="Duração"><Select value={filters.durationDays} onChange={event => update({ durationDays: event.target.value })}><option value="">Todas</option><option value="7">7 dias</option><option value="14">14 dias</option><option value="28">28 dias</option></Select></Field>
      <Field label="Compra"><Select value={filters.renewal} onChange={event => update({ renewal: event.target.value })}><option value="">Todas</option><option value="new">Primeira</option><option value="renewal">Renovação</option></Select></Field>
    </WorkspaceFilters>
    {failed ? <ErrorState message={failed} onRetry={() => load(applied)}/> : null}
    {!view && !failed ? <InsightSkeleton kind="finance"/> : null}
    {view ? <>
      <p className={styles.result}>{showDay(view.filters.from)} a {showDay(view.filters.to)} · São Paulo</p>
      {view.truncated ? <p role="status">O período passou de 20 mil pedidos e foi cortado; reduza o intervalo.</p> : null}
      <MetricCards items={[{label:'Receita',value:formatCents(view.summary.revenueCents),note:`${count(view.summary.paidOrders)} pedidos pagos`,primary:true},{label:'Líquido estimado',value:formatCents(view.summary.netCents),note:`Taxas: ${formatCents(view.summary.feesCents)}`,primary:true},{label:'Ticket médio',value:formatCents(view.summary.avgTicketCents),note:`Desconto: ${formatCents(view.summary.savingsCents)}`,primary:true},{label:'Pagantes',value:count(view.summary.buyers),note:`${count(view.summary.newBuyers)} novos · ${count(view.summary.renewalOrders)} renovações`}]} />
      <InsightTabs name="financeiro" label="Financeiro" tabs={TABS} current={tab} onChange={setTab}/>
      {tab === 'resumo' ? <div {...panelProps('financeiro','resumo')} className={styles.dashboard}>
        <ReportView title="Receita por dia" rows={view.daily} rowKey={row=>row.day} columns={[{label:'Dia',render:row=>showDay(row.day)},{label:'Pedidos',render:row=>count(row.orders),numeric:true},{label:'Receita',render:row=>formatCents(row.revenueCents),numeric:true}]} chart={<MetricChart kind="timeline" format="money" label="Receita por dia" rows={view.daily.map(row=>({label:row.day,value:row.revenueCents}))}/>}/>
        <h2>Pix e cartão</h2><MetricCards items={view.methods.map(row=>({label:METHOD_LABEL[row.method],value:formatCents(row.revenueCents),note:<><span>Taxa {formatCents(row.feesCents)} · mediana até pagar {duration(row.medianSecondsToPay)}</span><br/><span>{count(row.paid)} de {count(row.checkouts)} checkouts pagos · {percent(row.conversion)}</span><br/><span>{count(row.expired)} expirados · {count(row.pending)} pendentes · {count(row.paidLate)} pagos fora do prazo</span></>}))}/>
      </div> : null}
      {tab === 'horarios' ? <div {...panelProps('financeiro','horarios')} className={styles.dashboard}>
        <ReportView title="Dia da semana" rows={weekdays} rowKey={row=>row.label} columns={[{label:'Dia',render:row=>row.label},{label:'Pagamentos',render:row=>count(row.orders),numeric:true}]} chart={<MetricChart kind="ranking" label="Pagamentos por dia da semana" rows={weekdays.map(row=>({label:row.label,value:row.orders}))}/>}/>
        <ReportView title="Horários com pagamento" rows={slots} rowKey={row=>`${row.weekday}-${row.hour}`} columns={[{label:'Horário',render:row=>`${WEEKDAYS[row.weekday]} ${row.hour}h`},{label:'Pagamentos',render:row=>count(row.orders),numeric:true},{label:'Receita',render:row=>formatCents(row.revenueCents),numeric:true}]} chart={<MetricChart kind="ranking" label="Horários com pagamento" rows={slots.map(row=>({label:`${WEEKDAYS[row.weekday]} ${row.hour}h`,value:row.orders}))}/>}/>
        <ReportView title="Tempo até pagar" rows={view.timeToPay} rowKey={row=>row.label} columns={[{label:'Intervalo',render:row=>row.label},{label:'Pedidos',render:row=>count(row.orders),numeric:true}]} chart={<MetricChart kind="ranking" label="Tempo até pagar" rows={view.timeToPay.map(row=>({label:row.label,value:row.orders}))}/>}/>
      </div> : null}
      {tab === 'vendas' ? <div {...panelProps('financeiro','vendas')} className={styles.dashboard}>
        <ReportView title="Produtos" rows={view.products} rowKey={row=>`${row.productCode}-${row.durationDays}`} columns={[{label:'Produto',render:row=>PRODUCTS[row.productCode]??row.productCode},{label:'Duração',render:row=>`${row.durationDays} dias`},{label:'Pedidos',render:row=>count(row.orders),numeric:true},{label:'Receita',render:row=>formatCents(row.revenueCents),numeric:true}]} chart={<MetricChart kind="ranking" format="money" label="Receita por produto" rows={view.products.map(row=>({label:`${PRODUCTS[row.productCode]??row.productCode} · ${row.durationDays} dias`,value:row.revenueCents}))}/>}/>
        <MetricCards label="Estornos do período" items={[{label:'Recebido no período',value:formatCents(view.summary.receivedCents)},{label:'Já devolvido',value:formatCents(view.summary.refundedCents)},{label:'Ainda a devolver',value:formatCents(view.summary.refundOwedCents)}]}/>
        <ReportView title="Estornos" rows={view.refunds} rowKey={row=>row.status} columns={[{label:'Situação',render:row=>REFUND_LABEL[row.status]??row.status},{label:'Pedidos',render:row=>count(row.orders),numeric:true},{label:'Valor',render:row=>formatCents(row.amountCents),numeric:true}]} chart={<MetricChart kind="ranking" format="money" label="Valores por situação do estorno" rows={view.refunds.map(row=>({label:REFUND_LABEL[row.status]??row.status,value:row.amountCents}))}/>}/>
        <ReportView title="Campanhas" rows={view.campaigns} rowKey={row=>JSON.stringify([row.source,row.medium,row.campaign])} columns={[{label:'Campanha',render:row=>row.campaign},{label:'Origem / mídia',render:row=>`${row.source||'—'} / ${row.medium||'—'}`},{label:'Pedidos',render:row=>count(row.orders),numeric:true},{label:'Receita',render:row=>formatCents(row.revenueCents),numeric:true}]} chart={<MetricChart kind="ranking" format="money" label="Receita por campanha" rows={view.campaigns.map(row=>({label:row.campaign,value:row.revenueCents}))}/>}><p className={styles.result}>Só links de quem aceitou cookies carregam a campanha. O restante não aparece aqui.</p></ReportView>
      </div> : null}
      {tab === 'pagantes' ? <div {...panelProps('financeiro','pagantes')} className={styles.dashboard}>
        <WorkspaceActions><a className="button button-secondary" href={`/bff/v1/admin/finance/export?${financeQuery(applied,{kind:'buyers'})}`}><ActionIcon name="download"/>Baixar pagantes (CSV)</a><a className="button button-secondary" href={`/bff/v1/admin/finance/export?${financeQuery(applied,{kind:'orders'})}`}><ActionIcon name="download"/>Baixar pedidos (CSV)</a></WorkspaceActions>
        <p className={styles.result}>{count(view.buyersTotal)} pagantes no filtro{view.buyersTotal>view.buyers.length?`, mostrando ${view.buyers.length}`:''}.</p>
        <ReportView title="Pagantes no período" rows={view.buyers} rowKey={row=>row.userId} columns={[{label:'Nome',render:row=><>{row.name||'Sem nome'}{row.isNew?' · novo':''}<br/>{row.email}</>},{label:'Pedidos',render:row=>count(row.orders),numeric:true},{label:'Receita',render:row=>formatCents(row.revenueCents),numeric:true},{label:'Métodos',render:row=>row.methods.map(item=>METHOD_LABEL[item]).join(' + ')},{label:'Primeiro / último',render:row=>`${showDay(row.firstPaidAt)} / ${showDay(row.lastPaidAt)}`}]} chart={<MetricChart kind="ranking" format="money" label="Receita por pagante" rows={view.buyers.map(row=>({label:row.name||'Sem nome',value:row.revenueCents}))}/>}/>
      </div> : null}
      {tab === 'taxas' ? <div {...panelProps('financeiro','taxas')} className={styles.dashboard}>
        <p className={styles.result}>Pix é um valor por pagamento confirmado. No cartão, 3,99% + R$ 0,39</p>
        <form className="finance-filters" onSubmit={event=>{event.preventDefault();void saveFees()}}>
          <Field label="Pix (%)"><input className="field" inputMode="decimal" value={fees.pix} onChange={event=>setFees({...fees,pix:event.target.value})}/></Field>
          <Field label="Pix por pagamento (R$)"><input className="field" inputMode="decimal" value={fees.pixFixed} onChange={event=>setFees({...fees,pixFixed:event.target.value})}/></Field>
          <Field label="Cartão (%)"><input className="field" inputMode="decimal" value={fees.card} onChange={event=>setFees({...fees,card:event.target.value})}/></Field>
          <Field label="Cartão fixo (R$)"><input className="field" inputMode="decimal" value={fees.fixed} onChange={event=>setFees({...fees,fixed:event.target.value})}/></Field>
          <Button type="submit" variant="secondary"><ActionIcon name="save"/>Salvar taxas</Button>
        </form>{notice?<p role="status">{notice}</p>:null}
      </div> : null}
      <details><summary>Sobre a amostra e os cálculos</summary><p className={styles.result}>{count(view.sample.paidOrders)} pagamentos e {count(view.sample.checkouts)} checkouts na amostra{view.sample.paidOrders<30?': poucos para tirar padrão de hora ou produto.':'.'}</p></details>
    </> : null}
  </section>
}
