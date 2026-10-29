'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/feedback/skeleton'
import { api } from '@/lib/api'
import styles from './affiliates.module.css'

export function SegmentJoin({ slug }: { slug: string }) {
  const [segment, setSegment] = useState<{ name: string; description: string; available: boolean; imageUrl?: string | null; joinMode?: 'REDIRECT' | 'SCREEN' } | null>(null), [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const lock = useRef(false), autoStarted = useRef(false)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await api<{ name: string; description: string; available: boolean; imageUrl?: string | null; joinMode?: 'REDIRECT' | 'SCREEN'; message?: string }>('/v1/public/affiliates/' + encodeURIComponent(slug), { headers: { 'x-workspace-owner': 'self' } }); if (result.status !== 200) throw new Error(result.body.message ?? 'Este convite está indisponível.'); setSegment(result.body) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o convite. Tente novamente.') }
    finally { setLoading(false) }
  }, [slug])
  useEffect(() => { void load() }, [load])
  const join = useCallback(async (automatic = false) => {
    if (lock.current) return
    lock.current = true; setPending(true); setError('')
    try {
      const result = await api<{ url: string; message?: string }>('/v1/public/affiliates/' + encodeURIComponent(slug) + '/join', { method: 'POST', body: '{}', headers: { 'x-workspace-owner': 'self' } })
      if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível encontrar um grupo agora. Tente novamente.')
      if (!URL.canParse(result.body.url)) throw new Error('O convite retornado não é válido. Tente novamente.')
      const url = new URL(result.body.url)
      if (url.protocol !== 'https:' || url.hostname !== 'chat.whatsapp.com' || url.username || url.password || url.port) throw new Error('O convite retornado não é válido. Tente novamente.')
      if (automatic) window.location.replace(url.href)
      else window.location.assign(url.href)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha de conexão. Tente novamente.'); lock.current = false; setPending(false) }
  }, [slug])
  useEffect(() => {
    if (!segment || segment.joinMode === 'SCREEN' || autoStarted.current) return
    autoStarted.current = true
    void join(true)
  }, [segment, join])
  if (segment && segment.joinMode !== 'SCREEN') return <main className={styles.join}><h1>Abrindo WhatsApp…</h1>{error ? <><p role="alert" className={styles.error}>{error}</p><Button loading={pending} onClick={() => void join(true)}>Tentar novamente</Button></> : <p role="status">Conferindo um grupo com vaga.</p>}</main>
  return <main className={styles.join}>{loading ? <><Skeleton height={176} /><Skeleton height={40} /></> : <>
    {segment ? <div className={styles.joinAvatar}>{segment.imageUrl && !imageFailed ? <img src={segment.imageUrl} alt="" width={176} height={176} onError={() => setImageFailed(true)} /> : <span aria-hidden="true">{segment.name.slice(0, 2).toLocaleUpperCase('pt-BR')}</span>}</div> : null}
    <h1 title={segment?.name}>{segment?.name ?? 'Convite indisponível'}</h1>
    {segment ? <Button loading={pending} onClick={() => void join()}>Entrar no grupo de WhatsApp</Button> : null}
  </>}{error ? <div className={styles.form}><p role="alert" className={styles.error}>{error}</p>{!segment ? <Button variant="secondary" loading={loading} onClick={() => void load()}>Tentar novamente</Button> : null}</div> : null}</main>
}
