'use client'

import { AvailabilitySkeleton } from './components/availability-skeleton'

import { ActionIcon } from '@/components/ui/action-icon'
import { useEffect, useState } from 'react'
import { useResourceState } from '@/lib/use-resource-state'
import { api } from '@/lib/api'
import { BackToPanel, RefreshButton } from '@/components/layout/workspace-actions'
import { Button } from '@/components/ui/button'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { WorkspaceSection } from '@/components/layout/workspace-section'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { AVAILABILITY_LABEL, REVISION_LABEL, availabilityDate, remainingTime, type AvailabilityData } from './availability-contract'
import { UrlCorrectionForm } from './components/url-correction-form'
import styles from './components/availability.module.css'

type ViewState = { kind: 'loading' | 'error' | 'denied' } | { kind: 'ready'; data: AvailabilityData }
const surface: Record<string, string> = { HOME: 'Página inicial', SEARCH: 'Busca', NICHE: 'Categoria' }
export function AvailabilityScreen({ linkId }: { linkId: string }) {
  const [editing, setEditing] = useState(false)
  const { state, setState, refreshing, start } = useResourceState<ViewState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    start(linkId)
    void api<AvailabilityData>('/v1/links/' + encodeURIComponent(linkId) + '/availability').then(result => { if (current) setState(result.status === 200 ? { kind: 'ready', data: result.body } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : 'error' }) }).catch(() => { if (current) setState({ kind: 'error' }) })
    return () => { current = false }
  }, [linkId, attempt, start, setState])
  async function submit(url: string) {
    if (state.kind !== 'ready') return
    const result = await api<{ message?: string }>('/v1/links/' + encodeURIComponent(linkId) + '/url-proposals', { method: 'POST', body: JSON.stringify({ canonicalUrl: url, expectedVersion: state.data.availability.version }) }).catch(() => { throw new Error('Sem conexão. Seu endereço foi mantido; tente novamente.') })
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível enviar a correção. Atualize os dados e tente novamente.')
  }
  return <section className={styles.page} aria-busy={refreshing}>
    <WorkspaceActions>{state.kind === 'ready' && state.data.canPropose ? <Button onClick={() => setEditing(true)}><ActionIcon name="edit" />Corrigir link</Button> : null}<RefreshButton disabled={refreshing || state.kind === 'loading'} onClick={() => setAttempt(value => value + 1)} /><BackToPanel /></WorkspaceActions>

    {state.kind === 'loading' ? <AvailabilitySkeleton /> : null}
    {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(value => value + 1)} /> : null}
    {state.kind === 'denied' ? <p role="alert">Disponibilidade indisponível para esta conta.</p> : null}
    {state.kind === 'ready' ? <>
      <WorkspaceSection title={state.data.link.name}>
      <dl className={styles.context}><div><dt>Checagem</dt><dd>{AVAILABILITY_LABEL[state.data.availability.state]}</dd></div><div><dt>Última verificação</dt><dd>{state.data.availability.checkedAt ? availabilityDate(state.data.availability.checkedAt) : 'Ainda não realizada'}</dd></div><div><dt>URL atual</dt><dd>{state.data.link.canonicalUrl}</dd></div></dl>
      {state.data.availability.disabledAt ? <p className={styles.notice}>O link saiu do catálogo após falhas repetidas. Envie a correção para análise.</p> : null}
      <p className={styles.note}>A checagem indica acesso ao destino; não confirma vagas ou conteúdo do grupo.</p>
      </WorkspaceSection>
      {state.data.pausedPromotions.length ? <section aria-label="Saldo pago pausado"><h3>Tempo pago pausado</h3><ul>{state.data.pausedPromotions.map(promotion => <li key={promotion.id}>{surface[promotion.surface] ?? promotion.surface}: {remainingTime(promotion.remainingMs)}</li>)}</ul><p className={styles.note}>O saldo será retomado após aprovar a correção.</p></section> : null}
      {state.data.canPropose ? <OverlayDialog open={editing} title="Corrigir link de acesso" onClose={() => setEditing(false)}><UrlCorrectionForm key={attempt} onSubmit={submit} /></OverlayDialog> : null}
      <WorkspaceSection title="Histórico de correções">{state.data.proposals.length ? <ul className={styles.history}>{state.data.proposals.map(proposal => <li key={proposal.id}><p><strong>{REVISION_LABEL[proposal.status]}</strong> · {availabilityDate(proposal.createdAt)}</p><p>{proposal.canonicalUrl}</p>{proposal.decisionReason ? <p>Justificativa: {proposal.decisionReason}</p> : null}</li>)}</ul> : <EmptyState />}</WorkspaceSection>
    </> : null}
  </section>
}
