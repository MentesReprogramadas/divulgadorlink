'use client'

import { useEffect, useRef, useState } from 'react'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { formatCents } from '@/domain/money'
import { affiliateRequest, productProvider, type BroadcastCounts, type CatalogProduct, type ProductPreview } from './contracts'
import { ProductImage } from './product-image'
import styles from './affiliates.module.css'
import discoveryStyles from './discovery.module.css'

export function ProductPreviewDialog({ segmentId, product, onClose, onChanged, returnFocusTo }: {segmentId: string; product: CatalogProduct; onClose: () => void; onChanged: () => void; returnFocusTo: HTMLElement | null}) {
  const [preview, setPreview] = useState<ProductPreview | null>(null), [error, setError] = useState(''), [working, setWorking] = useState(false), [regenerating, setRegenerating] = useState(false), [broadcastId, setBroadcastId] = useState<string | null>(null), [counts, setCounts] = useState<BroadcastCounts | null>(null), [now, setNow] = useState(Date.now())
  const lock = useRef(false), mounted = useRef(true), previewRequest = useRef<AbortController | null>(null)
  const base = '/segments/' + encodeURIComponent(segmentId) + '/products'
  useEffect(() => {
    const controller = new AbortController(); mounted.current = true; previewRequest.current = controller
    setPreview(null); setError(''); setRegenerating(false); setBroadcastId(null); setCounts(null); lock.current = false
    void affiliateRequest<ProductPreview>(base + '/preview', 'POST', {itemId: product.id}, controller.signal).then(result => { if (!controller.signal.aborted) setPreview(result) }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Não foi possível preparar a prévia. Feche e tente novamente.') })
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => { mounted.current = false; controller.abort(); previewRequest.current?.abort(); clearInterval(timer) }
  }, [base, product.id])
  useEffect(() => {
    if (!broadcastId) return
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      try {
        const result = await affiliateRequest<{counts: BroadcastCounts}>('/broadcasts/' + broadcastId + '/status', 'GET', undefined, controller.signal)
        if (controller.signal.aborted) return
        setCounts(result.counts); setError('')
        if (result.counts.pending || result.counts.sending) timer = setTimeout(() => void poll(), 1500)
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Consulte o resultado no histórico de envios.') }
    }
    void poll(); return () => { controller.abort(); clearTimeout(timer) }
  }, [broadcastId])
  function close() {
    if (working) return
    previewRequest.current?.abort(); onClose()
  }
  async function regenerateTitle() {
    if (lock.current || !preview || broadcastId || Date.parse(preview.expiresAt) <= Date.now()) return
    const controller = new AbortController(); previewRequest.current = controller
    lock.current = true; setRegenerating(true); setError('')
    try {
      const result = await affiliateRequest<Pick<ProductPreview, 'previewToken' | 'title' | 'headline' | 'titleSource' | 'message' | 'expiresAt'>>(base + '/preview/title', 'POST', {previewToken: preview.previewToken}, controller.signal)
      if (controller.signal.aborted) return
      setPreview({...preview, ...result})
    } catch (reason) {
      if (!controller.signal.aborted) { const message=reason instanceof Error?reason.message:''; setError(message.includes('A prévia anterior foi mantida.')?message:(message?message+' ':'')+'O título e a mensagem anteriores foram mantidos. Tente gerar outro título novamente.') }
    } finally {
      if (!controller.signal.aborted) { lock.current = false; setRegenerating(false) }
    }
  }
  async function send() {
    if (lock.current || !preview || Date.parse(preview.expiresAt) <= Date.now()) return
    lock.current = true; setWorking(true); setError('')
    try {
      const result = await affiliateRequest<{broadcastId: string; counts?: BroadcastCounts}>(base + '/send', 'POST', {previewToken: preview.previewToken, confirm: true})
      if (mounted.current) { setBroadcastId(result.broadcastId); setCounts(result.counts ?? null); onChanged() }
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Não foi possível confirmar. Consulte o histórico antes de tentar novamente.') }
    finally { if (mounted.current) setWorking(false); lock.current = false }
  }
  async function discard() {
    if (lock.current) return
    lock.current = true; setWorking(true); setError('')
    try { await affiliateRequest(base + '/discard', 'POST', {itemId: product.id}); if (mounted.current) { onChanged(); onClose() } }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Não foi possível descartar. Tente novamente.') }
    finally { lock.current = false; if (mounted.current) setWorking(false) }
  }
  const expired = !!preview && Date.parse(preview.expiresAt) <= now
  const total = counts ? counts.pending + counts.sending + counts.sent + counts.failed + counts.uncertain + (counts.cancelled ?? 0) : 0
  return <OverlayDialog open title={broadcastId ? 'Acompanhar envio' : 'Revisar e enviar oferta'} size="wide" onClose={close} closeDisabled={working} returnFocusTo={returnFocusTo}>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {!preview && !error ? <SkeletonRegion label="Preparando a prévia da oferta"><p role="status">Conferindo preço, foto, link e destinos…</p><Skeleton height={300} /></SkeletonRegion> : null}
    {preview ? <div className={discoveryStyles.previewLayout}>
      <div className={discoveryStyles.messagePreview} aria-label="Mensagem exata para o WhatsApp"><ProductImage src={preview.product.imageUrl} title={preview.title} /><pre>{preview.message}</pre></div>
      <div className={discoveryStyles.productBody}><div className={discoveryStyles.titleControls}><h3>{preview.title}</h3>{!broadcastId ? <Button variant="ghost" className={discoveryStyles.titleRefresh} aria-label="Gerar outro título" title="Gerar outro título" disabled={working || regenerating || expired} loading={regenerating} onClick={() => void regenerateTitle()}><ActionIcon name="refresh" /></Button> : null}<p className={styles.muted} role="status">{regenerating ? 'Gerando outro título…' : preview.titleSource === 'OPENAI' ? 'Título criado com IA' : 'Título original'}</p></div><p className={styles.price}>{formatCents(preview.product.priceCents)}</p>{productProvider(preview.product) === 'SHOPEE' && (preview.product.reportedDiscountPercent ?? 0) > 0 ? <p>{preview.product.reportedDiscountPercent}% de desconto informado pela Shopee</p> : null}{preview.product.oldPriceCents && preview.product.oldPriceCents > preview.product.priceCents ? <p>Preço anterior informado: <s>{formatCents(preview.product.oldPriceCents)}</s></p> : <p className={styles.muted}>Preço anterior não informado</p>}{preview.priceChanged ? <p className={styles.warning}>O preço mudou desde a coleta. A mensagem já usa o valor atualizado.</p> : null}<a className={styles.url} href={preview.affiliateUrl} target="_blank" rel="noopener noreferrer">{preview.affiliateUrl}<span className={styles.srOnly}> (abre em nova aba)</span></a><div><h3>Destinos</h3><p>{preview.destinations.name} · {preview.destinations.count} {preview.destinations.count === 1 ? 'grupo' : 'grupos'}</p><ul>{preview.destinations.groups.map(group => <li key={group.id}>{group.name}</li>)}</ul></div>{!preview.destinations.count ? <p className={styles.warning}>Prepare ou ative um grupo nesta segmentação para liberar o envio.</p> : null}<p className={styles.muted}>Esta é a mensagem que será enviada{preview.product.imageUrl ? ' com a foto' : ''}. Confira o anúncio e os destinos antes de enviar.</p></div>
    </div> : null}
    {broadcastId ? <div className={discoveryStyles.sendStatus} role="status"><h3>{counts && !counts.pending && !counts.sending ? 'Processamento concluído' : 'Envio em andamento'}</h3>{counts ? <><progress aria-label="Destinos processados" max={total || 1} value={total - counts.pending - counts.sending} /><p>{counts.sent} enviados · {counts.pending + counts.sending} em andamento · {counts.failed} falhas · {counts.uncertain} precisam de conferência</p>{counts.uncertain ? <p className={styles.warning}>Confira essas mensagens no WhatsApp. Nenhuma nova tentativa será feita automaticamente para respostas incertas.</p> : null}</> : <p>Consultando resultados dos grupos…</p>}<Button variant="secondary" onClick={onClose}>Fechar e acompanhar no histórico</Button></div> : <><p className={styles.muted}>{expired ? 'Esta prévia expirou. Feche e abra o produto para conferir os valores novamente.' : 'Enviar confirma esta mensagem para os grupos listados.'}</p><div className={`${styles.actions} ${discoveryStyles.previewActions}`}><Button disabled={!preview || expired || working || regenerating || !preview.destinations.count} loading={working} onClick={() => void send()}>Enviar</Button><Button variant="secondary" disabled={working || regenerating} onClick={() => void discard()}>Descartar</Button><Button variant="ghost" disabled={working} onClick={close}>Cancelar</Button></div></>}
  </OverlayDialog>
}
