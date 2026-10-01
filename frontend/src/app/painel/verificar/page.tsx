'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { readSession, writeSession } from '@/domain/session'
import { api } from '@/lib/api'

export default function Page() {
  const [message, setMessage] = useState('')

  async function confirm(kind: 'EMAIL' | 'PHONE', code: string) {
    const result = await api<{ message?: string; canSubmitLink?: boolean }>('/v1/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({ kind, code }),
    })
    if (result.status === 200 && result.body.canSubmitLink) {
      const current = readSession()
      if (current) writeSession({ ...current, canSubmit: true })
    }
    setMessage(result.status === 200 ? 'Confirmado' : (result.body.message ?? 'Código inválido.'))
  }

  return (
    <main>
      <h1>Verificar</h1>
      <form onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        void confirm('EMAIL', String(data.get('emailCode')))
      }}>
        <label>Código do e-mail<Input name="emailCode" /></label>
        <Button type="submit">Confirmar e-mail</Button>
      </form>
      <form onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        void confirm('PHONE', String(data.get('phoneCode')))
      }}>
        <label>Código do telefone<Input name="phoneCode" /></label>
        <Button type="submit">Confirmar telefone</Button>
      </form>
      {message ? <p>{message}</p> : null}
    </main>
  )
}
