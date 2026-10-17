'use client'

import { useState } from 'react'
import { clearSession } from '@/domain/session'
import { api } from '@/lib/api'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './logout-button.module.css'

export function LogoutButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function logout() {
    if (pending) return
    setPending(true)
    setError(false)
    try {
      const result = await api('/v1/auth/logout', { method: 'POST' })
      if (result.status >= 400 && result.status !== 401) throw new Error('logout')
      clearSession()
      window.location.href = '/painel'
    } catch {
      setError(true)
      setPending(false)
    }
  }

  return <div className={styles.action}>
    <button type="button" className={styles.button} disabled={pending} aria-busy={pending || undefined} onClick={() => void logout()}>
      <ActionIcon name="logout" />Sair
    </button>
    {error ? <span role="alert" className={styles.error}>Não foi possível sair. Tente novamente.</span> : null}
  </div>
}
