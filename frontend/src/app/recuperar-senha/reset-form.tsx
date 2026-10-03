'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { api } from '@/lib/api'

export function ResetForm({ token }: { token: string }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
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
  }

  if (!token) {
    return <p role="alert">Link inválido. Peça outro.</p>
  }

  return (
    <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
      <Field label="Nova senha">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {message ? <p className="auth-switch"><a href="/login">Entrar</a></p> : <Button type="submit">Salvar senha</Button>}
    </form>
  )
}
