'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { clearSession } from '@/domain/session'
import { Button } from '@/components/ui/button'
import styles from './support-banner.module.css'

export function SupportBanner() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    void api<{ support?: { name: string; expiresAt: number } }>('/v1/auth/session').then(result => {
      if (!active) return
      if (result.status !== 200 || !result.body.support) { setExpired(true); return }
      setName(result.body.support.name)
      timer = setTimeout(() => setExpired(true), Math.max(0, result.body.support.expiresAt - Date.now()))
    }).catch(() => { if (active) setExpired(true) })
    return () => { active = false; clearTimeout(timer) }
  }, [])
  async function exit() {
    setBusy(true)
    setError('')
    try {
      const result = await api('/v1/support/exit', { method: 'POST' })
      if (result.status !== 200) throw new Error()
      clearSession(true)
      // Full navigation also discards all module-level caches of the viewed user.
      window.location.assign('/admin/visao?suporte=retorno')
    } catch {
      setError('Não foi possível sair. Tente novamente.')
      setBusy(false)
    }
  }
  return <aside className={styles.banner} aria-label="Modo de suporte">
    <div className={styles.inner}>
      <p><strong>Modo de suporte{name ? ` · ${name}` : ''}</strong><span>{expired ? 'Sessão indisponível ou expirada. Saia para voltar ao admin.' : 'Somente leitura · até 15 minutos'}</span></p>
      <Button variant="secondary" disabled={busy} onClick={() => void exit()}>{busy ? 'Saindo…' : 'Sair do suporte'}</Button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </aside>
}
