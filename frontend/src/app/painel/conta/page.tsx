'use client'

import { ActionIcon } from '@/components/ui/action-icon'

import { useState } from 'react'
import { useAreaSession } from '@/components/domain/panel'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { clearSession } from '@/domain/session'
import { api } from '@/lib/api'
import {LiquidLens} from '@/components/ui/liquid-lens'
import styles from '@/components/forms/public-account.module.css'

export default function Page() {
  const session = useAreaSession()
  if (!session) return null
  return <Account session={session} />
}

function Account({ session }: { session: { status: string; role: string; canSubmit: boolean } }) {
  const banned = session.status === 'BANNED'
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState<'email' | 'phone' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function removeAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setDeleting(true)
    const result = await api<{ message?: string }>('/v1/auth/account/delete', {
      method: 'POST',
      body: JSON.stringify({ password: data.get('password') }),
    })
    setDeleting(false)
    if (result.status !== 200) {
      setDeleteError(result.body.message ?? 'Não foi possível excluir a conta.')
      return
    }
    clearSession()
    window.location.href = '/login'
  }

  async function changeIdentifier(event: React.FormEvent<HTMLFormElement>, kind: 'email' | 'phone') {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = kind === 'email' ? 'email' : 'phone'
    setSaving(kind)
    const result = await api<{ message?: string }>(`/v1/links/account/${kind}`, {
      method: 'POST',
      body: JSON.stringify({ [field]: data.get(field) }),
    })
    setSaving(null)
    setNote(result.status === 200
      ? 'Confirme o novo identificador para voltar a enviar. Os links publicados continuam no ar.'
      : (result.body.message ?? 'Não foi possível alterar o identificador.'))
  }

  return (
    <>


        {banned ? <p className="panel-empty">E-mail, telefone e o texto dos links não podem ser alterados.</p> : null}
        {note ? <p className="panel-note" role="status">{note}</p> : null}
        {!banned ? (
          <div className="account-grid">
            <form method="post" className={`auth-form ${styles.form}`} onSubmit={(event) => void changeIdentifier(event, 'email')}><LiquidLens radius={16}/>
              <Field label="Novo e-mail">
                <Input name="email" type="email" autoComplete="email" aria-label="Novo e-mail" />
              </Field>
              <Button type="submit" variant="secondary" disabled={saving === 'email'}><ActionIcon name="edit" />Trocar e-mail</Button>
            </form>
            <form method="post" className={`auth-form ${styles.form}`} onSubmit={(event) => void changeIdentifier(event, 'phone')}><LiquidLens radius={16}/>
              <Field label="Novo telefone">
                <Input name="phone" type="tel" autoComplete="tel" aria-label="Novo telefone" />
              </Field>
              <Button type="submit" variant="secondary" disabled={saving === 'phone'}><ActionIcon name="edit" />Trocar telefone</Button>
            </form>
          </div>
        ) : null}
        <form method="post" className={`auth-form ${styles.form}`} onSubmit={(event) => void removeAccount(event)}><LiquidLens radius={16}/>
          <h3>Excluir conta</h3>
          <p className="page-header-note">O e-mail e o telefone saem da conta. Esta senha deixa de entrar.</p>
          <Field label="Senha atual">
            <Input name="password" type="password" autoComplete="current-password" minLength={8} required />
          </Field>
          {deleteError ? <p role="alert">{deleteError}</p> : null}
          <Button type="submit" variant="danger" disabled={deleting}><ActionIcon name="trash" />Excluir conta</Button>
        </form>
    </>
  )
}
