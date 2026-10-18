'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { clearSession } from '@/domain/session'

export const SUPPORT_RETURN_KEY = 'temlink.support.return'
export function SupportEntry({ userId, name, query }: { userId: string; name: string; query: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function enter() {
    setBusy(true)
    setError('')
    try {
      // Store before creating the session so storage failure cannot strand the admin.
      sessionStorage.setItem(SUPPORT_RETURN_KEY, JSON.stringify({ query, userId, scrollY: window.scrollY }))
      const result = await api(`/v1/admin/users/${encodeURIComponent(userId)}/support`, { method: 'POST' })
      if (result.status !== 200) throw new Error()
      clearSession(true)
      window.location.assign('/painel')
    } catch {
      setError('Não foi possível abrir o suporte. Tente novamente.')
      setBusy(false)
    }
  }
  return <><Button variant="secondary" disabled={busy} aria-label={`${busy ? 'Abrindo…' : 'Detalhes / suporte'} de ${name}`} onClick={() => void enter()}>{busy ? 'Abrindo…' : 'Detalhes / suporte'}</Button>{error ? <p role="alert">{error}</p> : null}</>
}
