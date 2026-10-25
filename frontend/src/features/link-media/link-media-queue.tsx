'use client'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ButtonLink } from '@/components/ui/button'
import { LinkMeta, type LinkContext } from '@/components/domain/link-meta'
import { Field, Input, Select, TextArea } from '@/components/ui/input'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { Badge } from '@/components/ui/badge'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { ListSkeleton } from '@/components/layout/workspace-skeleton'
import { EmptyState } from '@/components/feedback/empty-state'
import { api } from '@/lib/api'
import styles from './link-media.module.css'

type Asset = LinkContext & { id: string; linkId: string; kind: 'ICON' | 'IMAGE'; alt: string | null; name: string; ownerName?: string | null; version: number; url: string; canApprove?: boolean }
export function LinkMediaQueue({ linkId, actionsTarget }: { linkId?: string; actionsTarget?: HTMLElement | null }) {
  const [assets, setAssets] = useState<Asset[]>([]), [busy, setBusy] = useState(false), [ready, setReady] = useState(false)
  const [error, setError] = useState(''), [rejecting, setRejecting] = useState<Asset | null>(null), [reason, setReason] = useState('')
  const [query, setQuery] = useState(''), [kind, setKind] = useState('ALL')
  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const result = await api<{ assets?: Asset[]; message?: string }>('/v1/admin/moderation/media' + (linkId ? '?linkId=' + encodeURIComponent(linkId) : ''))
      if (result.status !== 200) {
        if (result.status === 401 || result.status === 403) { setAssets([]); setRejecting(null); setReason('') }
        throw new Error(result.body.message ?? 'Não foi possível carregar anexos.')
      }
      setAssets(result.body.assets ?? [])
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível carregar anexos.') }
    finally { setBusy(false); setReady(true) }
  }, [linkId])
  useEffect(() => { void load() }, [load])

  async function decide(asset: Asset, decision: 'APPROVE' | 'REJECT') {
    if (busy) return
    if (decision === 'REJECT' && !reason.trim()) { setError('Informe o motivo da rejeição.'); return }
    setBusy(true); setError('')
    try {
      const result = await api<{ message?: string }>(`/v1/admin/moderation/media/${asset.id}`, { method: 'POST', body: JSON.stringify({ expectedVersion: asset.version, decision, ...(decision === 'REJECT' ? { reason } : {}) }) })
      if (result.status !== 200) {
        if (result.status === 401 || result.status === 403) { setAssets([]); setRejecting(null); setReason('') }
        throw new Error(result.body.message ?? 'Não foi possível analisar o anexo.')
      }
      await load()
      setRejecting(null); setReason('')
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível analisar o anexo.') }
    finally { setBusy(false) }
  }
  const filtered = Boolean(query.trim() || kind !== 'ALL')
  const visible = assets.filter(asset => (!linkId || asset.linkId === linkId) && (kind === 'ALL' || asset.kind === kind) && `${asset.name} ${asset.alt ?? ''} ${asset.linkId}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim()))
  const actions = <WorkspaceActions label="Ações da análise de anexos">
    {filtered ? <Button readOnlyAllowed type="button" variant="secondary" onClick={() => { setQuery(''); setKind('ALL') }}><ActionIcon name="resetFilters" />Limpar filtros de anexos</Button> : null}
    <Button readOnlyAllowed type="button" variant="secondary" disabled={busy} onClick={() => void load()}><ActionIcon name="refresh" />Atualizar fila de anexos</Button>
  </WorkspaceActions>
  return <section className={styles.editor} aria-label="Análise de anexos" aria-busy={busy}>
    {actionsTarget ? createPortal(actions, actionsTarget) : actions}
    <header className={styles.queueHeader}><h2>Anexos aguardando análise</h2><p className={styles.hint}>A decisão vale somente para esta imagem. Texto e publicação seguem sua análise própria.</p></header>
    <WorkspaceFilters label="Filtrar anexos">
      <Field label="Buscar anexos"><Input type="search" value={query} placeholder="Título do link ou descrição da imagem" onChange={event => setQuery(event.target.value)} /></Field>
      <Field label="Tipo de anexo"><Select value={kind} onChange={event => setKind(event.target.value)}><option value="ALL">Todos os anexos</option><option value="ICON">Ícones</option><option value="IMAGE">Imagens</option></Select></Field>
    </WorkspaceFilters>
    {!ready && !error ? <ListSkeleton kind="queue" filters={0} actions={false} /> : null}
    {error && !rejecting ? <p role="alert">{error}</p> : null}
    <div className={styles.assets}>{visible.map(asset => <article className={styles.asset} key={asset.id}>
      <LiquidLens radius={24} />
      <div className={styles.assetMetadata}><Badge tone="wait">Revisão de anexo</Badge><span>Versão {asset.version}</span></div>
      <div className={styles.assetHeading}><ActionIcon name={'image'} /><h3>{asset.name} · {asset.kind === 'ICON' ? 'Ícone' : 'Imagem'}</h3></div>
      <LinkMeta network={asset.network} niche={asset.niche} />
      {asset.ownerName ? <p className={styles.hint}><strong>Responsável:</strong> {asset.ownerName}</p> : null}
      <img className={styles.preview} src={asset.url.replace(/^\/api\//, '/bff/')} alt={asset.kind === 'ICON' ? 'Ícone enviado para análise' : asset.alt ?? ''} />
      {asset.canApprove === false ? <p>Este link está indisponível ou a conta está suspensa. Rejeite o anexo para encerrar a pendência.</p> : null}
      <div className={styles.actions}><Button type="button" disabled={busy || asset.canApprove === false} onClick={() => void decide(asset, 'APPROVE')}><ActionIcon name="check" />Aprovar anexo</Button><Button type="button" variant="danger" disabled={busy} onClick={() => { setRejecting(asset); setReason(''); setError('') }}><ActionIcon name="reject" />Rejeitar anexo</Button></div>
      <ButtonLink variant="ghost" href={'/admin/moderacao?link=' + encodeURIComponent(asset.linkId)}>Ver texto do link</ButtonLink>
    </article>)}</div>
    {ready && !busy && !error && !visible.length ? <EmptyState>{filtered ? 'Nenhum anexo corresponde aos filtros.' : 'Nenhum anexo aguardando análise.'}</EmptyState> : null}
    <OverlayDialog open={Boolean(rejecting)} title="Rejeitar anexo" closeDisabled={busy} onClose={() => { if (!busy) setRejecting(null) }}>
      <form className={styles.editor} onSubmit={event => { event.preventDefault(); if (rejecting) void decide(rejecting, 'REJECT') }}>
        <p>{rejecting?.name} · {rejecting?.kind === 'ICON' ? 'Ícone' : 'Imagem'}</p>
        <Field label="Motivo da recusa" hint="A pessoa verá o motivo e poderá enviar outro anexo."><TextArea required maxLength={500} rows={3} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></Field>
        {error ? <p role="alert">{error}</p> : null}
        <Button type="submit" variant="danger" loading={busy}><ActionIcon name="reject" />Confirmar rejeição</Button>
      </form>
    </OverlayDialog>
  </section>
}

