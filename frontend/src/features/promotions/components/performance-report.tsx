'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { PerformanceDetails } from './performance-details'
import { PerformanceFiltersForm } from './performance-filters-form'
import { ActionIcon } from '@/components/ui/action-icon'
import { Button } from '@/components/ui/button'
import { formatRate } from '@/domain/format'
import { formatCents } from '@/domain/money'
import type { PerformanceFilters, PerformanceReport as Report } from '../performance-contract'
import styles from './performance-report.module.css'

export { PerformanceFiltersForm } from './performance-filters-form'
function day(value: string) { return value.split('-').reverse().join('/') }
function number(value: number) { return value.toLocaleString('pt-BR') }

export function PerformanceReport({ report, filters, onRefresh, refreshing, onFiltersChange }: { report: Report; filters: PerformanceFilters; onRefresh?: () => void; refreshing?: boolean; onFiltersChange?: (filters: PerformanceFilters) => void }) {
  const [view, setView] = useState('charts')
  const { totals, comparison, coverage } = report
  const hasEvents = report.dataState === 'RECORDED'
  const metrics = [
    ...(hasEvents && coverage.status !== 'UNAVAILABLE' ? [
      { label: 'Impressões', value: number(totals.impressions), before: number(comparison.totals.impressions), primary: true },
      { label: 'Cliques', value: number(totals.clicks), before: number(comparison.totals.clicks), primary: true },
      { label: 'Taxa de cliques', value: formatRate(totals.ctr), before: formatRate(comparison.totals.ctr), primary: true },
    ] : []),
    ...(totals.investmentCents !== null && totals.investmentCents > 0 ? [{ label: 'Investimento no período', value: formatCents(totals.investmentCents), primary: false, note: 'Rateado no período' }] : []),
    ...(totals.cpcCents !== null ? [{ label: 'Custo por clique em destaque', value: formatCents(totals.cpcCents), primary: false, note: 'Durante o destaque' }] : []),
  ]
  return <div className={styles.report} aria-busy={refreshing || undefined}>
    <header className={styles.header}><div><h2>{report.link.name}</h2><p className={styles.note}>{day(report.from)} a {day(report.to)} <span className={styles.badge}>{report.days} dias</span></p></div>{onRefresh ? <Button variant="secondary" disabled={refreshing} onClick={onRefresh}><ActionIcon name="refresh" />Atualizar relatório</Button> : null}</header>
    <PerformanceFiltersForm report={report} filters={filters} onFiltersChange={onFiltersChange} />
    {coverage.status !== 'COMPLETE' ? <p role="status" className={styles.warning}>Dados {coverage.status === 'UNAVAILABLE' ? 'fora do prazo de retenção' : 'parcialmente disponíveis'}. Cobertura a partir de {day(coverage.availableFrom)}. Ausência de histórico não significa zero.</p> : null}
    {metrics.length ? <section className={styles.section} aria-labelledby="performance-summary"><h3 id="performance-summary">Visão geral</h3><dl className={styles.metrics} aria-label="Resumo do período">{metrics.map(item => <div key={item.label} data-primary={item.primary}><dt>{item.label}</dt><dd>{item.value}{'before' in item && comparison.coverage !== 'UNAVAILABLE' && report.dataState === 'RECORDED' ? <p>Anterior: {item.before}</p> : 'note' in item ? <p>{item.note}</p> : null}</dd></div>)}</dl></section> : null}
    {coverage.investment === 'UNLINKED_HISTORY' ? <p className={styles.warning}>Há campanhas antigas sem pagamento vinculado.</p> : null}
    {hasEvents ? <section className={styles.detailCard} aria-labelledby="performance-detail"><h3 id="performance-detail">Detalhamento dos resultados</h3><Tabs value={view} onChange={setView} label="Visualização dos resultados" items={[
      { id: 'charts', label: 'Gráficos', content: <PerformanceDetails report={report} view="charts" /> },
      { id: 'table', label: 'Tabela', content: <PerformanceDetails key={`${report.from}-${report.to}-${report.promotionId}`} report={report} view="table" /> },
    ]} /></section> : null}
    {hasEvents || metrics.length ? <details className={styles.method}><summary>Como os resultados são calculados</summary><p className={styles.note}>Investimento rateado por superfície e tempo. Cliques observados durante o destaque não comprovam entradas, vendas ou efeito causado pela promoção.</p><p className={styles.note}>Fuso: São Paulo. Eventos deduplicados por sessão, link, superfície, dia e tipo.</p></details> : null}
  </div>
}
