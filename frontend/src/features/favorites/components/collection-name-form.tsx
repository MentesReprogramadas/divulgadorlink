'use client'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import styles from './favorites.module.css'

export function CollectionNameForm({ initialName = '', onSave }: { initialName?: string; onSave: (input: { id: string; name: string }) => Promise<void> }) {
  const [name, setName] = useState(initialName), [error, setError] = useState(''), [pending, setPending] = useState(false)
  const busy = useRef(false), identity = useRef<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy.current) return
    busy.current = true; setPending(true); setError(''); identity.current ??= crypto.randomUUID()
    try { await onSave({ id: identity.current, name }); identity.current = null; if (!initialName) setName('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.') }
    finally { busy.current = false; setPending(false) }
  }
  return <div className={styles.formFrame}><form aria-label={initialName ? 'Renomear coleção' : 'Nova coleção'} className={styles.form} onSubmit={submit}>
    <Field label="Nome da coleção" hint="Só você pode ver esta coleção." error={error}><Input required maxLength={80} value={name} disabled={pending} onChange={e => setName(e.target.value)} /></Field>
    <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : initialName ? 'Salvar nome' : 'Criar coleção'}</Button>
  </form></div>
}
