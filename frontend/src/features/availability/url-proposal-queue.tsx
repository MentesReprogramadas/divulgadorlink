'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Button, ButtonLink } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import type { UrlDecision, UrlProposal } from './availability-contract'
import { UrlProposalCard } from './components/url-proposal-card'
import styles from './components/availability.module.css'

type QueueState = { kind: 'loading' | 'denied' | 'error' } | { kind: 'ready'; proposals: UrlProposal[]; nextCursor: string | null }
export function UrlProposalQueue({ cursor }: { cursor?: string }) {
  const [state, setState] = useState<QueueState>({ kind: 'loading' }), [attempt, setAttempt] = useState(0), [notice, setNotice] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let current = true
    setState({ kind: 'loading' })
    void api<{ proposals: UrlProposal[]; nextCursor: string | null }>('/v1/admin/url-proposals' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')).then(result => { if (current) setState(result.status === 200 ? { kind: 'ready', ...result.body } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : 'error' }) }).catch(() => { if (current) setState({ kind: 'error' }) })
    return () => { current = false }
  }, [cursor, attempt])
  useEffect(() => { if (notice && state.kind === 'ready') heading.current?.focus() }, [notice, state])
  async function decide(id: string, input: UrlDecision) {
    const result = await api<{ message?: string }>('/v1/admin/url-proposals/' + encodeURIComponent(id) + '/decision', { method: 'PATCH', body: JSON.stringify(input) }).catch(() => { throw new Error('Sem conexão. Sua justificativa foi mantida; tente novamente.') })
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível salvar. Atualize a fila e tente novamente.')
    setNotice('Decisão salva.'); setAttempt(value => value + 1)
  }
  return <section className={styles.page}>
    <header><h2 ref={heading} tabIndex={-1}>Correções de convite</h2><p className={styles.note}>Revise a nova URL e registre a decisão antes de recuperar a publicação.</p></header>
    {state.kind === 'denied' ? <p role="alert">Fila indisponível para esta conta.</p> : <>
      <div className={styles.actions}><Button type="button" variant="secondary" disabled={state.kind === 'loading'} onClick={() => setAttempt(value => value + 1)}>Atualizar fila</Button>{cursor ? <a href="/admin/disponibilidade">Início da fila</a> : null}</div>
      {notice ? <p role="status">{notice}</p> : null}
      {state.kind === 'loading' ? <p role="status">Carregando correções…</p> : null}
      {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(value => value + 1)} /> : null}
      {state.kind === 'ready' ? <>{state.proposals.length ? state.proposals.map(proposal => <UrlProposalCard key={proposal.id} proposal={proposal} onDecision={input => decide(proposal.id, input)} />) : <p>Nenhuma correção aguardando análise.</p>}{state.nextCursor ? <ButtonLink variant="secondary" href={'/admin/disponibilidade?cursor=' + encodeURIComponent(state.nextCursor)}>Próximas correções</ButtonLink> : null}</> : null}
    </>}
  </section>
}
