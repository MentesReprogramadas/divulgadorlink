'use client'

import { useEffect, useState } from 'react'
import { useAreaSession } from '@/components/domain/panel'
import { CodeBoxes } from '@/components/domain/code-boxes'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { clearSession, readSession, writeSession } from '@/domain/session'
import { api } from '@/lib/api'

type ConfirmBody = {
  message?: string
  confirmed?: boolean
  canSubmitLink?: boolean
  retryAfter?: number
}

function remember(canSubmit: boolean) {
  const current = readSession()
  if (current) writeSession({ ...current, canSubmit })
}

function goToForm() {
  remember(true)
  window.location.replace('/painel/links/novo')
}

export default function Page() {
  const session = useAreaSession()
  const [phase, setPhase] = useState<'loading' | 'code'>('loading')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)
  const [email, setEmail] = useState('')
  const trimmed = code.replace(/\D/g, '').slice(0, 6)

  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = window.setTimeout(() => setRetryAfter((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [retryAfter])

  useEffect(() => {
    if (!session) return
    if (session.canSubmit) {
      goToForm()
      return
    }
    let cancelled = false
    void (async () => {
      const status = await api<ConfirmBody>('/v1/auth/confirm?kind=EMAIL')
      if (cancelled) return
      if (status.status === 200 && (status.body.confirmed || status.body.canSubmitLink)) {
        goToForm()
        return
      }
      const wait = status.body.retryAfter ?? 0
      if (wait > 0) {
        setRetryAfter(wait)
        setPhase('code')
        setMessage('O código já foi enviado para o seu e-mail. Olhe também o spam.')
        return
      }
      const sent = await api<ConfirmBody>('/v1/auth/confirm', {
        method: 'POST',
        body: JSON.stringify({ kind: 'EMAIL', resend: true }),
      })
      if (cancelled) return
      setPhase('code')
      setRetryAfter(sent.body.retryAfter ?? 60)
      setMessage(sent.status === 200
        ? 'Enviamos o código para o seu e-mail. Olhe também o spam.'
        : (sent.body.message ?? 'Não foi possível enviar o código.'))
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (trimmed.length < 6 || sending) return
    setSending(true)
    setMessage('')
    const result = await api<ConfirmBody>('/v1/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({ kind: 'EMAIL', code: trimmed }),
    })
    setSending(false)
    if (result.status === 200 && result.body.confirmed) {
      goToForm()
      return
    }
    setMessage(result.body.message ?? 'Código inválido.')
  }

  async function resend() {
    if (sending || retryAfter > 0) return
    setSending(true)
    setMessage('')
    const result = await api<ConfirmBody>('/v1/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({ kind: 'EMAIL', resend: true }),
    })
    setSending(false)
    setCode('')
    setRetryAfter(result.body.retryAfter ?? 0)
    setMessage(result.status === 200
      ? 'Enviamos outro código para o seu e-mail.'
      : (result.body.message ?? 'Não foi possível reenviar.'))
  }

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending || !email.trim()) return
    setSending(true)
    setMessage('')
    const result = await api<ConfirmBody>('/v1/links/account/email', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    })
    setSending(false)
    if (result.status !== 200) {
      setMessage(result.body.message ?? 'Não foi possível trocar o e-mail.')
      return
    }
    setCode('')
    setEmail('')
    setPhase('code')
    setRetryAfter(60)
    setMessage('Enviamos o código para o novo e-mail.')
  }

  async function logout() {
    await api('/v1/auth/logout', { method: 'POST' })
    clearSession()
    window.location.href = '/painel'
  }

  return (
    <main className="auth-page">
      <h1 className="entry-title">Confirme o e-mail</h1>
      <p className="auth-lead">O código chega no e-mail da conta. Depois disso o formulário de publicar abre direto.</p>
      {phase === 'loading' ? <p role="status">Carregando</p> : null}
      {phase === 'code' ? (
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <CodeBoxes value={trimmed} onChange={setCode} disabled={sending} />
          <Button type="submit" disabled={sending || trimmed.length < 6}>Confirmar e-mail</Button>
          <Button type="button" variant="secondary" disabled={sending || retryAfter > 0} onClick={() => void resend()}>
            {retryAfter > 0 ? `Reenviar em ${retryAfter}s` : 'Reenviar código'}
          </Button>
        </form>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <form className="auth-form" onSubmit={(event) => void changeEmail(event)}>
        <Field label="O e-mail está errado">
          <Input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Button type="submit" variant="secondary" disabled={sending}>Trocar e-mail</Button>
      </form>
      <p className="auth-switch"><button type="button" className="quiet-button" onClick={() => void logout()}>Sair</button></p>
    </main>
  )
}
