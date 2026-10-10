'use client'

import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { api } from '@/lib/api'

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

  return (
    <section aria-label="Tráfego interno">
      <p className="office-note">
        Contagem própria, sem IP e sem identificador, inclusive de quem recusou cookies. Últimos {view.windowDays} dias.
        A Meta só vê quem aceitou: {share(view.consent.marketing, decided)} das escolhas.
      </p>
      <div className="office-metrics">
        <p className="metric"><span className="metric-value">{count(view.entries)}</span><span className="metric-label">entradas · {count(view.views)} páginas vistas</span></p>
        <p className="metric"><span className="metric-value">{share(view.consent.marketing, decided)}</span><span className="metric-label">aceite · {count(view.consent.marketing)} aceitaram · {count(view.consent.denied)} recusaram</span></p>
        {view.funnel.map((row) => (
          <p key={row.name} className="metric">
            <span className="metric-value">{count(row.count)}</span>
            <span className="metric-label">{FUNNEL_LABEL[row.name] ?? row.name} · {share(row.count, view.entries)} das entradas</span>
          </p>
        ))}
      </div>

      <h2>Entradas por dia</h2>
      {view.daily.length === 0 ? <p>Nenhuma visita no período.</p> : (
        <ul className="traffic-bars">
          {view.daily.map((row) => (
            <li key={row.day}>
              <span>{showDay(row.day)}</span>
              <span className="traffic-bar" style={{ width: `${(row.entries / peak) * 100}%` }} />
              <span>{count(row.entries)}</span>
            </li>
          ))}
        </ul>
      )}

      <h2>Páginas</h2>
      {view.paths.length === 0 ? <p>Nenhuma página vista.</p> : (
        <div className="refund-grid">
          {view.paths.map((row) => (
            <article key={row.path} className="summary-card">
              <h2>{row.path}</h2>
              <p>{count(row.views)} vistas · {count(row.entries)} entradas</p>
            </article>
          ))}
        </div>
      )}

      <h2>Campanhas</h2>
      <p className="office-note">Entradas contam todo mundo que chegou com UTM. Cadastro por campanha só existe para quem aceitou cookies.</p>
      {view.campaigns.length === 0 ? <p>Nenhuma entrada com UTM.</p> : (
        <div className="refund-grid">
          {view.campaigns.map((row) => {
            const registered = view.consentedRegistrations.find((item) => item.source === row.source
              && item.medium === row.medium && item.campaign === row.campaign)?.registrations ?? 0
            return (
              <article key={`${row.source}|${row.medium}|${row.campaign}`} className="summary-card">
                <h2>{row.campaign}</h2>
                <p>{row.source || '—'} / {row.medium || '—'}</p>
                <p>{count(row.entries)} entradas · {count(registered)} cadastros com aceite</p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
