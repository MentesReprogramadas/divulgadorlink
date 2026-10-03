'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { api } from '@/lib/api'

export default function Page() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = await api<{ message?: string }>('/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: data.get('email') }),
    })
    if (result.status === 429) {
      setError(result.body.message ?? 'Muitas tentativas.')
      setMessage('')
      return
    }
    if (result.status !== 200) {
      setError(result.body.message ?? 'Não foi possível enviar.')
      setMessage('')
      return
    }
    setError('')
    setMessage('Se existir uma conta com esse e-mail, enviamos o link para criar outra senha.')
  }

  return (
    <main className="auth-page">
      <h1 className="entry-title">Esqueci a senha</h1>
      <p className="auth-lead">O link vale por 30 minutos e só funciona uma vez.</p>
      <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        <Button type="submit">Enviar link</Button>
      </form>
      <p className="auth-switch"><a href="/login">Entrar</a></p>
    </main>
  )
}
