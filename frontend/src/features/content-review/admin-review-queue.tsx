'use client'
import {createPortal} from 'react-dom'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { Field, Input, TextArea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { ListSkeleton } from '@/components/layout/workspace-skeleton'
import type { ProfileContent } from '@/features/profiles/profile-contract'
import type { RedirectFieldsValue } from '@/features/redirects/redirect-contract'
import type { ContentReview } from './review-contract'
import styles from './components/admin-review-queue.module.css'
type Case = ContentReview & { kind: 'PROFILE' | 'REDIRECT'; ownerName: string; snapshot: ProfileContent | RedirectFieldsValue; appealText: string | null }
export function AdminContentReviewQueue({ kind,actionsTarget }: { kind: 'PROFILE' | 'REDIRECT';actionsTarget?:HTMLElement|null }) {
  const [cases, setCases] = useState<Case[]>([]), [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [query, setQuery] = useState(''), [reload, setReload] = useState(0), [pending, setPending] = useState(false), [error, setError] = useState('')
  const [rejecting, setRejecting] = useState<Case | null>(null), [reason, setReason] = useState('')
  useEffect(() => { let live = true; setError(''); void api<{ cases: Case[] }>('/v1/admin/content-reviews?kind=' + kind).then(result => { if (!live) return; if (result.status !== 200) { setPhase('error'); return } setCases(result.body.cases); setPhase('ready') }).catch(() => { if (live) setPhase('error') }); return () => { live = false } }, [kind, reload])
  async function decide(row: Case, decision: 'APPROVE' | 'REJECT') {
    if (pending) return
    setPending(true); setError('')
    try { const result = await api<{ message?: string }>('/v1/admin/content-reviews/' + row.id + '/decision', { method: 'POST', body: JSON.stringify({ decision, ...(decision === 'REJECT' ? { reason } : {}) }) }); if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível decidir.'); setCases(current => current.filter(item => item.id !== row.id)); setRejecting(null); setReason('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Tente novamente.') } finally { setPending(false) }
  }
  const visible = cases.filter(row => JSON.stringify([row.snapshot, row.ownerName]).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim()))
  const actions=<WorkspaceActions><RefreshButton disabled={pending} onClick={() => setReload(value => value + 1)} /></WorkspaceActions>
  return <div className={styles.queue}>{actionsTarget?createPortal(actions,actionsTarget):actions}<WorkspaceFilters label="Filtrar envios"><Field label="Buscar envio"><Input type="search" placeholder="Título, link ou responsável" value={query} onChange={event => setQuery(event.target.value)} /></Field></WorkspaceFilters>
    {error && !rejecting ? <p role="alert">{error}</p> : null}{phase === 'loading' ? <ListSkeleton kind="queue" filters={0} actions={false} /> : phase === 'error' ? <ErrorState onRetry={() => setReload(value => value + 1)} /> : !visible.length ? <EmptyState>Nenhum envio aguardando revisão.</EmptyState> : visible.map(row => {
      const snapshot = row.snapshot
      return <article key={row.id} className={styles.card}><LiquidLens radius={24} /><div className={styles.header}><Badge tone="wait">{row.appealText ? 'Contestação' : 'Revisão humana'}</Badge><span>Versão {row.version}</span></div><h2>{'name' in snapshot ? snapshot.name : snapshot.label}</h2><p><strong>Responsável:</strong> {row.ownerName}</p>
        {'bio' in snapshot ? <><p>{snapshot.bio}</p>{snapshot.buttonTest?<section><h3>Versões de botão</h3><ul>{snapshot.buttonTest.labels.map((label,index)=><li key={index}>{label}</li>)}</ul></section>:null}{snapshot.translations?.entries.map(translation=><details key={translation.locale}><summary>Tradução · {translation.locale}</summary><h3>{translation.name}</h3><p>{translation.bio}</p><ul>{[...Object.values(translation.categories),...Object.values(translation.items)].map((text,index)=><li key={index}>{text}</li>)}</ul></details>)}<p>Conteúdo adulto: {snapshot.requiresAge ? 'Sim' : 'Não'}</p>{snapshot.categories.map(group => <section key={group.id}><h3>{group.name}{group.visible ? '' : ' (oculto)'}</h3><ul>{snapshot.items.filter(item => item.categoryId === group.id).map(item => <li key={item.id}><strong>{item.label}</strong>{item.visible ? '' : ' (oculto)'}<p>{item.type === 'CATALOG' ? 'Catálogo: ' + item.destination : item.destination}</p></li>)}</ul></section>)}</> : <><p>{snapshot.destinationUrl}</p><p>Conteúdo adulto: {snapshot.requiresAge ? 'Sim' : 'Não'}</p></>}
        {row.appealText ? <section><h3>Contestação</h3><p>{row.appealText}</p></section> : null}<div className={styles.actions}><Button disabled={pending} onClick={() => void decide(row, 'APPROVE')}><ActionIcon name="check" />Aprovar</Button><Button variant="danger" disabled={pending} onClick={() => { setRejecting(row); setReason(''); setError('') }}><ActionIcon name="reject" />Recusar</Button></div></article>
    })}
    <OverlayDialog open={Boolean(rejecting)} title="Recusar publicação" onClose={() => { if (!pending) setRejecting(null) }}><form className={styles.queue} onSubmit={event => { event.preventDefault(); if (rejecting) void decide(rejecting, 'REJECT') }}><Field label="Motivo da recusa" hint="A pessoa verá este motivo e poderá contestar uma vez."><TextArea required maxLength={500} rows={3} value={reason} disabled={pending} onChange={event => setReason(event.target.value)} /></Field>{error ? <p role="alert">{error}</p> : null}<Button variant="danger" loading={pending}><ActionIcon name="reject" />Confirmar recusa</Button></form></OverlayDialog>
  </div>
}
