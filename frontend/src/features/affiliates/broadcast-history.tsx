'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/feedback/skeleton'
import { formatCents } from '@/domain/money'
import { affiliateRequest, localDate, type AffiliateBroadcast, type BroadcastPage } from './contracts'
import { ProductImage } from './product-image'
import styles from './affiliates.module.css'
import discoveryStyles from './discovery.module.css'

export function BroadcastHistory({ segmentId, busy, revision = 0, onCancel }: {segmentId?: string | null; busy: boolean; revision?: number; onCancel: (broadcast: AffiliateBroadcast, element: HTMLElement) => void}) {
  const [data, setData] = useState<BroadcastPage | null>(null), [cursors, setCursors] = useState<Array<string | null>>([null]), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const request = useRef(0)
  const cursor = cursors.at(-1)
  useEffect(() => {
    const version = ++request.current, controller = new AbortController()
    setLoading(true); setError('')
    const query = new URLSearchParams({limit:'12', ...(segmentId ? {segmentId} : {}), ...(cursor ? {cursor} : {})})
    void affiliateRequest<BroadcastPage>('/broadcasts?' + query, 'GET', undefined, controller.signal).then(result => { if (request.current === version && !controller.signal.aborted) setData(result) }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Não foi possível consultar os envios.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [segmentId, cursor, revision])
  return <section className={discoveryStyles.panel} aria-label="Envios paginados"><header><div><h2>Envios</h2><p>Cada envio reúne o produto e o resultado dos seus grupos. Resultados incertos exigem conferência.</p></div></header>{error ? <p role="alert" className={styles.error}>{error}</p> : null}{loading ? <Skeleton height={140} /> : null}{!loading && data && !data.broadcasts.length ? <p className={styles.empty}>Nenhum envio nesta seleção. Revise uma oferta e confirme Enviar para começar.</p> : null}<div aria-busy={loading}>{data?.broadcasts.map(broadcast => {
    const counts = broadcast.counts
    const total = Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0)
    return <article className={discoveryStyles.broadcast} key={broadcast.id}><ProductImage src={broadcast.imageUrl ?? null} title={broadcast.offer?.title ?? 'Oferta'} /><div className={discoveryStyles.productBody}><h3>{broadcast.offer?.title ?? 'Oferta da operação'}</h3>{broadcast.offer?.priceCents !== null && broadcast.offer?.priceCents !== undefined ? <p className={styles.price}>{formatCents(broadcast.offer.priceCents)}</p> : <p className={styles.muted}>Confira o preço na mensagem enviada</p>}<p>{broadcast.segment?.name ?? broadcast.offer?.segment?.name ?? 'Segmentação'} · {localDate(broadcast.createdAt)}</p><p>{total} grupos · {counts.sent} enviados · {counts.pending + counts.sending} em andamento</p><p className={counts.uncertain ? styles.warning : styles.muted}>{counts.uncertain} precisam de conferência · {counts.failed} falhas{counts.cancelled ? ` · ${counts.cancelled} cancelados` : ''}</p><details className={discoveryStyles.evidence}><summary>Detalhes do envio</summary><p>Programado para {localDate(broadcast.scheduledAt)}</p><pre className={styles.preview}>{broadcast.message}</pre>{broadcast.offer?.affiliateUrl ? <a href={broadcast.offer.affiliateUrl} target="_blank" rel="noopener noreferrer">Abrir oferta</a> : null}<p className={styles.muted}>Os comprovantes e a conferência individual ficam em Entregas por grupo, abaixo.</p>{counts.pending ? <Button variant="secondary" disabled={busy} onClick={event => onCancel(broadcast, event.currentTarget)}>Cancelar entregas pendentes</Button> : null}</details></div></article>
  })}</div>{data ? <nav className={discoveryStyles.pagination} aria-label="Páginas de envios"><Button variant="secondary" disabled={loading || cursors.length === 1} onClick={() => setCursors(value => value.slice(0, -1))}>Anterior</Button><span>Página {cursors.length} · {data.totalCount} envios</span><Button variant="secondary" disabled={loading || !data.nextCursor} onClick={() => setCursors(value => [...value, data.nextCursor])}>Próxima</Button></nav> : null}</section>
}
