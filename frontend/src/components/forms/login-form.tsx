'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { afterAuth } from '@/domain/panel-gate'
import { writeSession } from '@/domain/session'
import { api } from '@/lib/api'

export function LoginForm({ returnTo }: { returnTo?: string } = {}) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = await api<{ role?: string; status?: string; canSubmit?: boolean; banReason?: string; message?: string }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })
      if (result.status !== 200 || !result.body.role) {
        setError(result.body.message ?? 'Credenciais inválidas.')
        return
      }
      const status = result.body.status ?? 'ACTIVE'
      const reason = result.body.banReason?.trim()
      writeSession({
        role: result.body.role,
        status,
        canSubmit: Boolean(result.body.canSubmit),
        ...(reason ? { banReason: reason } : {}),
      })
      window.location.assign(afterAuth(Boolean(result.body.canSubmit), status, returnTo))
    } catch {
      setError('Não foi possível conectar. Verifique sua conexão e tente novamente.')
    } finally {
      setPending(false)
    }
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
      <Button type="submit" loading={pending}>Entrar</Button>
    </form>
  )
}
