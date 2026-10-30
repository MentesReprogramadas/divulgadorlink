'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { TabNavigation } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { affiliateRequest, localDate, type CatalogProduct, type DiscoveryState } from './contracts'
import { CatalogProductCard } from './catalog-product-card'
import { ProductPreviewDialog } from './product-preview-dialog'
import styles from './affiliates.module.css'
import discoveryStyles from './discovery.module.css'

type DiscoveryProps = {segmentId: string; contextName: string; busy: boolean; canGenerate: boolean; prepare?: (product: CatalogProduct) => void; settingsContent?: ReactNode}
export function DiscoveryPanel(props: DiscoveryProps) { return <DiscoveryContent key={props.segmentId} {...props} /> }
function DiscoveryContent({ segmentId, contextName, busy, canGenerate, settingsContent }: DiscoveryProps) {
  const [data, setData] = useState<DiscoveryState | null>(null), [error, setError] = useState(''), [terms, setTerms] = useState(''), [saving, setSaving] = useState(false), [revision, setRevision] = useState(0), [checkingStopped, setCheckingStopped] = useState(false)
  const [view, setView] = useState('ALL'), [settingsOpen, setSettingsOpen] = useState(false), [loading, setLoading] = useState(true), [page, setPage] = useState(1), [now, setNow] = useState(Date.now()), [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null)
  const trigger = useRef<HTMLElement | null>(null), controller = useRef<AbortController | null>(null), initialized = useRef(false), mutationLock = useRef(false), requestVersion = useRef(0), pageCache = useRef(new Map<string, DiscoveryState>())
  const base = '/segments/' + encodeURIComponent(segmentId) + '/discovery'
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort
    const cacheKey = view + ':' + page
    const cached = pageCache.current.get(cacheKey)
    if (cached) setData(cached)
    setLoading(true)
    let timer: ReturnType<typeof setTimeout> | undefined, polls = 0, lastCheckedAt: string | null = null
    async function load() {
      if (abort.signal.aborted || document.hidden || mutationLock.current) return
      const version = ++requestVersion.current
      try {
        const query = new URLSearchParams({mode:'MIXED',view,page:String(page)})
        let result = await affiliateRequest<DiscoveryState>(base + '?' + query, 'GET', undefined, abort.signal)
        if (abort.signal.aborted || version !== requestVersion.current) return
        if (!initialized.current && result.enabled && (result.pageStatus === 'NOT_COLLECTED' || !result.checkedAt && result.status === 'QUEUED')) {
          initialized.current = true
          const queued = await affiliateRequest<DiscoveryState>(base + '/refresh', 'POST', {}, abort.signal)
          result = {...result,status:queued.status,nextRunAt:queued.nextRunAt}
        }
        if (abort.signal.aborted || version !== requestVersion.current) return
        if (result.checkedAt && result.checkedAt !== lastCheckedAt) { polls = 0; lastCheckedAt = result.checkedAt }
        pageCache.current.set(cacheKey, result); setData(result); setLoading(false); setError(''); setCheckingStopped(false)
        if (result.status === 'QUEUED' || result.status === 'RUNNING' || result.enabled && result.pageStatus === 'NOT_COLLECTED') { if (++polls <= 60) timer = setTimeout(() => void load(), 3000); else setCheckingStopped(true) }
        else if (result.enabled && result.status === 'READY') { polls = 0; timer = setTimeout(() => void load(), 60_000) }
      } catch (reason) { if (!abort.signal.aborted && version === requestVersion.current) { setLoading(false); setCheckingStopped(true); setError(reason instanceof Error ? reason.message : 'Não foi possível consultar sugestões.') } }
    }
    function visibility() { clearTimeout(timer); if (!document.hidden) { polls = 0; void load() } }
    void load(); document.addEventListener('visibilitychange', visibility)
    return () => { abort.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', visibility) }
  }, [base, revision, page, view])
  async function update(path: string, body: unknown) {
    if (mutationLock.current) return false
    const abort = controller.current
    mutationLock.current = true; setSaving(true); setError(''); requestVersion.current++
    try {
      const result = await affiliateRequest<DiscoveryState>(base + path, 'POST', body, abort?.signal)
      if (!abort?.signal.aborted) { setData(previous => previous ? {...previous,status:result.status,nextRunAt:result.nextRunAt} : previous); if (path === '/config') { initialized.current = false; setPage(1) }; pageCache.current.clear(); setRevision(value => value + 1) }
      return !abort?.signal.aborted
    } catch (reason) { if (!abort?.signal.aborted) { setCheckingStopped(true); setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar sugestões.') }; return false }
    finally { mutationLock.current = false; if (!abort?.signal.aborted) setSaving(false) }
  }
  function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = terms.split(/[,\n]/).map(term => term.trim()).filter(Boolean)
    if (values.length > 5 || values.some(term => term.length < 2 || term.length > 120)) { setError('Use até 5 termos, com 2 a 120 caracteres cada.'); return }
    void update('/config', {enabled:data?.enabled ?? true,terms:values})
  }
  async function discard(product: CatalogProduct, restore = false) {
    if (mutationLock.current) return
    mutationLock.current = true; setSaving(true); setError('')
    try { await affiliateRequest('/segments/' + encodeURIComponent(segmentId) + '/products/' + (restore ? 'restore' : 'discard'), 'POST', {itemId:product.id}, controller.current?.signal); pageCache.current.clear(); setRevision(value => value + 1) }
    catch (reason) { if (!controller.current?.signal.aborted) setError(reason instanceof Error ? reason.message : 'Não foi possível descartar.') }
    finally { mutationLock.current = false; setSaving(false) }
  }
  const collecting = data?.status === 'QUEUED' || data?.status === 'RUNNING'
  const remaining = data?.nextRunAt ? Math.max(0, Date.parse(data.nextRunAt) - now) : null
  const interval = Math.max(1, data?.cycleIntervalMs ?? 900000)
  const countdown = remaining === null ? null : `${Math.floor(remaining / 60000)}:${String(Math.floor(remaining / 1000) % 60).padStart(2, '0')}`
  const products = data?.products.filter(product => view === 'ALL' ? product.decision !== 'SENT' && product.decision !== 'DISCARDED' : product.decision === 'DISCARDED') ?? []
  const statusMessage = !data ? error ? 'Sugestões indisponíveis no momento.' : 'Conferindo sugestões…' : data.status === 'PAUSED' || !data.enabled ? 'Descoberta automática pausada.' : collecting ? checkingStopped ? 'A conferência foi interrompida. A coleta pode continuar no servidor; confira novamente.' : 'Buscando sugestões em segundo plano…' : data.status === 'ERROR' ? 'A última coleta não foi concluída.' : 'Sugestões atualizadas.'
  return <section className={discoveryStyles.panel} aria-labelledby="discovery-title">
    <header><div><h2 id="discovery-title">Sugestões para {contextName}</h2><p>Abra um produto, confira a mensagem e envie.</p></div></header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <TabNavigation className={styles.mobileTabs} value={settingsOpen ? 'SETTINGS' : view} onChange={value => {setSettingsOpen(value === 'SETTINGS'); if (value !== 'SETTINGS') {setPage(1);setView(value)} else if (data) setTerms(data.terms.join(', '))}} label="Ofertas e configurações" idPrefix="discovery-evaluation" items={[{id:'ALL',label:'Produtos'},{id:'DISCARDED',label:'Descartados'},{id:'SETTINGS',label:'Configurações'}]} />
    <div className={discoveryStyles.freshness}><p role="status" className={styles.muted}>{loading && data ? 'Atualizando produtos…' : statusMessage}</p>{data?.enabled && countdown !== null ? <><span className={styles.muted}>{remaining === 0 ? 'Aguardando próxima coleta' : <>Próxima coleta em <strong>{countdown}</strong></>}</span><progress aria-label="Tempo até a próxima coleta" max={interval} value={Math.min(interval,Math.max(0,interval-(remaining??0)))} /></> : null}</div>
    {data?.error ? <p className={styles.warning}>{data.error}</p> : null}
    {!canGenerate && !settingsOpen ? <p className={styles.muted}>Para enviar, confira a integração em <button className={discoveryStyles.textAction} onClick={() => {setSettingsOpen(true);if(data)setTerms(data.terms.join(', '))}}>Configurações</button>.</p> : null}
    {settingsOpen ? <div role="tabpanel" id="discovery-evaluation-panel-SETTINGS" aria-labelledby="discovery-evaluation-SETTINGS" className={discoveryStyles.configuration}>
      {settingsContent}
      <h3>Coleta automática</h3><p className={styles.muted}>Última atualização: {localDate(data?.checkedAt ?? null)}</p>
      <Button variant="secondary" disabled={saving || !data && !error} loading={saving} onClick={() => checkingStopped || !data ? setRevision(value => value + 1) : void update('/refresh', {force:true})}><ActionIcon name="refresh" />{checkingStopped ? 'Conferir sugestões novamente' : 'Forçar atualização'}</Button>
      {data ? <form onSubmit={configure}><label htmlFor="discovery-terms">Termos de busca</label><textarea id="discovery-terms" value={terms} onChange={event => setTerms(event.target.value)} maxLength={604} aria-describedby="discovery-terms-hint" /><p id="discovery-terms-hint" className={styles.muted}>Até 5 termos separados por vírgulas ou linhas. Vazio usa o nome da segmentação. Todos aparecem na mesma lista.</p><div className={styles.actions}><Button type="submit" disabled={saving}>Salvar termos</Button><Button variant="secondary" disabled={saving} onClick={() => void update('/config', {enabled:!data.enabled,terms:data.usesSegmentName ? [] : data.terms})}>{data.enabled ? 'Pausar descoberta automática' : 'Retomar descoberta automática'}</Button></div></form> : null}
      {data?.collectionSummary ? <p className={styles.muted}>{data.collectionSummary.available} produtos disponíveis · {data.collectionSummary.unavailable} sem oferta disponível · {data.collectionSummary.failed} falhas de consulta.</p> : data?.counts ? <p className={styles.muted}>Última coleta: {data.counts.catalogsChecked} produtos consultados, {data.counts.withoutOffers} sem anúncio e {data.counts.failed} falhas.</p> : null}
      {data?.unavailable?.length ? <details className={discoveryStyles.evidence}><summary>Produtos sem oferta disponível</summary>{data.unavailable.map(item => <p key={item.id}><strong>{item.title}</strong> · {item.reason}</p>)}</details> : null}
    </div> : <div role="tabpanel" id={'discovery-evaluation-panel-' + view} aria-labelledby={'discovery-evaluation-' + view}>
      <div className={discoveryStyles.productList} aria-busy={loading}>{products.length ? products.map(product => <CatalogProductCard key={product.id} product={product} busy={busy || saving || loading} canGenerate={canGenerate} review prepare={product => {trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPreviewProduct(product)}} discard={discard} restore={product => void discard(product, true)} />) : !data || collecting || data.pageStatus === 'NOT_COLLECTED' ? <p className={styles.empty}>{data?.pageStatus === 'NOT_COLLECTED' ? 'As primeiras ofertas estão sendo coletadas. Aguarde a atualização.' : 'Buscando produtos…'}</p> : <p className={styles.empty}>Nenhum produto por aqui. Aguarde a próxima coleta.</p>}</div>
      {data?.pagination ? <nav className={discoveryStyles.pagination} aria-label="Páginas de ofertas da segmentação"><Button variant="secondary" disabled={saving || loading || !data.pagination.hasPrevious} onClick={() => setPage(data.pagination!.page - 1)}>Anterior</Button><span>Página {data.pagination.page} · {data.pagination.total.toLocaleString('pt-BR')} produtos</span><Button variant="secondary" disabled={saving || loading || !data.pagination.hasNext} onClick={() => setPage(data.pagination!.page + 1)}>Próxima</Button></nav> : null}
      <p className={styles.muted}>Mercado Livre · Preços e disponibilidade podem mudar. Envio somente após sua confirmação.</p>
    </div>}
    {previewProduct ? <ProductPreviewDialog key={segmentId + ':' + previewProduct.id} segmentId={segmentId} product={previewProduct} onClose={() => setPreviewProduct(null)} onChanged={() => setRevision(value => value + 1)} returnFocusTo={trigger.current} /> : null}
  </section>
}
