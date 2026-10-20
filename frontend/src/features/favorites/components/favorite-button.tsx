'use client'
import {useReadOnly} from '@/components/ui/interaction-policy'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { readSession, SESSION_EVENT } from '@/domain/session'
import { ActionIcon } from '@/components/ui/action-icon'
import styles from './favorites.module.css'

export function FavoriteButton({ linkId }: { linkId: string }) {
 const readOnly=useReadOnly()
  const [saved, setSaved] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('')
  const busy = useRef(false)
  useEffect(() => {
    let live = true
    const read = () => { if (!readSession()) return; void api<{ saved: boolean }>('/v1/me/favorites/' + encodeURIComponent(linkId)).then(r => { if (live && r.status === 200) setSaved(r.body.saved) }).catch(() => {}) }
    read(); window.addEventListener(SESSION_EVENT, read)
    return () => { live = false; window.removeEventListener(SESSION_EVENT, read) }
  }, [linkId])
  async function toggle() {
    if (busy.current) return
    busy.current = true; setPending(true); setError('')
    try {
      const r = await api<{ saved: boolean; message?: string }>('/v1/me/favorites/' + encodeURIComponent(linkId), { method: saved ? 'DELETE' : 'PUT' })
      if (r.status === 401) { window.location.href = '/painel/favoritos'; return }
      if (r.status !== 200) throw new Error(r.body.message ?? 'Não foi possível salvar.')
      setSaved(r.body.saved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Sem conexão. Tente novamente.') }
    finally { busy.current = false; setPending(false) }
  }
  const label = saved ? 'Remover favorito' : 'Salvar favorito'
  return <div className={styles.save}><button type="button" className={styles.favorite} aria-label={label} title={label} aria-pressed={saved} disabled={pending||readOnly} onClick={() => void toggle()}><ActionIcon name="star" width={24} height={24} fill={saved ? '#f6c343' : 'none'} /></button>{error ? <p className={styles.saveError} role="alert">{error}</p> : null}</div>
}
