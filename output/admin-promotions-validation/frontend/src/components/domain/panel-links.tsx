'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { LinkMeta } from '@/components/domain/link-meta'
import { formatRate } from '@/domain/format'
import { linkStatusLabel, linkStatusTone } from '@/domain/labels'
import { api } from '@/lib/api'

export type PanelLink = {
  id: string
  name: string
  description?: string
  status: string
  occupiesSlot?: boolean
  network?: { name?: string; slug?: string }
  niche?: { name?: string; slug?: string }
  pendingText?: { name: string; description: string } | null
}

type Stats = { impressions: number; clicks: number; ctr: number }
type FilterId = 'all' | 'published' | 'draft' | 'review' | 'rejected' | 'unavailable' | 'attention'

const PAGE_SIZE = 12

const FILTERS: Array<{ id: FilterId; label: string; match: (link: PanelLink) => boolean }> = [
  { id: 'all', label: 'Todos', match: () => true },
  { id: 'published', label: 'Publicados', match: (link) => link.status === 'PUBLISHED' },
  { id: 'draft', label: 'Rascunhos', match: (link) => link.status === 'DRAFT' },
  { id: 'review', label: 'Em revisão', match: (link) => link.status === 'PENDING_MODERATION' },
  { id: 'rejected', label: 'Rejeitados', match: (link) => link.status === 'PRE_REJECTED' },
  { id: 'unavailable', label: 'Indisponíveis', match: (link) => link.status === 'UNAVAILABLE' },
  { id: 'attention', label: 'Precisam de atenção', match: (link) => link.status !== 'PUBLISHED' || Boolean(link.pendingText) },
]

const GLYPH: Record<string, string> = {
  external: 'M6.5 3.5H3.8A1.3 1.3 0 0 0 2.5 4.8v7.4a1.3 1.3 0 0 0 1.3 1.3h7.4a1.3 1.3 0 0 0 1.3-1.3V9.5M8.5 2.5h5v5M13.5 2.5 7.2 8.8',
  pencil: 'M9.8 2.7 13.3 6.2 5.2 14.3H1.7V10.8z',
  star: 'M8 1.6 9.8 5.5l4.2.4-3.2 2.8 1 4.1L8 10.7 4.2 12.8l1-4.1L2 5.9l4.2-.4z',
  flag: 'M3.2 14V2.4h7.1L8.8 5l1.5 2.6H3.2',
  eye: 'M1.4 8S3.8 3.6 8 3.6 14.6 8 14.6 8 12.2 12.4 8 12.4 1.4 8 1.4 8zM8 10.1a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2z',
  pointer: 'M4.6 2.2v9.2l2.1-2.2 2.5 3.4 1.6-.9-2.5-3.4 3.4-.3z',
  percent: 'M4.4 11.6 11.6 4.4M5.3 5.5a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8zM11.6 12.3a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z',
  close: 'M4 4l8 8M12 4 4 12',
}

