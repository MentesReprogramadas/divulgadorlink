'use client'
import {useReadOnly} from '@/components/ui/interaction-policy'

import { ActionIcon } from '@/components/ui/action-icon'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import styles from './renewal-reminders.module.css'

export function ReminderPreferenceForm({ enabled, onSave }: { enabled: boolean; onSave: (value: boolean) => Promise<void> }) {
 const readOnly=useReadOnly()
  const [value, setValue] = useState(enabled), [pending, setPending] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false)
  const busy = useRef(false), confirmation = useRef<HTMLParagraphElement>(null)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy.current) return
    busy.current = true; setPending(true); setError(''); setSaved(false)
    try { await onSave(value); setSaved(true); requestAnimationFrame(() => confirmation.current?.focus()) }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.') }
    finally { busy.current = false; setPending(false) }
  }
  return <div className={styles.preference}><form aria-label="Preferência de lembretes" onSubmit={submit}>
    <label className={styles.check}><input type="checkbox" checked={value} disabled={pending||readOnly} onChange={event => { setValue(event.target.checked); setSaved(false) }} aria-describedby="renewal-email-hint" />Receber lembretes por e-mail</label>
    <p id="renewal-email-hint" className={styles.note}>Um aviso por destaque e vencimento, nos três dias anteriores ao fim. Você pode desligar quando quiser.</p>
    <Button type="submit" disabled={pending||readOnly}><ActionIcon name="save" />{pending ? 'Salvando…' : 'Salvar preferência'}</Button>
    {error ? <p role="alert">{error}</p> : null}
    {saved ? <p role="status" tabIndex={-1} ref={confirmation}>Preferência salva.</p> : null}
  </form></div>
}
