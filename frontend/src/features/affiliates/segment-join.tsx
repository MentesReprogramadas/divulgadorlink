'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/feedback/skeleton'
import { api } from '@/lib/api'
import styles from './affiliates.module.css'

export function SegmentJoin({ slug }: { slug: string }) {
  const [segment, setSegment] = useState<{ name: string; description: string; available: boolean } | null>(null), [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  const lock = useRef(false)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await api<{ name: string; description: string; available: boolean; message?: string }>('/v1/public/affiliates/' + encodeURIComponent(slug), { headers: { 'x-workspace-owner': 'self' } }); if (result.status !== 200) throw new Error(result.body.message ?? 'Este convite está indisponível.'); setSegment(result.body) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o convite. Tente novamente.') }
    finally { setLoading(false) }
  }, [slug])
  useEffect(() => { void load() }, [load])
  async function join() {
    if (lock.current) return
    lock.current = true; setPending(true); setError('')
    try {
      const result = await api<{ url: string; message?: string }>('/v1/public/affiliates/' + encodeURIComponent(slug) + '/join', { method: 'POST', body: '{}', headers: { 'x-workspace-owner': 'self' } })
      if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível encontrar um grupo agora. Tente novamente.')
      const url = new URL(result.body.url)
      if (url.protocol !== 'https:' || url.hostname !== 'chat.whatsapp.com' || url.username || url.password || url.port) throw new Error('O convite retornado não é válido. Tente novamente.')
      window.location.assign(url.href)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha de conexão. Tente novamente.'); lock.current = false; setPending(false) }
  }
  return <main className={styles.join}><p>Tem Link Aqui · Grupos de ofertas</p>{loading ? <><Skeleton height={40} /><Skeleton height={160} /></> : <><h1>{segment?.name ?? 'Convite indisponível'}</h1>{segment ? <section className={styles.joinPanel}><p>{segment.description}</p><p>Ao continuar, vamos conferir um grupo disponível no WhatsApp para esta seleção de ofertas.</p><Button loading={pending} onClick={() => void join()}>Entrar no grupo de WhatsApp</Button>{!segment.available ? <p>Não há disponibilidade confirmada na última consulta. Use o botão para conferir novamente.</p> : null}<p>Seu número e perfil poderão ser vistos pelos participantes do grupo. As ofertas podem conter links de afiliado.</p></section> : null}</>}{error ? <div className={styles.form}><p role="alert" className={styles.error}>{error}</p>{!segment ? <Button variant="secondary" loading={loading} onClick={() => void load()}>Tentar novamente</Button> : null}</div> : null}</main>
}