function Glyph({ name }: { name: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path d={GLYPH[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatNumber(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  return amount.toLocaleString('pt-BR')
}

function LinkMetrics({ numbers }: { numbers: Stats | null | undefined }) {
  if (numbers === undefined) return <p className="panel-meta">Contando</p>
  if (numbers === null) return <p className="panel-meta">Contagem indisponível</p>
  const rows = [
    { key: 'impressions', label: 'Impressões', value: formatNumber(numbers.impressions), live: numbers.impressions > 0, icon: 'eye' },
    { key: 'clicks', label: 'Cliques', value: formatNumber(numbers.clicks), live: numbers.clicks > 0, icon: 'pointer' },
    { key: 'ctr', label: 'Taxa de cliques', value: formatRate(numbers.ctr), live: numbers.ctr > 0, icon: 'percent' },
  ]
  return (
    <div className="panel-stats">
      {rows.map((row) => (
        <div key={row.key} className="metric">
          <strong className={row.live ? 'metric-value is-live' : 'metric-value'}>{row.value}</strong>
          <span className="metric-label"><Glyph name={row.icon} />{row.label}</span>
        </div>
      ))}
    </div>
  )
}

function descriptionOf(link: PanelLink): string | null {
  const text = link.description?.trim() ?? ''
  if (!text || text === link.name.trim()) return null
  return text
}

export function LinkList({
  links,
  banned,
  stats,
}: {
  links: PanelLink[]
  banned: boolean
  stats: Record<string, Stats | null | undefined>
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterId>('all')
  const [page, setPage] = useState(1)
  const matched = links.filter(FILTERS.find((item) => item.id === filter)?.match ?? (() => true))
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const visible = matched.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const editingLink = links.find((link) => link.id === editing) ?? null

  function choose(next: FilterId) {
    setFilter(next)
    setPage(1)
  }

  return (
    <div className="link-board">
      <div className="filter-row" role="tablist" aria-label="Filtrar links">
        {FILTERS.map((item) => {
          const count = links.filter(item.match).length
          if (item.id !== 'all' && count === 0) return null
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => choose(item.id)}
            >
              {item.label}
              <span>{count}</span>
            </button>
          )
        })}
      </div>
      {visible.length === 0 ? <p className="panel-empty">Nenhum link neste filtro</p> : null}
      <div className="panel-link-grid">
        {visible.map((link) => {
          const description = descriptionOf(link)
          const numbers = stats[link.id]
          const editable = (link.status === 'PUBLISHED' || link.status === 'PENDING_MODERATION') && !banned
          return (
            <article key={link.id} id={`link-${link.id}`} className="link-card">
              <h3>{link.name}</h3>
              {description ? <p className="panel-description">{description}</p> : null}
              <LinkMeta
                niche={link.niche}
                network={link.network}
                status={<Badge kind="status" tone={linkStatusTone(link.status)}>{linkStatusLabel(link.status)}</Badge>}
              />
              {link.pendingText ? <p className="panel-meta">Proposta pendente: {link.pendingText.name}</p> : null}
              {link.occupiesSlot ? <p className="panel-meta">Ocupa uma vaga</p> : null}
              <LinkMetrics numbers={numbers} />
              <div className="link-card-actions">
                <ButtonLink className="action-open" variant="secondary" href={`/link/${link.id}`}><Glyph name="external" />Acessar</ButtonLink>
                {editable ? (
                  <Button className="action-edit" type="button" variant="secondary" onClick={() => setEditing(link.id)}><Glyph name="pencil" />Editar</Button>
                ) : null}
                {link.status === 'PRE_REJECTED' ? <ButtonLink className="action-contest" variant="secondary" href={`/painel/links/${link.id}/contestar`}><Glyph name="flag" />Contestar</ButtonLink> : null}
                {link.status === 'PUBLISHED' && !banned ? <ButtonLink className="action-feature" variant="secondary" href={`/painel/links/${link.id}/destaque`}><Glyph name="star" />Destacar</ButtonLink> : null}
              </div>
            </article>
          )
        })}
      </div>
      {editingLink ? <LinkEditDialog link={editingLink} banned={banned} onClose={() => setEditing(null)} /> : null}
      <Pagination page={current} pages={pages} onPage={setPage} />
    </div>
  )
}

export function LinkEditor({
  link,
  banned,
  framed = true,
  onCancel,
}: {
  link: PanelLink
  banned: boolean
  framed?: boolean
  onCancel?: () => void
}) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const editable = (link.status === 'PUBLISHED' || link.status === 'PENDING_MODERATION') && !banned

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    const result = await api<{ applied?: boolean; message?: string }>(`/v1/links/${link.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: data.get('name'), description: data.get('description') }),
    })
    setSaving(false)
    if (result.status === 200) setNote(result.body.applied ? 'Texto publicado' : 'Proposta registrada')
    else setNote(result.body.message ?? 'Não foi possível salvar.')
  }

  return (
    <div className="editor">
      {framed ? (
        <>
          <p className="panel-meta">Você está editando este link.</p>
          <LinkMeta
            niche={link.niche}
            network={link.network}
            status={<Badge kind="status" tone={linkStatusTone(link.status)}>{linkStatusLabel(link.status)}</Badge>}
          />
        </>
      ) : null}
      {editable ? (
        <form className="editor-form" onSubmit={(event) => void save(event)}>
          <Field label="Novo nome">
            <Input name="name" aria-label="Novo nome" defaultValue={link.name} required />
          </Field>
          <Field label="Nova descrição">
            <Input name="description" aria-label="Nova descrição" defaultValue={link.description ?? ''} />
          </Field>
          <div className="editor-actions">
            {onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button> : null}
            <Button type="submit" disabled={saving}>Salvar texto</Button>
          </div>
          {note ? <p role="status">{note}</p> : null}
        </form>
      ) : (
        <p className="panel-empty">Este link não pode ser editado agora.</p>
      )}
    </div>
  )
}

function LinkEditDialog({ link, banned, onClose }: { link: PanelLink; banned: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    function onCancel(event: Event) {
      event.preventDefault()
      onCloseRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog ref={ref} className="link-dialog" aria-labelledby="edit-link-title">
      <div className="link-dialog-head">
        <div>
          <h2 id="edit-link-title">Editar link</h2>
          <p className="panel-meta">{link.name}</p>
        </div>
        <button type="button" className="link-dialog-close" aria-label="Fechar" onClick={() => onCloseRef.current()}>
          <Glyph name="close" />
        </button>
      </div>
      <LinkEditor link={link} banned={banned} framed={false} onCancel={() => onCloseRef.current()} />
    </dialog>
  )
}

type MineBody = { links?: PanelLink[]; total?: number; message?: string }

async function loadAll(): Promise<{ links: PanelLink[]; total: number } | { message: string }> {
  const first = await api<MineBody>(`/v1/links/mine?page=1&pageSize=24`)
  if (first.status !== 200) return { message: first.body.message ?? 'Não foi possível carregar os links.' }
  const total = first.body.total ?? first.body.links?.length ?? 0
  const rows = [...(first.body.links ?? [])]
  const pages = Math.ceil(total / 24)
  for (let page = 2; page <= pages; page += 1) {
    const next = await api<MineBody>(`/v1/links/mine?page=${page}&pageSize=24`)
    if (next.status === 200) rows.push(...(next.body.links ?? []))
  }
  return { links: rows, total }
}

type MineCache = { links: PanelLink[]; stats: Record<string, Stats | null> }
let mineCache: MineCache | null = null

export function useMyLinks() {
  const [links, setLinks] = useState<PanelLink[]>([])
  const [stats, setStats] = useState<Record<string, Stats | null>>({})
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    if (!mineCache) return
    setLinks(mineCache.links)
    setStats(mineCache.stats)
    setReady(true)
  }, [])

  useEffect(() => {
    let current = true
    void (async () => {
      const loaded = await loadAll()
      if (!current) return
      if ('message' in loaded) {
        setError(loaded.message)
        setReady(true)
        return
      }
      setLinks(loaded.links)
      mineCache = { links: loaded.links, stats: mineCache?.stats ?? {} }
      setReady(true)
      await Promise.all(loaded.links.map(async (link) => {
        const row = await api<Stats>(`/v1/analytics/links/${link.id}`)
        if (!current) return
        const value = row.status === 200 ? row.body : null
        setStats((previous) => {
          const next = { ...previous, [link.id]: value }
          mineCache = { links: loaded.links, stats: next }
          return next
        })
      }))
    })()
    return () => { current = false }
  }, [])

  return { links, stats, error, ready }
}
