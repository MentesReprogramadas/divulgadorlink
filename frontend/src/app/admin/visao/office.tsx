'use client'

import { OfficeSkeleton } from '@/features/administration/components/insight-skeleton'
import { SupportEntry, SUPPORT_RETURN_KEY } from '@/features/support/support-entry'

import { ActionIcon } from '@/components/ui/action-icon'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { WorkspaceSection, ComparisonBars } from '@/components/layout/workspace-section'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { EmptyState } from '@/components/feedback/empty-state'
import styles from '@/components/layout/workspace-dashboard.module.css'
import { formatCents } from '@/domain/money'
import { api } from '@/lib/api'
import { LINK_STATUSES, AdminLinksBoard, type AdminLinkFilter, type AdminLinkRow, type AdminLinkStatus } from '@/features/administration/components/admin-links-board'
import { FinancePanel } from './finance-panel'
import { RetentionPanel } from './retention-panel'
import { TrafficPanel } from './traffic-panel'
import { SearchOpportunitiesPanel } from '@/features/search-opportunities/search-opportunities-panel'

type Office = {
  windowDays: number
  listCap: number
  linkStatusCounts: Record<AdminLinkStatus, number>
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
  links: AdminLinkRow[]
}

type Prompt =
  | { kind: 'ban'; id: string; name: string }
  | { kind: 'withdraw'; id: string; name: string; status: AdminLinkStatus }

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
  { id: 'buscas', label: 'Buscas', gloss: 'Oportunidades de conteúdo' },
  { id: 'trafego', label: 'Tráfego', gloss: 'Visitas, funil e cookies' },
  { id: 'financeiro', label: 'Financeiro', gloss: 'Pix, cartão, horários' },
  { id: 'cliques', label: 'Mais clicados', gloss: 'Últimos 30 dias' },
  { id: 'pagadores', label: 'Pagadores', gloss: 'Quem mais pagou' },
  { id: 'contas', label: 'Contas', gloss: 'Suspender' },
  { id: 'links', label: 'Links', gloss: 'Destaque e publicação' },
  { id: 'retencao', label: 'Retenção', gloss: 'Analytics de 12 meses' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']
const SECTION_ICONS = { buscas: 'opportunities', metricas: 'chart', trafego: 'traffic', financeiro: 'payment', cliques: 'pointer', pagadores: 'payers', contas: 'accounts', links: 'link', retencao: 'retention' } as const
const SECTION_ITEMS = SECTIONS.map(item => ({ ...item, icon: SECTION_ICONS[item.id] }))

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
  const [linkStatus, setLinkStatus] = useState<AdminLinkFilter>('ALL')
  const [loading, setLoading] = useState(false)
  const loadSequence = useRef(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pendingRef = useRef(false)
  const returnRef = useRef<{ userId: string; scrollY: number } | null>(null)

  useLayoutEffect(() => {
    if (officeCache) setOffice(officeCache)
    if (new URLSearchParams(window.location.search).get('suporte') !== 'retorno') return
    setSection('contas')
    try {
      const raw = sessionStorage.getItem(SUPPORT_RETURN_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { query?: unknown; userId?: unknown; scrollY?: unknown }
      if (typeof saved.query === 'string') { setQ(saved.query); setDraft(saved.query) }
      if (typeof saved.userId === 'string' && typeof saved.scrollY === 'number') returnRef.current = { userId: saved.userId, scrollY: saved.scrollY }
    } catch { setSection('contas') }
  }, [])

  useEffect(() => {
    if (!office || loading || section !== 'contas' || !returnRef.current) return
    const saved = returnRef.current
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`support-user-${saved.userId}`)
      if (!target) return
      target.focus({ preventScroll: true })
      window.scrollTo(0, saved.scrollY)
      returnRef.current = null
      sessionStorage.removeItem(SUPPORT_RETURN_KEY)
      window.history.replaceState(null, '', '/admin/visao')
    })
    return () => cancelAnimationFrame(frame)
  }, [office, loading, section])

  async function load(query: string, status: AdminLinkFilter = linkStatus) {
    const sequence = ++loadSequence.current
    setLoading(true)
    setFailed(false)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (status !== 'ALL') params.set('status', status)
    try {
      const response = await api<Office>(`/v1/admin/office${params.size ? `?${params}` : ''}`)
      if (sequence !== loadSequence.current) return
      if (response.status !== 200) { setFailed(true); return }
      setOffice(response.body)
      if (!query && status === 'ALL') officeCache = response.body
    } catch {
      if (sequence === loadSequence.current) setFailed(true)
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }

  useEffect(() => {
    const pending = load(q, linkStatus)
    return () => { void pending }
  }, [q, linkStatus])

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

  return (
    <div className={styles.dashboard}>
      {section !== 'buscas' ? <WorkspaceActions>
        <RefreshButton onClick={() => void load(q)} />
        {section === 'contas' || section === 'links' ? <><Button type="submit" form="office-filters"><ActionIcon name="search" />Buscar</Button><Button variant="secondary" onClick={() => { setDraft(''); setQ(''); setLinkStatus('ALL') }}><ActionIcon name="resetFilters" />Limpar busca</Button></> : null}
      </WorkspaceActions> : null}
      <WorkspaceFilters id="office-filters" label="Filtrar gestão" onSubmit={event => { event.preventDefault(); setQ(draft.trim()) }}>
        <ResponsiveTabs value={section} onChange={setSection} label="Área de gestão" idPrefix="office-area" items={SECTION_ITEMS} />
        {section === 'contas' || section === 'links' ? <Field label="Buscar contas e links"><Input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Nome, e-mail ou link" /></Field> : null}
        {section === 'links' ? <Field label="Situação dos links"><Select value={linkStatus} onChange={event => setLinkStatus(event.target.value as AdminLinkFilter)}><option value="ALL">Todos</option>{LINK_STATUSES.map(status => <option key={status.value} value={status.value}>{status.filter}</option>)}</Select></Field> : null}
      </WorkspaceFilters>
      <div className={styles.dashboard} role="tabpanel" id={`office-area-panel-${section}`} aria-labelledby={`office-area-${section}`} tabIndex={0}>
      {section === 'buscas' ? <SearchOpportunitiesPanel /> : null}
      {section === 'retencao' ? <RetentionPanel /> : null}
      {section === 'trafego' ? <TrafficPanel /> : null}
      {section === 'financeiro' ? <FinancePanel /> : null}
      {section === 'buscas' || section === 'retencao' || section === 'trafego' || section === 'financeiro' ? null : <>
      {failed || !office ? (
        failed ? <ErrorState onRetry={() => load(q)} /> : <OfficeSkeleton section={section} />
      ) : (
        <>
          {section === 'metricas' ? (
            <div className={styles.dashboard}>
              <dl className={styles.metrics} aria-label="Métricas">
                <div><dt>Contas</dt><dd>{count(office.metrics.users)}<small>{count(office.metrics.bannedUsers)} suspensas</small></dd></div>
                <div><dt>Links publicados</dt><dd>{count(office.metrics.publishedLinks)}<small>{count(office.metrics.pendingLinks)} na fila</small></dd></div>
                <div><dt>Cliques no catálogo</dt><dd>{count(office.metrics.clicks)}<small>{count(office.metrics.impressions)} impressões · {percent(office.metrics.ctr)}</small></dd></div>
                <div><dt>Receita confirmada</dt><dd>{formatCents(office.metrics.paidCents)}<small>{count(office.metrics.paidOrders)} pedidos pagos</small></dd></div>
              </dl>
              <div className={styles.columns}>
                <WorkspaceSection title="Publicação no catálogo" description="Quantidade de links por situação.">
                  <ComparisonBars rows={Object.entries(office.linkStatusCounts).map(([id,value]) => ({id,label:LINK_STATUS[id] ?? id,value}))} unit="links" />
                </WorkspaceSection>
                <WorkspaceSection title="Próximas ações">
                  <ul className={styles.tasks}><li><a href="/admin/moderacao">Revisar envios →</a><span>{count(office.metrics.pendingLinks)} links aguardando revisão</span></li><li><a href="/admin/denuncias">Conferir denúncias →</a><span>Analise os relatos recebidos.</span></li><li><a href="/admin/disponibilidade">Ver correções →</a><span>Convites atualizados pelos responsáveis.</span></li><li><a href="/admin/estornos">Acompanhar estornos →</a><span>Devoluções e tentativas de pagamento.</span></li></ul>
                </WorkspaceSection>
              </div>
            </div>
          ) : null}

          {section === 'cliques' ? (
            <section aria-label="Links mais clicados">
              <h2>Links mais clicados</h2>
              {office.topLinks.length === 0 ? <EmptyState /> : (
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
              {office.topPayers.length === 0 ? <EmptyState /> : (
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

          {notice && (section === 'contas' || section === 'links') ? <p role="status">{notice}</p> : null}

          {section === 'contas' ? (
            <section aria-label="Contas">
              <h2>Contas</h2>
              {office.users.length === 0 ? <EmptyState /> : (
                <div className="refund-grid">
                  {office.users.map((row) => (
                    <article key={row.id} id={`support-user-${row.id}`} tabIndex={-1} className="summary-card">
                      <h2>{row.name || 'Sem nome'}</h2>
                      <p>{row.email || row.id}</p>
                      <p className="moderation-kicker">{USER_STATUS[row.status] ?? row.status} · {row.role === 'ADMIN' ? 'Admin' : 'Usuário'} · {count(row.links)} links</p>
                      {row.role === 'USER' ? <SupportEntry userId={row.id} name={row.name || row.email || row.id} query={q} /> : null}
                      {row.status === 'ACTIVE' && row.role !== 'ADMIN' ? (
                        <div className="moderation-actions">
                          <Button variant="danger" onClick={() => { setReason(''); setPrompt({ kind: 'ban', id: row.id, name: row.name || row.email || row.id }) }}><ActionIcon name="ban" />Suspender</Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {section === 'links' ? (
            <AdminLinksBoard links={office.links} loading={loading} onWithdraw={row => setPrompt({ kind: 'withdraw', id: row.id, name: row.name, status: row.status })} />
          ) : null}
        </>
      )}
      </>}
      </div>

      <dialog ref={dialogRef} className="plan-dialog" aria-labelledby="office-dialog-title">
        {prompt ? (
          <form method="dialog" onSubmit={(event) => { event.preventDefault(); void confirm() }}>
            <h2 id="office-dialog-title">{prompt.kind === 'ban' ? 'Suspender conta' : prompt.status === 'PUBLISHED' ? 'Tirar link do ar' : 'Retirar envio'}</h2>
            <p>
              {prompt.kind === 'ban'
                ? `${prompt.name} perde a conta. Todos os links saem do ar, o destaque é cancelado e um e-mail é enviado. O que já foi pago não volta, e a suspensão não tem desfazer.`
                : prompt.status === 'PUBLISHED' ? `${prompt.name} sai do catálogo e o destaque deste link é cancelado. A conta continua ativa. O dono não é avisado. Não dá para publicar de novo.` : `${prompt.name} será retirado do fluxo de publicação e ficará fora do ar. A conta continua ativa. O dono não é avisado. Esta ação não pode ser desfeita.`}
            </p>
            {prompt.kind === 'ban' ? (
              <label className="field-block">
                <span className="field-label">Motivo</span>
                <textarea className="field" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
              </label>
            ) : null}
            <div className="moderation-actions">
              <Button type="submit" variant="danger" disabled={busy}><ActionIcon name="trash" />{prompt.kind === 'ban' ? 'Suspender' : prompt.status === 'PUBLISHED' ? 'Tirar do ar' : 'Retirar envio'}</Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setPrompt(null)}><ActionIcon name="close" />Cancelar</Button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  )
}
