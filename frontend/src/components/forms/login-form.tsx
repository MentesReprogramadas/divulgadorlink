'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { writeSession } from '@/domain/session'
import { api } from '@/lib/api'

export function LoginForm() {
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = await api<{ role?: string; status?: string; canSubmit?: boolean; message?: string }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    })
    if (result.status !== 200 || !result.body.role) {
      setError(result.body.message ?? 'Credenciais inválidas.')
      return
    }
    writeSession({
      role: result.body.role,
      status: result.body.status ?? 'ACTIVE',
      canSubmit: Boolean(result.body.canSubmit),
    })
    window.location.assign('/painel')
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Senha">
        <Input name="password" type="password" autoComplete="current-password" minLength={8} required />
      </Field>
      {error ? <p role="alert">{error}</p> : null}
      <Button type="submit">Entrar</Button>
    </form>
  )
}
