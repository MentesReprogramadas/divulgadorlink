'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { writeSession } from '@/domain/session'
import { api } from '@/lib/api'

export default function Page() {
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
    window.location.assign('/painel')
  }

  return (
    <main className="auth-page">
      <h1 className="entry-title">Criar conta</h1>
      <p className="auth-lead">O e-mail precisa ser confirmado antes de enviar um link.</p>
      <form className="auth-form form-grid" onSubmit={onSubmit}>
        <Field label="Nome"><Input name="name" autoComplete="name" required /></Field>
        <Field label="E-mail"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Telefone"><Input name="phone" autoComplete="tel" required /></Field>
        <Field label="Senha"><Input name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
        {error ? <p role="alert">{error}</p> : null}
        <p>Ao criar a conta você concorda com os <a href="/termos">Termos</a> e a <a href="/privacidade">Privacidade</a>.</p>
        <Button type="submit">Criar conta</Button>
      </form>
      <p className="auth-switch">Já tem conta? <a href="/login">Entrar</a></p>
    </main>
  )
}
