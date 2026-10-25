'use client'

import { ActionIcon } from '@/components/ui/action-icon'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, TextArea } from '@/components/ui/input'
import { api } from '@/lib/api'
import {LiquidLens} from '@/components/ui/liquid-lens'
import styles from '@/components/forms/public-account.module.css'

export default function Page() {
  const params = useParams<{ id: string }>()
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = await api(`/v1/links/${params.id}/appeal`, {
        method: 'POST',
        body: JSON.stringify({ text: data.get('text') }),
      })
      if (result.status === 200 || result.status === 201) setDone(true)
      else setError('Não foi possível enviar a contestação. Revise o link e tente novamente.')
    } catch {
      setError('Não foi possível conectar. Seu texto foi mantido; tente novamente.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <h2 className="panel-section-title">Contestar</h2>
      <p className="panel-section-description">Explique o motivo da revisão. O envio de uma contestação não altera a publicação automaticamente.</p>
      {done ? <p role="status">Em revisão</p> : (
        <form className={`auth-form ${styles.form}`} onSubmit={onSubmit}><LiquidLens radius={16}/>
          <Field label="Explique o que aconteceu"><TextArea name="text" required /></Field>
          {error ? <p role="alert">{error}</p> : null}
          <Button type="submit" loading={pending}><ActionIcon name="check" />Enviar contestação</Button>
        </form>
      )}
    </>
  )
}
