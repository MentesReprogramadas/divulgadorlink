'use client'

import { ActionIcon } from '@/components/ui/action-icon'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import styles from './availability.module.css'

export function UrlCorrectionForm({ onSubmit }: { onSubmit: (canonicalUrl: string) => Promise<void> }) {
  const [pending, setPending] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('')
  const running = useRef(false), heading = useRef<HTMLHeadingElement>(null), alert = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (done) heading.current?.focus(); else if (error) alert.current?.focus() }, [done, error])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (running.current) return
    const url = String(new FormData(event.currentTarget).get('canonicalUrl') ?? '').trim()
    running.current = true; setPending(true); setError('')
    try { await onSubmit(url); setDone(true) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível enviar. Seu endereço foi mantido.') }
    finally { running.current = false; setPending(false) }
  }
  return <div className={styles.formWidth}>
    {done ? <div role="status"><h3 ref={heading} tabIndex={-1}>Correção enviada para análise</h3><p>A URL atual será substituída após a aprovação. O saldo pago continua pausado.</p></div> : <form className={styles.fields} aria-label="Corrigir convite" onSubmit={event => void submit(event)}>
      <Field label="Convite para análise" hint="Use HTTPS e a mesma rede. Se o convite atual voltou a funcionar, pode reenviá-lo."><Input type="url" name="canonicalUrl" required maxLength={2048} disabled={pending} autoComplete="off" /></Field>
      <p className={styles.note}>A equipe precisa aprovar a correção antes de republicar e retomar o saldo dos destaques.</p>
      {error ? <p role="alert" ref={alert} tabIndex={-1}>{error}</p> : null}
      <Button type="submit" loading={pending}><ActionIcon name="check" />Enviar correção</Button>
    </form>}
  </div>
}
