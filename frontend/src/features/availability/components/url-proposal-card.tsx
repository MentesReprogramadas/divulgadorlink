'use client'

import { ActionIcon } from '@/components/ui/action-icon'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Select, TextArea } from '@/components/ui/input'
import { availabilityDate, type UrlDecision, type UrlProposal } from '../availability-contract'
import styles from './availability.module.css'

export function UrlProposalCard({ proposal, onDecision }: { proposal: UrlProposal; onDecision: (input: UrlDecision) => Promise<void> }) {
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  const running = useRef(false), alert = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (error) alert.current?.focus() }, [error])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (running.current || proposal.version === null) return
    const data = new FormData(event.currentTarget)
    running.current = true; setPending(true); setError('')
    try { await onDecision({ decision: data.get('decision') === 'APPROVE' ? 'APPROVE' : 'REJECT', reason: String(data.get('reason') ?? ''), expectedVersion: proposal.version }) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Sua justificativa foi mantida.') }
    finally { running.current = false; setPending(false) }
  }
  return <article className={styles.card} aria-label={'Correção ' + proposal.id}>
    <header><h3>{proposal.link.name}</h3><p className={styles.note}>{availabilityDate(proposal.createdAt)} · Protocolo: {proposal.id}</p></header>
    <dl className={styles.context}><div><dt>URL atual</dt><dd>{proposal.sourceUrl}</dd></div><div><dt>Novo convite</dt><dd>{proposal.canonicalUrl}</dd></div></dl>
    <p className={styles.note}>A aprovação valida novamente o destino, republica o link e retoma o saldo pago. Se faltar uma vaga, a proposta e o saldo serão preservados.</p>
    {proposal.version === null ? <p role="alert">Contexto indisponível. Atualize a fila antes de decidir.</p> : <div className={styles.formWidth}><form className={styles.fields} aria-label="Decidir correção" onSubmit={event => void submit(event)}>
      <Field label="Decisão"><Select name="decision" defaultValue="" required disabled={pending}><option value="" disabled>Escolha a decisão</option><option value="APPROVE">Aprovar correção</option><option value="REJECT">Recusar correção</option></Select></Field>
      <Field label="Justificativa"><TextArea name="reason" minLength={3} maxLength={500} required disabled={pending} rows={3} /></Field>
      {error ? <p role="alert" ref={alert} tabIndex={-1}>{error}</p> : null}
      <Button type="submit" loading={pending}><ActionIcon name="save" />Salvar decisão</Button>
    </form></div>}
  </article>
}
