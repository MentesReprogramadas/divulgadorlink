'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAreaSession } from '@/components/domain/panel'
import { CodeBoxes } from '@/components/domain/code-boxes'
import { Button } from '@/components/ui/button'
import { pushNotice, readSession, writeSession } from '@/domain/session'
import { api, currentSession } from '@/lib/api'

type ConfirmBody = {
  message?: string
  confirmed?: boolean
  canSubmitLink?: boolean
  retryAfter?: number
}

export default function Page() {
  const router = useRouter()
  const session = useAreaSession()
  const [phase, setPhase] = useState<'loading' | 'send' | 'code' | 'done'>(session?.canSubmit ? 'done' : 'loading')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)
  const trimmed = code.replace(/\D/g, '').slice(0, 6)

  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = window.setTimeout(() => setRetryAfter((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [retryAfter])

  useEffect(() => {
    if (session?.canSubmit) return
    void api<ConfirmBody>('/v1/auth/confirm?kind=EMAIL').then((result) => {
      if (result.status === 200 && (result.body.confirmed || result.body.canSubmitLink)) {
        remember(true)
        setPhase('done')
        return
      }
      const wait = result.body.retryAfter ?? 0
      setRetryAfter(wait)
      setPhase(wait > 0 ? 'code' : 'send')
    })
  }, [session?.canSubmit])

  function remember(canSubmit: boolean) {
    const current = readSession()
    if (current) writeSession({ ...current, canSubmit })
    else void currentSession()
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (phase === 'code' && trimmed.length < 6) return
    setSending(true)
    setMessage('')
    const result = await api<ConfirmBody>('/v1/auth/confirm', {
      method: 'POST',
      body: JSON.stringify(phase === 'code' ? { kind: 'EMAIL', code: trimmed } : { kind: 'EMAIL', resend: true }),
    })
    setSending(false)
    if (result.status === 429) {
      setRetryAfter(result.body.retryAfter ?? 60)
      setPhase('code')
      setMessage(result.body.message ?? 'Aguarde para reenviar o código.')
      return
    }
    if (result.status === 200 && phase !== 'code') {
      setPhase('code')
      setRetryAfter(result.body.retryAfter ?? 60)
      setMessage('Enviamos o código para o seu e-mail.')
      return
    }
    if (result.status === 200 && result.body.confirmed) {
      remember(result.body.canSubmitLink === true)
      pushNotice('E-mail confirmado.')
      router.push('/painel')
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
    if (result.status === 200) {
      setCode('')
      setRetryAfter(result.body.retryAfter ?? 60)
      setMessage('Enviamos outro código para o seu e-mail.')
      return
    }
    setRetryAfter(result.body.retryAfter ?? 0)
    setMessage(result.body.message ?? 'Não foi possível reenviar.')
  }

  return (
    <div className="auth-page">
      <a className="panel-back" href="/painel" aria-label="Voltar para o painel">
        <span aria-hidden="true">←</span>
        Painel
      </a>
      <h1 className="entry-title">Verificar</h1>
      {phase === 'done' ? (
        <p role="status">{message || 'E-mail confirmado.'}</p>
      ) : (
        <>
          <p className="auth-lead">
            {phase === 'code' ? 'Digite o código que chegou no e-mail. Olhe também o spam.' : 'O código chega no e-mail da conta. Olhe também o spam.'}
          </p>
          {phase === 'loading' ? <p role="status">Carregando</p> : null}
          {phase === 'send' || phase === 'code' ? (
            <form className="auth-form" onSubmit={(event) => void submit(event)}>
              {phase === 'code' ? <CodeBoxes value={trimmed} onChange={setCode} disabled={sending} /> : null}
              <Button type="submit" disabled={sending || (phase === 'code' && trimmed.length < 6)}>
                {phase === 'code' ? 'Confirmar e-mail' : 'Enviar código'}
              </Button>
              {phase === 'code' ? (
                <Button type="button" variant="secondary" disabled={sending || retryAfter > 0} onClick={() => void resend()}>
                  {retryAfter > 0 ? `Reenviar em ${retryAfter}s` : 'Reenviar código'}
                </Button>
              ) : null}
            </form>
          ) : null}
          {message ? <p role="status">{message}</p> : null}
        </>
      )}
    </div>
  )
}
