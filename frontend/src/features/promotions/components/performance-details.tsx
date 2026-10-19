'use client'

import { useId, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { formatRate } from '@/domain/format'
import type { PerformanceReport } from '../performance-contract'
import styles from './performance-report.module.css'

const PerformanceCharts = dynamic(() => import('./performance-charts').then(module => module.PerformanceCharts), { ssr: false, loading: () => <div className={styles.timeline} aria-busy="true" aria-label="Carregando gráficos" /> })
const surfaces: Record<string, string> = { HOME: 'Início', SEARCH: 'Busca', NICHE: 'Categoria', ORGANIC: 'Orgânico', RELATED: 'Relacionados' }
const PAGE_SIZE = 7
function day(value: string) { return value.split('-').reverse().join('/') }
function number(value: number) { return value.toLocaleString('pt-BR') }

export function PerformanceDetails({ report, view }: { report: PerformanceReport; view: 'table' | 'charts' }) {
  const [page, setPage] = useState(1)
  const id = useId()
  const pages = Math.max(1, Math.ceil(report.daily.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = report.daily.slice(start, start + PAGE_SIZE)
  const breakdown = report.surfaces.filter(row => row.impressions || row.clicks)
  if (view === 'charts') return <PerformanceCharts report={report} />
  return <div className={styles.details}>
    {report.daily.length ? <section className={styles.section} aria-labelledby={`${id}-daily`}>
      <div className={styles.sectionHeading}><h4 id={`${id}-daily`}>Resultados por dia</h4><span className={styles.note}>Fuso: São Paulo</span></div>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Resultados diários"><table><caption className={styles.srOnly}>Cliques e impressões observados por dia</caption><thead><tr><th scope="col">Dia</th><th scope="col">Cliques</th><th scope="col">Impressões</th><th scope="col">Destaque</th></tr></thead><tbody>{rows.map(row => <tr key={row.day}><th scope="row">{day(row.day)}</th><td>{row.available ? number(row.clicks) : 'Indisponível'}</td><td>{row.available ? number(row.impressions) : 'Indisponível'}</td><td><span className={row.highlighted ? styles.activeBadge : styles.badge}>{row.highlighted ? 'Ativo no dia' : 'Sem destaque'}</span></td></tr>)}</tbody></table></div>
      <div className={styles.pagination}><p role="status" className={styles.note}>{start + 1}–{Math.min(start + PAGE_SIZE, report.daily.length)} de {report.daily.length} dias · Página {currentPage} de {pages}</p>{pages > 1 ? <nav aria-label="Paginação dos resultados diários"><Button variant="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ActionIcon name="back" />Anterior</Button><Button variant="secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Próxima<ActionIcon name="next" /></Button></nav> : null}</div>
    </section> : null}
    {report.coverage.status !== 'UNAVAILABLE' && breakdown.length ? <section className={styles.section} aria-labelledby={`${id}-surfaces`}><h4 id={`${id}-surfaces`}>Onde seu link apareceu</h4>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Resultados por superfície"><table><caption className={styles.srOnly}>Mesmo link e período selecionados</caption><thead><tr><th scope="col">Superfície</th><th scope="col">Impressões</th><th scope="col">Cliques</th><th scope="col">CTR</th></tr></thead><tbody>{breakdown.map(row => <tr key={row.surface}><th scope="row">{surfaces[row.surface] ?? row.surface}</th><td>{number(row.impressions)}</td><td>{number(row.clicks)}</td><td>{formatRate(row.ctr)}</td></tr>)}</tbody></table></div>
    </section> : null}
  </div>
}
