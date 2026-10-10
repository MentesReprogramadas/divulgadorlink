'use client'

import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { api } from '@/lib/api'
import { InsightTabs, panelProps } from './insight-tabs'

type Traffic = {
  windowDays: number
  from: string
  views: number
  entries: number
  daily: Array<{ day: string; views: number; entries: number }>
  paths: Array<{ path: string; views: number; entries: number }>
  campaigns: Array<{ source: string; medium: string; campaign: string; entries: number }>
  consent: { marketing: number; denied: number }
  funnel: Array<{ name: string; count: number }>
  consentedRegistrations: Array<{ source: string; medium: string; campaign: string; registrations: number }>
}

type Tab = 'visao' | 'funil' | 'paginas' | 'campanhas'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'visao', label: 'Visão' },
  { id: 'funil', label: 'Funil' },
  { id: 'paginas', label: 'Páginas' },
  { id: 'campanhas', label: 'Campanhas' },
]

const FUNNEL_LABEL: Record<string, string> = {
  CompleteRegistration: 'Cadastros',
  StartLinkSubmission: 'Abriram o envio',
  SubmitLink: 'Enviaram link',
  LinkPublished: 'Publicados',
}

function count(value: number): string {
  return value.toLocaleString('pt-BR')
}

export function share(part: number, whole: number): string {
  if (whole <= 0) return '—'
  return `${((part / whole) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

function showDay(iso: string): string {
  const [, month, day] = iso.split('-')
  return month && day ? `${day}/${month}` : iso
}

export function TrafficPanel() {
  const [view, setView] = useState<Traffic | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<Tab>('visao')

  async function load() {
    setFailed(false)
    const response = await api<Traffic>('/v1/admin/traffic?days=30')
    if (response.status !== 200) {
      setFailed(true)
      return
    }
    setView(response.body)
  }

  useEffect(() => {
    void load()
  }, [])

  if (failed) return <ErrorState onRetry={() => load()} />
  if (!view) return <p>Carregando…</p>

  const decided = view.consent.marketing + view.consent.denied
  const peak = Math.max(1, ...view.daily.map((row) => row.entries))
  const funnelPeak = Math.max(1, view.entries, ...view.funnel.map((row) => row.count))

  return (
    <section aria-label="Tráfego interno">
      <p className="office-note">
        Contagem própria, sem IP e sem identificador, inclusive de quem recusou cookies. Últimos {view.windowDays} dias.
        A Meta só vê quem aceitou: {share(view.consent.marketing, decided)} das escolhas.
      </p>
      <InsightTabs name="trafego" label="Tráfego" tabs={TABS} current={tab} onChange={setTab} />

      {tab === 'visao' ? (
        <div {...panelProps('trafego', 'visao')}>
          <dl className="insight-metrics">
            <div><dt>Entradas</dt><dd>{count(view.entries)}</dd></div>
            <div><dt>Páginas vistas</dt><dd>{count(view.views)}</dd></div>
            <div><dt>Aceitaram cookies</dt><dd>{count(view.consent.marketing)} · {share(view.consent.marketing, decided)}</dd></div>
            <div><dt>Recusaram cookies</dt><dd>{count(view.consent.denied)}</dd></div>
          </dl>
          <h2>Entradas por dia</h2>
          {view.daily.length === 0 ? <p>Nenhuma visita no período.</p> : (
            <ul className="traffic-bars insight-bars">
              {view.daily.map((row) => (
                <li key={row.day}>
                  <span>{showDay(row.day)}</span>
                  <span className="traffic-bar" style={{ width: `${(row.entries / peak) * 100}%` }} />
                  <span>{count(row.entries)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === 'funil' ? (
        <div {...panelProps('trafego', 'funil')}>
          <p className="office-note">Cada etapa em relação às entradas do período. A ordem não prova que a mesma pessoa passou por todas.</p>
          <ul className="traffic-bars insight-bars">
            {view.funnel.map((row) => (
              <li key={row.name}>
                <span>{FUNNEL_LABEL[row.name] ?? row.name}</span>
                <span className="traffic-bar" style={{ width: `${(row.count / funnelPeak) * 100}%` }} />
                <span>{count(row.count)} · {share(row.count, view.entries)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'paginas' ? (
        <div {...panelProps('trafego', 'paginas')}>
          {view.paths.length === 0 ? <p>Nenhuma página vista.</p> : (
            <ul className="insight-rows">
              {view.paths.map((row) => (
                <li key={row.path}>
                  <strong>{row.path}</strong>
                  <span>{count(row.views)} vistas · {count(row.entries)} entradas</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === 'campanhas' ? (
        <div {...panelProps('trafego', 'campanhas')}>
          <p className="office-note">Entradas contam todo mundo que chegou com UTM. Cadastro por campanha só existe para quem aceitou cookies.</p>
          {view.campaigns.length === 0 ? <p>Nenhuma entrada com UTM.</p> : (
            <ul className="insight-rows">
              {view.campaigns.map((row) => {
                const registered = view.consentedRegistrations.find((item) => item.source === row.source
                  && item.medium === row.medium && item.campaign === row.campaign)?.registrations ?? 0
                return (
                  <li key={`${row.source}|${row.medium}|${row.campaign}`}>
                    <strong>{row.campaign}</strong>
                    <span>{row.source || '—'} / {row.medium || '—'}</span>
                    <span>{count(row.entries)} entradas · {count(registered)} cadastros com aceite</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
