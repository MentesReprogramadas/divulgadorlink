'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import {LiquidLens} from '@/components/ui/liquid-lens'
import styles from '@/components/forms/public-account.module.css'

export function ResetForm({ token }: { token: string }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = await api<{ message?: string }>('/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: data.get('password') }),
      })
      if (result.status !== 200) {
        setError(result.body.message ?? 'Link inválido ou vencido.')
        setMessage('')
        return
      }
      setError('')
      setMessage('Senha salva.')
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.')
      setMessage('')
    } finally {
      setPending(false)
    }
  }

  if (!token) {
    return <div role="alert"><p>Link inválido. Peça outro.</p><a href="/esqueci-senha">Pedir um novo link</a></div>
  }

  return (
    <form method="post" className={`auth-form ${styles.form}`} onSubmit={(event) => void onSubmit(event)}><LiquidLens radius={16}/>
      <Field label="Nova senha">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {message ? <p className="auth-switch"><a href="/login">Entrar</a></p> : <Button type="submit" loading={pending}>Salvar senha</Button>}
    </form>
  )
}
