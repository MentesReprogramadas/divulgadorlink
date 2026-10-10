'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { api } from '@/lib/api'
import { RetentionPanel } from './retention-panel'

type Office = {
  windowDays: number
  listCap: number
  metrics: {
    users: number
    bannedUsers: number
    links: number
    publishedLinks: number
    pendingLinks: number
    impressions: number
    clicks: number
    ctr: number
    paidCents: number
    paidOrders: number
  }
  topLinks: Array<{ id: string; name: string; status: string; impressions: number; clicks: number; ctr: number }>
  topPayers: Array<{ userId: string; name: string; email: string; status: string; paidCents: number; orders: number }>
  users: Array<{ id: string; name: string; email: string; status: string; role: string; links: number }>
  links: Array<{ id: string; name: string; status: string; url: string; ownerName: string; ownerEmail: string }>
}

type Prompt =
  | { kind: 'ban'; id: string; name: string }
  | { kind: 'withdraw'; id: string; name: string }

const LINK_STATUS: Record<string, string> = {
  PENDING_MODERATION: 'Aguardando',
  PRE_REJECTED: 'Pré-rejeitado',
  PUBLISHED: 'Publicado',
  DRAFT: 'Rascunho',
  UNAVAILABLE: 'Fora do ar',
}

const USER_STATUS: Record<string, string> = {
  ACTIVE: 'Ativa',
  BANNED: 'Suspensa',
}

