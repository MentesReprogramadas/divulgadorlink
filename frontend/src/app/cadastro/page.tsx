'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { writeSession } from '@/domain/session'
import { api } from '@/lib/api'

export default function Page() {
  const [created, setCreated] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const result = await api<{ role?: string; user?: { status: string; canSubmitLink: boolean }; message?: string }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: data.get('name'),
        email: data.get('email'),
        phone: data.get('phone'),
        password: data.get('password'),
      }),
    })
    if (result.status !== 201 || !result.body.role) {
      setError(result.body.message ?? 'Não foi possível criar a conta.')
      return
    }
    writeSession({
      role: result.body.role,
      status: result.body.user?.status ?? 'ACTIVE',
      canSubmit: Boolean(result.body.user?.canSubmitLink),
    })
    setCreated(true)
  }

  return (
    <main>
      <h1>Criar conta</h1>
      {created ? <p>Confirme o e-mail e o telefone para enviar um link</p> : (
        <form onSubmit={onSubmit}>
          <label>Nome<Input name="name" required /></label>
          <label>E-mail<Input name="email" type="email" required /></label>
          <label>Telefone<Input name="phone" required /></label>
          <label>Senha<Input name="password" type="password" minLength={8} required /></label>
          {error ? <p role="alert">{error}</p> : null}
          <Button type="submit">Criar conta</Button>
        </form>
      )}
    </main>
  )
}
