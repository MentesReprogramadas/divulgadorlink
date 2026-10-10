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
  destination?: string
}

function remember(canSubmit: boolean) {
  const current = readSession()
  if (current) writeSession({ ...current, canSubmit })
}

function goToForm() {
  remember(true)
  window.location.replace('/painel/links/novo')
}

function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return ''
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const hidden = Math.min(8, Math.max(1, local.length - 1))
  return `${local[0]}${'•'.repeat(hidden)}@${domain}`
}

export default function Page() {
  const session = useAreaSession()
  const [phase, setPhase] = useState<'loading' | 'code' | 'change'>('loading')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const trimmed = code.replace(/\D/g, '').slice(0, 6)
  const masked = maskEmail(address)

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
      if (status.body.destination) setAddress(status.body.destination)
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
    setAddress(email.trim().toLowerCase())
    setPhase('code')
    setRetryAfter(60)
    setMessage('Enviamos o código para o novo e-mail.')
  }

  function openChange() {
    if (sending) return
    setMessage('')
    setPhase('change')
  }

  function backToCode() {
    if (sending) return
    setMessage('')
    setEmail('')
    setPhase('code')
  }

  async function logout() {
    await api('/v1/auth/logout', { method: 'POST' })
    clearSession()
    window.location.href = '/painel'
  }

  return (
    <main className="auth-page">
      <h1 className="entry-title">{phase === 'change' ? 'Trocar e-mail' : 'Confirme o e-mail'}</h1>
      <p className="auth-lead">
        {phase === 'change'
          ? 'O código vai para o endereço novo. Até enviar, o código atual continua valendo.'
          : 'O código chega no e-mail da conta. Depois disso o formulário de publicar abre direto.'}
      </p>
      {phase === 'loading' ? <p role="status">Carregando</p> : null}
      {phase === 'code' ? (
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <p className="verify-target">
            {masked ? <>Código enviado para <strong>{masked}</strong></> : null}
            <button type="button" className="quiet-button" onClick={openChange}>Trocar e-mail</button>
          </p>
          <CodeBoxes value={trimmed} onChange={setCode} disabled={sending} />
          <Button type="submit" disabled={sending || trimmed.length < 6}>Confirmar e-mail</Button>
          <Button type="button" variant="secondary" disabled={sending || retryAfter > 0} onClick={() => void resend()}>
            {retryAfter > 0 ? `Reenviar em ${retryAfter}s` : 'Reenviar código'}
          </Button>
        </form>
      ) : null}
      {phase === 'change' ? (
        <form className="auth-form" onSubmit={(event) => void changeEmail(event)}>
          <Field label="Novo e-mail">
            <Input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Button type="submit" disabled={sending || !email.trim()}>Enviar código</Button>
          <p className="auth-switch">
            <button type="button" className="quiet-button" onClick={backToCode}>Voltar para a verificação</button>
          </p>
        </form>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <p className="auth-switch"><button type="button" className="quiet-button" onClick={() => void logout()}>Sair</button></p>
    </main>
  )
}
