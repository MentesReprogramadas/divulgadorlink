'use client'

import { useEffect, useRef, useState } from 'react'
import { InsightSkeleton } from '@/features/administration/components/insight-skeleton'
import { ErrorState } from '@/components/feedback/error-state'
import { MetricCards } from '@/components/ui/metric-cards'
import { MetricChart } from '@/components/ui/metric-chart'
import { ReportView } from '@/components/ui/report-view'
import { Field, Select } from '@/components/ui/input'
import { api } from '@/lib/api'
import { InsightTabs, panelProps } from './insight-tabs'
import styles from '@/components/layout/workspace-dashboard.module.css'

type Traffic = { windowDays: number; from: string; views: number; entries: number; daily: Array<{ day: string; views: number; entries: number }>; paths: Array<{ path: string; views: number; entries: number }>; campaigns: Array<{ source: string; medium: string; campaign: string; entries: number }>; consent: { marketing: number; denied: number }; funnel: Array<{ name: string; count: number }>; consentedRegistrations: Array<{ source: string; medium: string; campaign: string; registrations: number }> }
type Tab = 'visao' | 'funil' | 'paginas' | 'campanhas'
const TABS: Array<{ id: Tab; label: string }> = [{ id: 'visao', label: 'Visão' }, { id: 'funil', label: 'Funil' }, { id: 'paginas', label: 'Páginas' }, { id: 'campanhas', label: 'Campanhas' }]
const FUNNEL_LABEL: Record<string, string> = { CompleteRegistration: 'Cadastros', StartLinkSubmission: 'Abriram o envio', SubmitLink: 'Enviaram link', LinkPublished: 'Publicados' }
const count = (value: number) => value.toLocaleString('pt-BR')
export function share(part: number, whole: number): string { return whole <= 0 ? '—' : `${((part / whole) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` }
export function TrafficPanel() {
  const [view, setView] = useState<Traffic | null>(null), [failed, setFailed] = useState(false), [tab, setTab] = useState<Tab>('visao'), [days, setDays] = useState('30')
  const [revision, setRevision] = useState(0)
  const sequence = useRef(0)
  useEffect(() => {
    const current = ++sequence.current
    setFailed(false)
    void api<Traffic>('/v1/admin/traffic?days=' + days).then(response => { if (current !== sequence.current) return; if (response.status === 200) setView(response.body); else { setView(null); setFailed(true) } }).catch(() => { if (current === sequence.current) { setView(null); setFailed(true) } })
    return () => { sequence.current++ }
  }, [days, revision])
  if (failed) return <ErrorState onRetry={() => setRevision(value => value + 1)} />
  if (!view) return <InsightSkeleton kind="traffic" />
  const decided = view.consent.marketing + view.consent.denied
  const campaigns = view.campaigns.map(row => ({ ...row, registrations: view.consentedRegistrations.find(item => item.source === row.source && item.medium === row.medium && item.campaign === row.campaign)?.registrations ?? 0 }))
  return <section aria-label="Tráfego interno" className={styles.dashboard}>
    <div className={styles.areaSwitch}><Field label="Período do tráfego"><Select value={days} onChange={event => setDays(event.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></Select></Field></div>
    <MetricCards items={[{ label: 'Entradas', value: count(view.entries), primary: true }, { label: 'Páginas vistas', value: count(view.views), primary: true }, { label: 'Aceitaram cookies', value: count(view.consent.marketing), note: share(view.consent.marketing, decided) + ' das escolhas' }, { label: 'Recusaram cookies', value: count(view.consent.denied) }]} />
    <InsightTabs name="trafego" label="Tráfego" tabs={TABS} current={tab} onChange={setTab} />
    {tab === 'visao' ? <div {...panelProps('trafego', 'visao')} className={styles.dashboard}><ReportView title="Entradas por dia" rows={view.daily} rowKey={row => row.day} columns={[{ label: 'Dia', render: row => row.day.split('-').reverse().join('/') }, { label: 'Entradas', render: row => count(row.entries), numeric: true }, { label: 'Páginas vistas', render: row => count(row.views), numeric: true }]} chart={<MetricChart kind="timeline" label="Entradas por dia" rows={view.daily.map(row => ({ label: row.day, value: row.entries }))}/>} />
      <ReportView title="Páginas vistas por dia" rows={view.daily} rowKey={row => row.day} columns={[{ label: 'Dia', render: row => row.day.split('-').reverse().join('/') }, { label: 'Páginas vistas', render: row => count(row.views), numeric: true }]} chart={<MetricChart kind="timeline" label="Páginas vistas por dia" rows={view.daily.map(row => ({ label: row.day, value: row.views }))}/>} /></div> : null}
    {tab === 'funil' ? <div {...panelProps('trafego', 'funil')}><ReportView title="Etapas do funil" rows={view.funnel} rowKey={row => row.name} columns={[{ label: 'Etapa', render: row => FUNNEL_LABEL[row.name] ?? row.name }, { label: 'Eventos', render: row => count(row.count), numeric: true }, { label: 'Em relação às entradas', render: row => share(row.count, view.entries), numeric: true }]} chart={<MetricChart kind="ranking" label="Etapas do funil" rows={view.funnel.map(row => ({ label: FUNNEL_LABEL[row.name] ?? row.name, value: row.count }))}/>}><p className={styles.result}>Cada etapa em relação às entradas do período. A ordem não prova que a mesma pessoa passou por todas.</p></ReportView></div> : null}
    {tab === 'paginas' ? <div {...panelProps('trafego', 'paginas')}><ReportView title="Páginas mais vistas" rows={view.paths} rowKey={row => row.path} columns={[{ label: 'Página', render: row => row.path }, { label: 'Vistas', render: row => count(row.views), numeric: true }, { label: 'Entradas', render: row => count(row.entries), numeric: true }]} chart={<MetricChart kind="ranking" label="Páginas mais vistas" rows={view.paths.map(row => ({ label: row.path, value: row.views }))}/>} /></div> : null}
    {tab === 'campanhas' ? <div {...panelProps('trafego', 'campanhas')}><ReportView title="Entradas por campanha" rows={campaigns} rowKey={row => JSON.stringify([row.source, row.medium, row.campaign])} columns={[{ label: 'Campanha', render: row => row.campaign }, { label: 'Origem / mídia', render: row => `${row.source || '—'} / ${row.medium || '—'}` }, { label: 'Entradas', render: row => count(row.entries), numeric: true }, { label: 'Cadastros com aceite', render: row => count(row.registrations), numeric: true }]} chart={<MetricChart kind="ranking" label="Entradas por campanha" rows={campaigns.map(row => ({ label: row.campaign, value: row.entries }))}/>}><p className={styles.result}>Entradas contam todo mundo que chegou com UTM. Cadastro por campanha só existe para quem aceitou cookies.</p></ReportView></div> : null}
    <details><summary>Sobre a contagem e o consentimento</summary><p className={styles.result}>Contagem própria, sem IP e sem identificador, inclusive de quem recusou cookies. Últimos {view.windowDays} dias. A Meta só vê quem aceitou: {share(view.consent.marketing, decided)} das escolhas.</p></details>
  </section>
}
