'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { ActionIcon } from '@/components/ui/action-icon'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import {MetricCards} from '@/components/ui/metric-cards'
import {MetricChart} from '@/components/ui/metric-chart'
import {ReportView} from '@/components/ui/report-view'
import styles from './search-opportunities.module.css'

type Row = { term: string; searches: number; empty: number; exits: number; withResults: number; exitRate: number; opportunity: 'NO_RESULTS' | 'LOW_INTERACTION' | 'OBSERVE' }
type Facet = { id: string; name: string }
export type SearchOpportunityReport = { threshold: number; retentionDays: number; from: string; to: string; page: number; total: number; items: Row[]; networks: Facet[]; niches: Facet[]; coverage: Array<{ outcome: string; count: number | null }> }
const LABELS = { NO_RESULTS: 'Sem oferta', LOW_INTERACTION: 'Pouca interação', OBSERVE: 'Acompanhar' }
function SearchPolicy({ report }: { report?: SearchOpportunityReport }) {
  return <p className={styles.policy}>Mínimo de {report ? report.threshold : <span data-skeleton-block className={styles.ghost}>00</span>} buscas com consentimento por grupo. Últimos {report ? report.retentionDays : <span data-skeleton-block className={styles.ghost}>000</span>} dias disponíveis. Saída significa abrir o destino do link.</p>
}
function SearchCard({ row, loading = false }: { row?: Row; loading?: boolean }) {
  const value = (content: ReactNode) => loading ? <span data-skeleton-block className={styles.ghost}>{content}</span> : content
  return <article className={styles.card} aria-label={row?.term}>
    <div className={styles.heading}><h3>{row ? value(row.term) : <Skeleton width={180} height={26} />}</h3><span className={styles.badge}>{row ? value(LABELS[row.opportunity]) : <Skeleton width={104} height={21} />}</span></div>
    <dl className={styles.metrics}>{[['Buscas', row?.searches], ['Sem resultado', row?.empty], ['Saídas', row?.exits]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{row ? (loading ? <span data-skeleton-block className={styles.ghost}>{Number(value).toLocaleString('pt-BR')}</span> : Number(value).toLocaleString('pt-BR')) : <Skeleton width={55} height={29} />}</dd></div>)}</dl>
    <p className={styles.policy}>{row ? value(`${row.exitRate.toLocaleString('pt-BR')}% das buscas com resultado geraram uma saída.`) : <Skeleton height={21} />}</p>
  </article>
}
export function SearchOpportunitiesPanel() {
  const [report, setReport] = useState<SearchOpportunityReport | null>(null)
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [networkId, setNetworkId] = useState(''), [nicheId, setNicheId] = useState('')
  const [opportunity, setOpportunity] = useState('')
  const [applied, setApplied] = useState(''), [page, setPage] = useState(1), [revision, setRevision] = useState(0)
  const [errorMessage, setErrorMessage] = useState('Não foi possível carregar.')
  const [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [denied, setDenied] = useState(false)
  const sequence = useRef(0), filterRegion = useRef<HTMLElement>(null), lastApplied = useRef('')
  useEffect(() => {
    const params = new URLSearchParams(); if (from) params.set('from',from); if(to) params.set('to',to); if(opportunity) params.set('opportunity',opportunity); if(networkId) params.set('networkId',networkId); if(nicheId) params.set('nicheId',nicheId)
    const query = params.toString(); if (query === lastApplied.current) return
    const timer = setTimeout(() => { if (!filterRegion.current?.querySelector('form')?.checkValidity()) return; lastApplied.current = query; setApplied(query); setPage(1) },450)
    return () => clearTimeout(timer)
  },[from,to,opportunity,networkId,nicheId])
  useEffect(() => {
    const current = ++sequence.current
    setLoading(true); setFailed(false); setDenied(false); setErrorMessage('Não foi possível carregar.')
    const params = new URLSearchParams(applied); params.set('page', String(page))
    void api<SearchOpportunityReport & { message?: string }>(`/v1/admin/search-opportunities?${params}`).then(response => {
      if (current !== sequence.current) return
      if (response.status === 401 || response.status === 403) { setDenied(true); return }
      if (response.status !== 200) { if (response.status === 400) setErrorMessage(response.body.message ?? 'Confira os filtros.'); setFailed(true); return }
      setReport(response.body)
    }).catch(() => { if (current === sequence.current) setFailed(true) }).finally(() => { if (current === sequence.current) setLoading(false) })
    return () => { sequence.current++ }
  }, [applied, page, revision])
  function apply() {
    const params = new URLSearchParams()
    if (opportunity) params.set('opportunity', opportunity)
    if (from) params.set('from', from); if (to) params.set('to', to); if (networkId) params.set('networkId', networkId); if (nicheId) params.set('nicheId', nicheId)
    setApplied(params.toString()); setPage(1); setRevision(value => value + 1)
  }
  return <section ref={filterRegion} className={styles.panel} aria-label="Oportunidades de busca" aria-busy={loading}>
    <WorkspaceActions label="Ações das oportunidades"><Button variant="secondary" aria-label="Atualizar oportunidades" onClick={() => setRevision(value => value + 1)}><ActionIcon name="refresh" /></Button></WorkspaceActions>
    <WorkspaceFilters id="search-opportunity-filters" label="Filtrar oportunidades" onSubmit={event => { event.preventDefault(); apply() }}>
      <Field label="De"><Input type="date" value={from} onChange={event => setFrom(event.target.value)} /></Field>
      <Field label="Até"><Input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} /></Field>
      <Field label="Oportunidade"><Select value={opportunity} onChange={event => setOpportunity(event.target.value)}><option value="">Todas</option><option value="NO_RESULTS">Sem oferta</option><option value="LOW_INTERACTION">Pouca interação</option></Select></Field>
      <Field label="Rede nos resultados"><Select value={networkId} onChange={event => setNetworkId(event.target.value)}><option value="">Todas</option>{report?.networks.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field>
      <Field label="Nicho nos resultados"><Select value={nicheId} onChange={event => setNicheId(event.target.value)}><option value="">Todos</option>{report?.niches.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field>
    </WorkspaceFilters>
    {!denied && !failed ? report ? <SearchPolicy report={report} /> : loading ? <SkeletonRegion label="Carregando política da busca"><SearchPolicy /></SkeletonRegion> : null : null}
    {loading && !report ? <SkeletonRegion label="Carregando oportunidades"><div className={styles.list}>{Array.from({ length: 3 }, (_, index) => <SearchCard key={index} />)}</div></SkeletonRegion>
      : denied ? <EmptyState>Você precisa de uma conta administradora ativa para acessar.</EmptyState>
      : failed ? <ErrorState message={errorMessage} onRetry={() => setRevision(value => value + 1)} />
      : report ? <div className={styles.list} data-search-report inert={loading}>
        <MetricCards items={[{label:'Termos encontrados',value:report.total.toLocaleString('pt-BR'),primary:true},{label:'Termos nesta página',value:report.items.length}]}/>
        {report.items.length ? <ReportView title="Oportunidades nesta página" rows={report.items} rowKey={row=>row.term} pageSize={25} columns={[{label:'Termo',render:row=>row.term},{label:'Oportunidade',render:row=>LABELS[row.opportunity]},{label:'Buscas',render:row=>row.searches.toLocaleString('pt-BR'),numeric:true},{label:'Sem resultado',render:row=>row.empty.toLocaleString('pt-BR'),numeric:true},{label:'Saídas',render:row=>row.exits.toLocaleString('pt-BR'),numeric:true},{label:'Taxa de saída',render:row=>row.exitRate.toLocaleString('pt-BR')+'%',numeric:true}]} chart={<MetricChart kind="ranking" label="Buscas por termo nesta página" rows={report.items.map(row=>({label:row.term,value:row.searches}))}/>}/> : <EmptyState>Sem buscas suficientes neste período e filtros.</EmptyState>}
      </div> : null}
    {report && !denied && !failed ? <>
        <details className={styles.coverage}><summary>Como interpretar</summary><p className={styles.policy}>Pouca interação: até 10% das buscas com resultado geraram saída. Rede e nicho filtram os links exibidos; buscas vazias aparecem somente sem esses filtros. Falhas e restrições de idade ficam fora das oportunidades.</p><ul>{report.coverage.map(row => <li key={row.outcome}>{({ SUCCESS: 'Buscas concluídas', FAILED: 'Falhas técnicas', GATED: 'Restrição de idade' } as Record<string, string>)[row.outcome]}: {row.count === null ? 'amostra insuficiente' : row.count.toLocaleString('pt-BR')}</li>)}</ul></details>
        {page > 1 || report.total > 25 ? <WorkspaceActions><Button variant="secondary" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}><ActionIcon name="back" />Anterior</Button><span aria-live="polite">Página {page}</span><Button disabled={loading || page * 25 >= report.total} onClick={() => setPage(value => value + 1)}>Próxima<ActionIcon name="next" /></Button></WorkspaceActions> : null}
    </> : null}
  </section>
}
