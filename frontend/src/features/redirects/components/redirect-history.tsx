'use client'
import { MetricChart } from '@/components/ui/metric-chart'
import { ReportView, ReportTable } from '@/components/ui/report-view'
import { MetricCards } from '@/components/ui/metric-cards'
import type { DestinationRevision } from '../redirect-contract'
import { Badge } from '@/components/ui/badge'
import { revisionStatus } from '../redirect-contract'
import styles from './redirects.module.css'
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
export function RedirectHistory({ revisions, activeId }: { revisions: DestinationRevision[]; activeId: string | null }) {
  const days = new Map<string, number>()
  for (const revision of revisions) for (const row of revision.accesses) days.set(row.day, (days.get(row.day) ?? 0) + row.accesses)
  const daily = [...days].sort(([a],[b])=>a.localeCompare(b)).map(([day,accesses])=>({day,accesses}))
  return <section aria-label="Histórico de destinos" className={styles.section}><h3>Histórico de destinos</h3><MetricCards items={[{label:"Acessos no período",value:daily.reduce((sum,row)=>sum+row.accesses,0).toLocaleString("pt-BR"),primary:true},{label:"Versões do destino",value:revisions.length}]}/><ReportView title="Acessos por dia" rows={daily} rowKey={row=>row.day} columns={[{label:"Dia",render:row=>row.day.slice(0,10).split("-").reverse().join("/")},{label:"Acessos",render:row=>row.accesses.toLocaleString("pt-BR"),numeric:true}]} chart={<MetricChart kind="timeline" label="Acessos dos convites por dia" rows={daily.map(row=>({label:row.day,value:row.accesses}))}/>}/>
    <details className={styles.historyDetails}><summary>Sobre o histórico e a contagem</summary><p>Até 50 versões por 180 dias. O destino atualmente publicado é preservado.</p><p>Acessos redirecionados incluem repetições. Acessos do dono e de administradores não entram na contagem.</p></details>
    <ol className={styles.history}>{revisions.map(row => <li key={row.id}>
      <div className={styles.historyHeader}><div className={styles.historyTitle}><strong>{row.label}</strong><div className={styles.historyMeta}><span>Versão {row.number}</span><Badge tone={row.id === activeId ? 'ok' : row.status === 'BLOCKED' || row.status === 'FAILED' ? 'warn' : 'neutral'}>{row.id === activeId ? 'Destino atual' : revisionStatus[row.status]}</Badge></div></div><dl className={styles.metrics}><div><dt>Acessos no período</dt><dd>{row.accesses.reduce((sum, day) => sum + day.accesses, 0)}</dd></div></dl></div>
      <p className={styles.url}>{row.destinationUrl}</p><time className={styles.note} dateTime={row.createdAt}>{date(row.createdAt)}</time>{row.errorMessage ? <p className={styles.error}>{row.errorMessage}</p> : null}
      {row.accesses.length ? <details className={styles.historyDetails}><summary>Acessos por dia · versão {row.number}</summary><ReportTable label={`Acessos da versão ${row.number}`} rows={row.accesses} rowKey={day=>day.day} columns={[{label:"Dia",render:day=>day.day.slice(0,10)},{label:"Acessos",render:day=>day.accesses,numeric:true}]}/></details> : null}
    </li>)}</ol>
  </section>
}
