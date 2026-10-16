'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { AVAILABILITY_LABEL, REVISION_LABEL, availabilityDate, remainingTime, type AvailabilityData } from './availability-contract'
import { UrlCorrectionForm } from './components/url-correction-form'
import styles from './components/availability.module.css'

type ViewState = { kind: 'loading' | 'error' | 'denied' } | { kind: 'ready'; data: AvailabilityData }
const surface: Record<string, string> = { HOME: 'Página inicial', SEARCH: 'Busca', NICHE: 'Categoria' }
export function AvailabilityScreen({ linkId }: { linkId: string }) {
  const [state, setState] = useState<ViewState>({ kind: 'loading' }), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    setState({ kind: 'loading' })
    void api<AvailabilityData>('/v1/links/' + encodeURIComponent(linkId) + '/availability').then(result => { if (current) setState(result.status === 200 ? { kind: 'ready', data: result.body } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : 'error' }) }).catch(() => { if (current) setState({ kind: 'error' }) })
    return () => { current = false }
  }, [linkId, attempt])
  async function submit(url: string) {
    if (state.kind !== 'ready') return
    const result = await api<{ message?: string }>('/v1/links/' + encodeURIComponent(linkId) + '/url-proposals', { method: 'POST', body: JSON.stringify({ canonicalUrl: url, expectedVersion: state.data.availability.version }) }).catch(() => { throw new Error('Sem conexão. Seu endereço foi mantido; tente novamente.') })
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível enviar a correção. Atualize os dados e tente novamente.')
  }
  return <section className={styles.page}>
    <header><h2>Disponibilidade do link</h2><p className={styles.note}>A checagem indica acesso ao destino; não confirma vagas ou conteúdo do grupo.</p></header>
    <div className={styles.actions}><a href="/painel">Voltar ao painel</a><Button type="button" variant="secondary" disabled={state.kind === 'loading'} onClick={() => setAttempt(value => value + 1)}>Atualizar dados</Button></div>
    {state.kind === 'loading' ? <p role="status">Carregando disponibilidade…</p> : null}
    {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(value => value + 1)} /> : null}
    {state.kind === 'denied' ? <p role="alert">Disponibilidade indisponível para esta conta.</p> : null}
    {state.kind === 'ready' ? <>
      <h3>{state.data.link.name}</h3>
      <dl className={styles.context}><div><dt>Checagem</dt><dd>{AVAILABILITY_LABEL[state.data.availability.state]}</dd></div><div><dt>Última verificação</dt><dd>{state.data.availability.checkedAt ? availabilityDate(state.data.availability.checkedAt) : 'Ainda não realizada'}</dd></div><div><dt>URL atual</dt><dd>{state.data.link.canonicalUrl}</dd></div></dl>
      {state.data.availability.disabledAt ? <p className={styles.notice}>O link saiu do catálogo após falhas repetidas. Envie a correção para análise.</p> : null}
      {state.data.pausedPromotions.length ? <section aria-label="Saldo pago pausado"><h3>Tempo pago pausado</h3><ul>{state.data.pausedPromotions.map(promotion => <li key={promotion.id}>{surface[promotion.surface] ?? promotion.surface}: {remainingTime(promotion.remainingMs)}</li>)}</ul><p className={styles.note}>O saldo será retomado após aprovar a correção.</p></section> : null}
      {state.data.canPropose ? <UrlCorrectionForm key={attempt} onSubmit={submit} /> : null}
      <section aria-label="Histórico de correções"><h3>Correções</h3>{state.data.proposals.length ? <ul className={styles.history}>{state.data.proposals.map(proposal => <li key={proposal.id}><p><strong>{REVISION_LABEL[proposal.status]}</strong> · {availabilityDate(proposal.createdAt)}</p><p>{proposal.canonicalUrl}</p>{proposal.decisionReason ? <p>Justificativa: {proposal.decisionReason}</p> : null}</li>)}</ul> : <p>Nenhuma correção enviada.</p>}</section>
    </> : null}
  </section>
}
