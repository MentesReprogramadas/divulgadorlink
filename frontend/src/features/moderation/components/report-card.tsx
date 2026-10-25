'use client'

import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Select, TextArea } from '@/components/ui/input'
import { formatWhen } from '@/domain/format'
import { REPORT_REASONS, REPORT_STATUS, type ReportQueueRow } from '../report-contract'
import styles from './reports.module.css'

export type ReportDecisionInput = { status: 'IN_REVIEW' | 'RESOLVED'; reason: string; expectedVersion: number }
export function ReportCard({ report, onDecision }: { report: ReportQueueRow; onDecision: (input: ReportDecisionInput) => Promise<void> }) {
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  const running = useRef(false)
  const errorMessage = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (error) errorMessage.current?.focus() }, [error])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (running.current) return
    const data = new FormData(event.currentTarget)
    const status = data.get('status') === 'IN_REVIEW' ? 'IN_REVIEW' : 'RESOLVED'
    running.current = true; setPending(true); setError('')
    try { await onDecision({ status, expectedVersion: report.version, reason: String(data.get('reason') ?? '') }) }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.') }
    finally { running.current = false; setPending(false) }
  }
  return <article className={styles.card} aria-label={'Denúncia ' + report.id}>
    <LiquidLens radius={24} />
    <header><h3><a href={'/link/' + encodeURIComponent(report.linkId)}>{report.link.name}</a></h3><p className={styles.meta}>Protocolo: {report.id} · {formatWhen(report.createdAt)}</p></header>
    <div className={styles.context}><strong>{report.kind === 'AVAILABILITY' ? 'Disponibilidade' : 'Conteúdo'}</strong><span>{REPORT_REASONS[report.reason]}</span><span>{REPORT_STATUS[report.status]}</span></div>
    <blockquote className={styles.comment}>{report.comment || 'Sem comentário.'}</blockquote>
    {report.decisionReason ? <p><strong>Última decisão:</strong> {report.decisionReason}</p> : null}
    {report.history.length ? <details className={styles.history}><summary>Histórico ({report.history.length})</summary><ol>{report.history.map(row => <li key={row.id}>{formatWhen(row.createdAt)} · {row.after.status ? REPORT_STATUS[row.after.status] : 'Decisão registrada'}{typeof row.after.reason === 'string' ? <p>{row.after.reason}</p> : null}</li>)}</ol></details> : null}
    {report.status !== 'RESOLVED' ? <div className={styles.decision}><form className={styles.fields} aria-label="Decidir denúncia" onSubmit={event => void submit(event)}>
      <Field label="Próximo estado"><Select name="status" defaultValue={report.status === 'RECEIVED' ? 'IN_REVIEW' : 'RESOLVED'} disabled={pending}>{report.status === 'RECEIVED' ? <option value="IN_REVIEW">Em análise</option> : null}<option value="RESOLVED">Resolvida</option></Select></Field>
      <Field label="Justificativa"><TextArea name="reason" required minLength={3} maxLength={500} rows={2} disabled={pending} /></Field>
      {error ? <p ref={errorMessage} tabIndex={-1} role="alert">{error}</p> : null}
      <Button type="submit" loading={pending}><ActionIcon name="save" />Salvar decisão</Button>
    </form></div> : null}
  </article>
}
