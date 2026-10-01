'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { writeSession } from '@/domain/session'
import { api } from '@/lib/api'

export function LoginForm() {
  const router = useRouter()
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
    router.push('/painel')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit}>
      <label>E-mail<Input name="email" type="email" required /></label>
      <label>Senha<Input name="password" type="password" minLength={8} required /></label>
      {error ? <p role="alert">{error}</p> : null}
      <Button type="submit">Entrar</Button>
    </form>
  )
}