const SECTIONS = [
  { id: 'metricas', label: 'Métricas', gloss: 'Totais do site' },
  { id: 'cliques', label: 'Mais clicados', gloss: 'Últimos 30 dias' },
  { id: 'pagadores', label: 'Pagadores', gloss: 'Quem mais pagou' },
  { id: 'contas', label: 'Contas', gloss: 'Suspender' },
  { id: 'links', label: 'Links', gloss: 'Tirar do ar' },
  { id: 'retencao', label: 'Retenção', gloss: 'Analytics de 12 meses' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

function count(value: number): string {
  return value.toLocaleString('pt-BR')
}

function percent(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

let officeCache: Office | null = null

export function OfficeBoard() {
  const [office, setOffice] = useState<Office | null>(null)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [section, setSection] = useState<SectionId>('metricas')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pendingRef = useRef(false)

  useLayoutEffect(() => {
    if (officeCache) setOffice(officeCache)
  }, [])

  async function load(query: string) {
    setFailed(false)
    const path = query ? `/v1/admin/office?q=${encodeURIComponent(query)}` : '/v1/admin/office'
    const response = await api<Office>(path)
    if (response.status !== 200) {
      setFailed(true)
      return
    }
    setOffice(response.body)
    if (!query) officeCache = response.body
  }

  useEffect(() => {
    const pending = load(q)
    return () => { void pending }
  }, [q])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (prompt && !dialog.open) dialog.showModal()
    if (!prompt && dialog.open) dialog.close()
    const onCancel = (event: Event) => {
      event.preventDefault()
      if (pendingRef.current) return
      setPrompt(null)
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [prompt])

  async function confirm() {
    if (!prompt || pendingRef.current) return
    pendingRef.current = true
    setBusy(true)
    setNotice('')
    const path = prompt.kind === 'ban'
      ? `/v1/admin/users/${prompt.id}/ban`
      : `/v1/admin/links/${prompt.id}/withdraw`
    const body = prompt.kind === 'ban' ? JSON.stringify({ reason: reason.trim() }) : '{}'
    const response = await api<{ message?: string }>(path, { method: 'POST', body })
    pendingRef.current = false
    setBusy(false)
    if (response.status !== 200) {
      setNotice(response.body.message ?? 'Não foi possível concluir.')
      return
    }
    setPrompt(null)
    setReason('')
    setNotice(prompt.kind === 'ban'
      ? 'Conta suspensa. Os links saíram do ar e o destaque foi cancelado. O pagamento não volta.'
      : 'Link fora do ar. A conta continua ativa e o dono não foi avisado.')
    await load(q)
  }

  const gloss = SECTIONS.map((item) => item.id === 'cliques'
    ? { ...item, gloss: `Últimos ${office?.windowDays ?? 30} dias` }
    : item)

  return (
    <div className="desk">
      <nav className="office-glossary" aria-label="Seções">
        {gloss.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? 'true' : undefined}
            onClick={() => setSection(item.id)}
          >
            {item.label}
            <small>{item.gloss}</small>
          </button>
        ))}
      </nav>
      <div className="office-body">
      {section === 'retencao' ? <RetentionPanel /> : null}
      {section === 'retencao' ? null : <>
      <p className="office-note">
        Uma seção por vez. Impressões e cliques são dos últimos {office?.windowDays ?? 30} dias. Receita é o total já pago. Contas e links mostram no máximo {office?.listCap ?? 40}; a busca acha o restante.
      </p>
      {failed || !office ? (
        failed ? <ErrorState onRetry={() => load(q)} /> : <p>Carregando…</p>
      ) : (
        <>
          {section === 'metricas' ? (
            <section className="office-metrics" aria-label="Métricas">
              <p className="metric"><span className="metric-value">{count(office.metrics.users)}</span><span className="metric-label">contas · {count(office.metrics.bannedUsers)} {office.metrics.bannedUsers === 1 ? 'suspensa' : 'suspensas'}</span></p>
              <p className="metric"><span className="metric-value">{count(office.metrics.publishedLinks)}</span><span className="metric-label">publicados · {count(office.metrics.pendingLinks)} na fila</span></p>
              <p className="metric"><span className="metric-value">{count(office.metrics.clicks)}</span><span className="metric-label">cliques · {count(office.metrics.impressions)} impressões · {percent(office.metrics.ctr)}</span></p>
              <p className="metric"><span className="metric-value">{formatCents(office.metrics.paidCents)}</span><span className="metric-label">receita · {count(office.metrics.paidOrders)} pedidos</span></p>
            </section>
          ) : null}

          {section === 'cliques' ? (
            <section aria-label="Links mais clicados">
              <h2>Links mais clicados</h2>
              {office.topLinks.length === 0 ? <p>Nenhum clique no período.</p> : (
                <div className="moderation-grid">
                  {office.topLinks.map((row) => (
                    <article key={row.id} className="summary-card moderation-card">
                      <h2>{row.name}</h2>
                      <p className="moderation-kicker">{LINK_STATUS[row.status] ?? row.status}</p>
                      <p>{count(row.clicks)} cliques · {count(row.impressions)} impressões · {percent(row.ctr)}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {section === 'pagadores' ? (
            <section aria-label="Quem mais pagou">
              <h2>Quem mais pagou</h2>
              {office.topPayers.length === 0 ? <p>Nenhum pagamento confirmado.</p> : (
                <div className="refund-grid">
                  {office.topPayers.map((row) => (
                    <article key={row.userId} className="summary-card">
                      <h2>{row.name || 'Sem nome'}</h2>
                      <p>{row.email || row.userId}</p>
                      <p>{formatCents(row.paidCents)} · {count(row.orders)} pedidos · {USER_STATUS[row.status] ?? row.status}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {section === 'contas' || section === 'links' ? (
            <form className="office-search" onSubmit={(event) => { event.preventDefault(); setQ(draft.trim()) }}>
              <input className="field" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Nome, e-mail ou link" aria-label="Buscar contas e links" />
              <Button type="submit" variant="secondary">Buscar</Button>
            </form>
          ) : null}
          {notice && (section === 'contas' || section === 'links') ? <p role="status">{notice}</p> : null}

          {section === 'contas' ? (
            <section aria-label="Contas">
              <h2>Contas</h2>
              {office.users.length === 0 ? <p>Nenhuma conta.</p> : (
                <div className="refund-grid">
                  {office.users.map((row) => (
                    <article key={row.id} className="summary-card">
                      <h2>{row.name || 'Sem nome'}</h2>
                      <p>{row.email || row.id}</p>
                      <p className="moderation-kicker">{USER_STATUS[row.status] ?? row.status} · {row.role === 'ADMIN' ? 'Admin' : 'Usuário'} · {count(row.links)} links</p>
                      {row.status === 'ACTIVE' && row.role !== 'ADMIN' ? (
                        <div className="moderation-actions">
                          <Button variant="danger" onClick={() => { setReason(''); setPrompt({ kind: 'ban', id: row.id, name: row.name || row.email || row.id }) }}>Suspender</Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {section === 'links' ? (
            <section aria-label="Links">
              <h2>Links</h2>
              {office.links.length === 0 ? <p>Nenhum link.</p> : (
                <div className="moderation-grid">
                  {office.links.map((row) => (
                    <article key={row.id} className="summary-card moderation-card">
                      <p className="moderation-kicker">{LINK_STATUS[row.status] ?? row.status}</p>
                      <h2>{row.name}</h2>
                      <p><a href={row.url} target="_blank" rel="noreferrer">{row.url}</a></p>
                      <p>{row.ownerName || 'Sem dono'}{row.ownerEmail ? ` · ${row.ownerEmail}` : ''}</p>
                      {row.status !== 'UNAVAILABLE' ? (
                        <div className="moderation-actions">
                          <Button variant="danger" onClick={() => setPrompt({ kind: 'withdraw', id: row.id, name: row.name })}>Tirar do ar</Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      )}
      </>}
      </div>

      <dialog ref={dialogRef} className="plan-dialog" aria-labelledby="office-dialog-title">
        {prompt ? (
          <form method="dialog" onSubmit={(event) => { event.preventDefault(); void confirm() }}>
            <h2 id="office-dialog-title">{prompt.kind === 'ban' ? 'Suspender conta' : 'Tirar link do ar'}</h2>
            <p>
              {prompt.kind === 'ban'
                ? `${prompt.name} perde a conta. Todos os links saem do ar, o destaque é cancelado e um e-mail é enviado. O que já foi pago não volta, e a suspensão não tem desfazer.`
                : `${prompt.name} sai do catálogo e o destaque deste link é cancelado. A conta continua ativa. O dono não é avisado. Não dá para publicar de novo.`}
            </p>
            {prompt.kind === 'ban' ? (
              <label className="field-block">
                <span className="field-label">Motivo</span>
                <textarea className="field" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
              </label>
            ) : null}
            <div className="moderation-actions">
              <Button type="submit" variant="danger" disabled={busy}>{prompt.kind === 'ban' ? 'Suspender' : 'Tirar do ar'}</Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setPrompt(null)}>Cancelar</Button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  )
}
