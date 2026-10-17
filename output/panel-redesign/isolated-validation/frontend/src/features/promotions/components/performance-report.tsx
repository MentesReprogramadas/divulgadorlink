import { ActionIcon } from '@/components/ui/action-icon'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { formatRate } from '@/domain/format'
import { formatCents } from '@/domain/money'
import type { PerformanceFilters, PerformanceReport as Report } from '../performance-contract'
import styles from './performance-report.module.css'

const surfaces: Record<string, string> = { HOME: 'Início', SEARCH: 'Busca', NICHE: 'Categoria', ORGANIC: 'Orgânico', RELATED: 'Relacionados' }
function day(value: string) { return value.split('-').reverse().join('/') }
function number(value: number) { return value.toLocaleString('pt-BR') }
function money(value: number | null) { return value === null ? 'Indisponível' : formatCents(value) }

export function PerformanceFiltersForm({ report, filters }: { report?: Report; filters: PerformanceFilters }) {
  return <><WorkspaceActions><Button type="submit" form="performance-filters"><ActionIcon name="filter" />Aplicar período</Button></WorkspaceActions><WorkspaceFilters id="performance-filters" method="get" label="Filtrar relatório">
    <Field label="De"><Input type="date" name="from" defaultValue={filters.from ?? report?.from} /></Field>
    <Field label="Até"><Input type="date" name="to" defaultValue={filters.to ?? report?.to} /></Field>
    <Field label="Campanha"><Select name="promotionId" defaultValue={filters.promotionId ?? ''}>
      <option value="">Todas as campanhas</option>
      {report?.campaigns.map((item) => <option key={item.id} value={item.id}>{surfaces[item.surface] ?? item.surface} · {day(item.activatedAt.slice(0, 10))}{item.administrative ? ' · administrativo' : ''}</option>)}
    </Select></Field>
  </WorkspaceFilters></>
}

export function PerformanceReport({ report, filters }: { report: Report; filters: PerformanceFilters }) {
  const { totals, comparison, coverage } = report
  const metrics = [
    { label: 'Impressões', value: number(totals.impressions), before: number(comparison.totals.impressions) },
    { label: 'Cliques', value: number(totals.clicks), before: number(comparison.totals.clicks) },
    { label: 'Taxa de cliques', value: formatRate(totals.ctr), before: formatRate(comparison.totals.ctr) },
    { label: 'Investimento no período', value: money(totals.investmentCents) },
    { label: 'Custo por clique em destaque', value: money(totals.cpcCents) },
  ]
  return <div className={styles.report}>
    <header><p className={styles.eyebrow}>Resultado do destaque</p><h2>{report.link.name}</h2><p>{day(report.from)} a {day(report.to)} · {report.days} dias</p></header>
    <PerformanceFiltersForm report={report} filters={filters} />
    <p className={styles.note}>Comparação: {day(comparison.from)} a {day(comparison.to)}, com a mesma duração{coverage.currentDayPartial ? ' e o mesmo tempo decorrido do dia atual' : ''}.</p>
    {coverage.status !== 'COMPLETE' ? <p role="status" className={styles.warning}>Dados {coverage.status === 'UNAVAILABLE' ? 'fora do prazo de retenção' : 'parcialmente disponíveis'}. Cobertura a partir de {day(coverage.availableFrom)}. Ausência de histórico não significa zero.</p> : null}
    {report.dataState === 'NO_EVENTS' ? <p role="status" className={styles.note}>Nenhum evento registrado neste período.</p> : null}
    {coverage.currentDayPartial ? <p className={styles.note}>O dia de hoje ainda está em andamento.</p> : null}
    <dl className={styles.metrics} aria-label="Resumo do período">{metrics.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{coverage.status === 'UNAVAILABLE' && item.before !== undefined ? 'Indisponível' : item.value}</dd>{item.before !== undefined ? <p>Anterior: {comparison.coverage === 'UNAVAILABLE' ? 'indisponível' : item.before}</p> : null}</div>)}</dl>
    <p className={styles.note}>{totals.cpcCents === null ? 'CPC indisponível: é necessário ter cliques durante o destaque, investimento vinculado e cobertura completa. ' : ''}{coverage.investment === 'UNLINKED_HISTORY' ? 'Há campanhas antigas sem pagamento vinculado. ' : ''}Investimento rateado por superfície e tempo. Cliques observados durante o destaque não comprovam entradas, vendas ou efeito causado pela promoção.</p>
    <section className={styles.section} aria-labelledby="performance-surfaces"><h3 id="performance-surfaces">Onde seu link apareceu</h3><div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Resultados por superfície"><table><caption className={styles.caption}>Mesmo link e período selecionados</caption><thead><tr><th scope="col">Superfície</th><th scope="col">Impressões</th><th scope="col">Cliques</th><th scope="col">CTR</th></tr></thead><tbody>{report.surfaces.map(row => <tr key={row.surface}><th scope="row">{surfaces[row.surface] ?? row.surface}</th><td>{number(row.impressions)}</td><td>{number(row.clicks)}</td><td>{formatRate(row.ctr)}</td></tr>)}</tbody></table></div></section>
    <section className={styles.section} aria-labelledby="performance-daily"><h3 id="performance-daily">Cliques por dia</h3><div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Resultados diários"><table><caption className={styles.caption}>Cliques observados por dia</caption><thead><tr><th scope="col">Dia</th><th scope="col">Cliques</th><th scope="col">Impressões</th><th scope="col">Destaque</th></tr></thead><tbody>{report.daily.map(row => <tr key={row.day}><th scope="row">{day(row.day)}</th><td>{row.available ? number(row.clicks) : 'Indisponível'}</td><td>{row.available ? number(row.impressions) : 'Indisponível'}</td><td>{row.highlighted ? 'Ativo no dia' : 'Sem destaque'}</td></tr>)}</tbody></table></div></section>
    <p className={styles.note}>Fuso: São Paulo. Eventos deduplicados por sessão, link, superfície, dia e tipo.</p>
  </div>
}
