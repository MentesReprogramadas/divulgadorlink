'use client'

import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Select, TextArea } from '@/components/ui/input'
import { REPORT_REASONS, REPORT_STATUS, type ReportFormProps, type ReportReason, type ReportReceipt } from '../report-contract'
import styles from './reports.module.css'

export function ReportForm({ name, onSubmit }: ReportFormProps) {
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const running = useRef(false)
  const receiptHeading = useRef<HTMLHeadingElement>(null), errorMessage = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (receipt) receiptHeading.current?.focus(); else if (error) errorMessage.current?.focus() }, [receipt, error])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (running.current) return
    const data = new FormData(event.currentTarget), reason = String(data.get('reason') ?? '')
    if (!Object.hasOwn(REPORT_REASONS, reason)) { setError('Escolha o motivo da denúncia.'); return }
    running.current = true; setPending(true); setError('')
    try { setReceipt(await onSubmit({ reason: reason as ReportReason, comment: String(data.get('comment') ?? '') })) }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível enviar. Seu texto foi mantido.') }
    finally { running.current = false; setPending(false) }
  }
  return <section className={styles.page} aria-label="Denunciar um link">
    <header><h2>Denunciar um link</h2><p>{name}</p></header>
    {receipt ? <div role="status" className={styles.receipt}><LiquidLens radius={24} /><h3 ref={receiptHeading} tabIndex={-1}>Denúncia registrada</h3><p>Protocolo: <strong>{receipt.id}</strong></p><p>{REPORT_STATUS[receipt.status]}</p></div> : <div className={styles.form}><LiquidLens radius={16} /><form className={styles.fields} aria-label="Denunciar um link" onSubmit={event => void submit(event)}>
      <Field label="Motivo"><Select name="reason" required defaultValue="" disabled={pending}>
        <option value="" disabled>Escolha um motivo</option>
        <optgroup label="Disponibilidade"><option value="EXPIRED_INVITE">Convite expirado</option><option value="UNAVAILABLE_DESTINATION">Destino indisponível</option></optgroup>
        <optgroup label="Conteúdo"><option value="SPAM">Spam</option><option value="INAPPROPRIATE_CONTENT">Conteúdo incompatível</option></optgroup>
      </Select></Field>
      <Field label="Comentário (opcional)" hint="Até 500 caracteres. Não inclua dados pessoais."><TextArea name="comment" maxLength={500} rows={4} disabled={pending} /></Field>
      {error ? <p ref={errorMessage} tabIndex={-1} role="alert">{error}</p> : null}
      <Button type="submit" loading={pending}><ActionIcon name="check" />Enviar denúncia</Button>
    </form></div>}
    <p className={styles.note}>A equipe analisará o relato. Denunciar não retira o link automaticamente. Relatos repetidos do mesmo motivo em 24 horas usam o mesmo protocolo.</p>
  </section>
}
