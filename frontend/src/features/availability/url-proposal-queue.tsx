'use client'

import { CorrectionsQueueSkeleton } from './components/availability-skeleton'

import { ActionIcon } from '@/components/ui/action-icon'
import { useEffect, useRef, useState } from 'react'
import { useResourceState } from '@/lib/use-resource-state'
import { api } from '@/lib/api'
import { ButtonLink } from '@/components/ui/button'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import type { UrlDecision, UrlProposal } from './availability-contract'
import { UrlProposalCard } from './components/url-proposal-card'
import styles from './components/availability.module.css'

type QueueState = { kind: 'loading' | 'denied' | 'error' } | { kind: 'ready'; proposals: UrlProposal[]; nextCursor: string | null }
export function UrlProposalQueue({ cursor }: { cursor?: string }) {
  const { state, setState, refreshing, start } = useResourceState<QueueState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0), [notice, setNotice] = useState('')
  const heading = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    let current = true
    start(cursor ?? '')
    void api<{ proposals: UrlProposal[]; nextCursor: string | null }>('/v1/admin/url-proposals' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')).then(result => { if (current) setState(result.status === 200 ? { kind: 'ready', ...result.body } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : 'error' }) }).catch(() => { if (current) setState({ kind: 'error' }) })
    return () => { current = false }
  }, [cursor, attempt, start, setState])
  useEffect(() => { if (notice && state.kind === 'ready') heading.current?.focus() }, [notice, state])
  async function decide(id: string, input: UrlDecision) {
    const result = await api<{ message?: string }>('/v1/admin/url-proposals/' + encodeURIComponent(id) + '/decision', { method: 'PATCH', body: JSON.stringify(input) }).catch(() => { throw new Error('Sem conexão. Sua justificativa foi mantida; tente novamente.') })
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível salvar. Atualize a fila e tente novamente.')
    setNotice('Decisão salva.'); setAttempt(value => value + 1)
  }
  return <section className={styles.page} aria-busy={refreshing}>
    {state.kind === 'denied' ? <p role="alert">Fila indisponível para esta conta.</p> : <>
      <WorkspaceActions><RefreshButton label="Atualizar fila" disabled={refreshing || state.kind === 'loading'} onClick={() => setAttempt(value => value + 1)} />{cursor ? <a href="/admin/disponibilidade">Início da fila</a> : null}</WorkspaceActions>
      {notice ? <p role="status" ref={heading} tabIndex={-1}>{notice}</p> : null}
      {state.kind === 'loading' ? <CorrectionsQueueSkeleton /> : null}
      {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(value => value + 1)} /> : null}
      {state.kind === 'ready' ? <>{state.proposals.length ? state.proposals.map(proposal => <UrlProposalCard key={proposal.id} proposal={proposal} onDecision={input => decide(proposal.id, input)} />) : <EmptyState />}{state.nextCursor ? <ButtonLink variant="secondary" href={'/admin/disponibilidade?cursor=' + encodeURIComponent(state.nextCursor)}><ActionIcon name="next" />Próximas correções</ButtonLink> : null}</> : null}
    </>}
  </section>
}
