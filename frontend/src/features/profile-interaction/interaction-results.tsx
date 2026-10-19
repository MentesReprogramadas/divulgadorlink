'use client'

import { MetricCards } from '@/components/ui/metric-cards'
import { MetricChart } from '@/components/ui/metric-chart'
import { ReportView } from '@/components/ui/report-view'
import type { InteractionReport } from './interaction-contract'
import styles from './interaction.module.css'
const count = (value: number | null) => value === null ? 'Indisponível' : value.toLocaleString('pt-BR')
export function InteractionResults({ report }: { report: InteractionReport }) {
  return <div className={styles.results}>
    <MetricCards items={[{label:'Visitas medidas',value:count(report.summary.pageViews),primary:true},{label:'Sessões diárias',value:count(report.summary.available?report.summary.sessions:null),primary:true}]}/>
    {report.summary.available ? <ReportView title="Até onde a página foi vista" rows={report.summary.scrollBuckets} rowKey={row=>String(row.threshold)} columns={[{label:'Trecho',render:row=>row.label},{label:'Sessões',render:row=>count(row.reached),numeric:true}]} chart={<MetricChart kind="ranking" label="Alcance da rolagem" rows={report.summary.scrollBuckets.map(row=>({label:row.threshold+'%',value:row.reached}))}/>}><p className={styles.hint}>Alcance da tela não comprova leitura.</p></ReportView> : <p className={styles.hint}>Indisponível</p>}
    {report.summary.available ? <ReportView title="Interação dos links" rows={report.summary.blocks} rowKey={row=>row.id} columns={[{label:'Link',render:row=>row.label},{label:'Visualizações',render:row=>count(row.impressions),numeric:true},{label:'Cliques',render:row=>count(row.clicks),numeric:true},{label:'Taxa de cliques',render:row=>row.ctr===null?'Indisponível':count(row.ctr)+'%',numeric:true}]} chart={<MetricChart kind="ranking" label="Cliques por link da página" rows={report.summary.blocks.map(row=>({label:row.label,value:row.clicks}))}/>}/> : null}
  </div>
}
