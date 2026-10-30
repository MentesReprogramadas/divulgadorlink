'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { CatalogSessionForm } from './catalog-session-form'
import sessionStyles from './catalog-session.module.css'
import { affiliateRequest, type CatalogProduct, type CatalogStatus, type OfferSeed } from './contracts'
import styles from './affiliates.module.css'
import { DiscoveryPanel } from './discovery-panel'
import { CatalogProductCard } from './catalog-product-card'
import discoveryStyles from './discovery.module.css'
import { ShopeeSettings, type ShopeeStatus } from './shopee-settings'

export function CatalogPanel({ createOffer, contextName, segmentId, focusSearch = false }: { createOffer: (product: OfferSeed) => void; contextName?: string; segmentId?: string; focusSearch?: boolean }) {
  const [status, setStatus] = useState<CatalogStatus | null>(null), [products, setProducts] = useState<CatalogProduct[]>([])
  const [shopee, setShopee] = useState<ShopeeStatus | null>(null)
  const [counts, setCounts] = useState<{catalogsFound:number;catalogsChecked:number;withoutOffers:number;failed:number}|null>(null)
  const [warnings, setWarnings] = useState<string[]>([]), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false), [config, setConfig] = useState(false), [clientId, setClientId] = useState(''), [clientSecret, setClientSecret] = useState('')
  const [query, setQuery] = useState(''), [disconnect, setDisconnect] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false), [sessionBusy, setSessionBusy] = useState(false), [sessionDisconnect, setSessionDisconnect] = useState(false)
  const [productUrl, setProductUrl] = useState(''), [generated, setGenerated] = useState<{ url: string; productUrl: string } | null>(null)
  const central = status?.mode === 'CENTRAL'
  const lock = useRef(false), trigger = useRef<HTMLElement | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => { if (focusSearch) searchInput.current?.focus() }, [focusSearch, status])
  const load = useCallback(async () => {
    const result = await affiliateRequest<CatalogStatus>('/catalog/status')
    setStatus(result); setClientId(result.clientId ?? '')
  }, [])
  useEffect(() => { void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Não foi possível conferir o catálogo.')) }, [load])
  const loadShopee = useCallback(async () => {
    const result = await affiliateRequest<ShopeeStatus>('/catalog/shopee')
    if (active.current) setShopee(result.provider === 'SHOPEE' ? result : null)
  }, [])
  useEffect(() => { void loadShopee().catch(() => { if (active.current) setShopee(null) }) }, [loadShopee])
  async function perform(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { await action() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha de conexão. Tente novamente.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await perform(async () => { await affiliateRequest('/catalog/config', 'POST', { clientId, clientSecret }); setClientSecret(''); setConfig(false); await load(); setNotice('Aplicativo salvo. Conecte a conta do Mercado Livre para consultar o catálogo.') })
  }
  async function generate(url: string) {
    try {
      const result = await affiliateRequest<{ url: string }>('/catalog/affiliate', 'POST', { productUrl: url })
      await load(); return result
    } catch (reason) { await load().catch(() => undefined); throw reason }
  }
  function prepareProduct(product: CatalogProduct) {
    void perform(async () => { const result = await generate(product.productUrl); if (active.current) createOffer({ ...product, affiliateUrl: result.url }) })
  }
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await perform(async () => {
      const result = await affiliateRequest<{ products: CatalogProduct[]; warnings: string[]; counts?: {catalogsFound:number;catalogsChecked:number;withoutOffers:number;failed:number} }>('/catalog/search?q=' + encodeURIComponent(query))
      setProducts(result.products); setWarnings(result.warnings ?? []); setCounts(result.counts ?? null)
      if (!result.products.length) setNotice('Nenhum produto retornado para esta busca. Tente outro termo.')
    })
  }
  const catalogTools = !status ? error ? <Button variant="secondary" onClick={() => void perform(load)}>Tentar verificar integração</Button> : <SkeletonRegion label="Conferindo integração com o Mercado Livre"><p role="status">Conferindo integração com o Mercado Livre…</p><Skeleton height={40} /></SkeletonRegion> : <details className={discoveryStyles.settings} open={segmentId ? focusSearch || undefined : true}><summary>{segmentId ? 'Buscar outro produto' : 'Ferramentas do catálogo'}</summary><div className={discoveryStyles.manual}>
    <div className={styles.heading}><div><h2 id="affiliate-catalog-title">{contextName ? 'Produtos do Mercado Livre' : 'Catálogo Mercado Livre'}</h2><p>{contextName ? `Escolha os produtos para ${contextName}. O link de afiliado será gerado ao preparar a oferta.` : 'Consulte produtos, confira preços e prepare ofertas para uma segmentação.'}</p></div><Button variant="secondary" readOnlyAllowed disabled={busy} onClick={() => void perform(load)}><ActionIcon name="refresh" />Atualizar integração</Button></div>
    {status.catalogError ? <p role="status" className={styles.warning}>Catálogo indisponível: {status.catalogError} A configuração da sessão e a geração por endereço continuam disponíveis quando autorizadas.</p> : null}
    <details className={styles.catalogConnection}><summary>Contas do Mercado Livre<span>Catálogo e sessão de afiliados</span></summary>
      <div className={sessionStyles.accounts}>
        <div><h3>Conta do catálogo</h3><p>{central ? status.connected ? 'Catálogo central conectado' : status.status === 'UNAVAILABLE' ? 'Catálogo central indisponível' : 'Conexão central pendente' : status.connected ? 'Conta própria conectada' : 'Conta própria pendente'}{status.accountId ? ` · conta ${status.accountId}` : ''}</p><p>A conexão OAuth permite consultar produtos. Ela não autoriza a geração de links de afiliado.</p>{central ? <p>Você pode substituir o catálogo central por sua própria conta. Depois de configurar uma conta própria, desconectar não restaura a origem central.</p> : null}
          <div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={event => { trigger.current = event.currentTarget; setClientSecret(''); setConfig(true) }}><ActionIcon name="settings" />{central ? 'Usar meu aplicativo' : 'Configurar aplicativo'}</Button>{!central ? <><Button disabled={busy || !status.configured} onClick={() => void perform(async () => { const result = await affiliateRequest<{ url: string }>('/catalog/connect', 'POST', {}); window.location.assign(result.url) })}><ActionIcon name="login" />{status.connected ? 'Trocar conta do catálogo' : 'Conectar Mercado Livre'}</Button>{status.connected ? <Button variant="ghost" disabled={busy} onClick={event => { trigger.current = event.currentTarget; setDisconnect(true) }}>Desconectar catálogo</Button> : null}</> : <Button variant="ghost" disabled={busy} onClick={event => { trigger.current = event.currentTarget; setDisconnect(true) }}>Desativar catálogo central</Button>}</div>
        </div>
        <div><h3>Sessão de afiliados</h3><p>{status?.session?.mode === 'DISCONNECTED' ? 'Sessão própria desconectada' : status?.session?.status === 'RECONNECT' ? 'Sessão recusada ou expirada; configure novamente' : status?.session?.configured ? `${status?.session.mode === 'CENTRAL' ? 'Sessão central' : status?.session.accountLabel || 'Sessão própria'} · ${status?.session.verified ? 'validada na última geração' : 'configurada; validação pendente'}` : status.affiliateConfigured ? 'Sessão central configurada; validade conferida ao gerar' : 'Sessão ainda não configurada'}</p>{status?.session?.configured ? <p>Etiqueta: {status?.session.tag || '—'} · perfil: {status?.session.profile || '—'}</p> : null}<p>Novos links usam a sessão ativa. Ofertas e histórico existentes permanecem. Uma sessão própria desconectada não retorna à central.</p>
          <div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={event => { trigger.current = event.currentTarget; setSessionOpen(true) }}><ActionIcon name="settings" />{status?.session?.mode === 'OWN' ? 'Trocar sessão de afiliados' : 'Configurar minha sessão'}</Button>{status?.session?.configured ? <Button variant="ghost" disabled={busy} onClick={event => { trigger.current = event.currentTarget; setSessionDisconnect(true) }}>{status?.session.mode === 'CENTRAL' ? 'Desativar sessão central' : 'Desconectar sessão de afiliados'}</Button> : null}</div>
        </div>
      </div>
    </details>
    <div className={sessionStyles.direct}><h3>Gerar link pelo endereço do produto</h3><p>Cole o endereço HTTPS de um anúncio do Mercado Livre com vendedor identificado. Uma página geral de catálogo pode exigir a escolha de um vendedor antes.</p><form className={`${styles.search} ${sessionStyles.search}`} onSubmit={event => { event.preventDefault(); setGenerated(null); void perform(async () => { const result = await generate(productUrl); if (active.current) setGenerated({ url: result.url, productUrl }) }) }}><Field label="Endereço do anúncio"><Input type="url" required disabled={busy} maxLength={2048} value={productUrl} onChange={event => { setProductUrl(event.target.value); setGenerated(null) }} placeholder="https://www.mercadolivre.com.br/..." /></Field><Button type="submit" disabled={busy || !status.affiliateConfigured} loading={busy}><ActionIcon name="createLink" />Gerar link de afiliado</Button></form>{!status.affiliateConfigured ? <p>Configure a sessão de afiliados nos detalhes das contas para gerar links.</p> : null}
      {generated ? <div className={sessionStyles.result}><p role="status">Link gerado. Confira o anúncio e preencha nome e preço ao preparar a oferta.</p><a className={styles.url} href={generated.url} target="_blank" rel="noopener noreferrer">{generated.url}<span className={styles.srOnly}> (abre em nova aba)</span></a><div className={styles.actions}><Button variant="secondary" onClick={() => void perform(async () => { await navigator.clipboard.writeText(generated.url); setNotice('Link copiado.') })}><ActionIcon name="copy" />Copiar link</Button><Button disabled={busy} onClick={() => createOffer({ productUrl: generated.productUrl, affiliateUrl: generated.url })}><ActionIcon name="plus" />Preparar oferta</Button></div></div> : null}
    </div>
    <p className={styles.muted}>A busca compara uma amostra do catálogo, não todos os anúncios. Se o produto não aparecer, cole o endereço exato do anúncio acima.</p>
    <form onSubmit={event => void search(event)} className={`${styles.search} ${sessionStyles.search}`}><Field label="Buscar produtos"><Input ref={searchInput} type="search" required minLength={2} maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: presentes de Natal" /></Field><Button type="submit" loading={busy} disabled={!status?.connected}>{busy ? "Buscando produtos…" : "Buscar no Mercado Livre"}</Button></form>
    {warnings.map((warning, index) => <p className={styles.muted} key={index}>{warning}</p>)}
    {counts ? <p role="status" className={styles.muted}>{products.length} {products.length === 1 ? 'anúncio disponível' : 'anúncios disponíveis'} entre {counts.catalogsChecked} produtos consultados.{counts.catalogsFound > counts.catalogsChecked ? ` A busca encontrou cerca de ${counts.catalogsFound.toLocaleString('pt-BR')} produtos; esta consulta compara uma amostra.` : ''} Comparação entre os vendedores consultados; frete e condições pessoais podem variar.</p> : products.length ? <p className={styles.muted}>{products.length} produtos nesta consulta. Comparação entre os vendedores consultados; frete e condições pessoais podem variar.</p> : null}
    <div className={styles.productList}>{products.map(product => <CatalogProductCard key={product.id} product={product} busy={busy} canGenerate={status?.affiliateConfigured ?? false} prepare={prepareProduct} />)}</div>
    </div></details>
  return <section className={styles.section} aria-label="Catálogo Mercado Livre">
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}{notice ? <p role="status" className={styles.notice}>{notice}</p> : null}

    {segmentId ? <DiscoveryPanel segmentId={segmentId} contextName={contextName ?? 'esta segmentação'} busy={busy} canGenerate={status?.affiliateConfigured ?? false} canGenerateShopee={shopee?.configured ?? false} prepare={prepareProduct} settingsContent={<><ShopeeSettings status={shopee} onChanged={loadShopee} />{segmentId && !status?.affiliateConfigured && status ? <div className={discoveryStyles.sessionPrompt}><p>Configure uma sessão de afiliados do Mercado Livre para gerar links desta fonte.</p><Button variant="secondary" disabled={busy} onClick={event => { trigger.current = event.currentTarget; setSessionOpen(true) }}>Configurar sessão de afiliados</Button></div> : null}{catalogTools}</>} /> : <><ShopeeSettings status={shopee} onChanged={loadShopee} />{catalogTools}</>}
    <OverlayDialog open={sessionOpen} title="Configurar sessão de afiliados" onClose={() => { if (!sessionBusy) setSessionOpen(false) }} closeDisabled={sessionBusy} returnFocusTo={trigger.current}>
      {sessionOpen ? <CatalogSessionForm session={status?.session} pending={setSessionBusy} saved={async () => { await load(); setGenerated(null); setSessionOpen(false); setNotice('Sessão configurada. Gere um link para conferir sua validade e atribuição.') }} /> : null}
    </OverlayDialog>
    <OverlayDialog open={sessionDisconnect} title={status?.session?.mode === 'CENTRAL' ? 'Desativar sessão central nesta operação?' : 'Desconectar sessão de afiliados?'} onClose={() => { if (!busy) setSessionDisconnect(false) }} closeDisabled={busy} returnFocusTo={trigger.current}>{status?.session?.mode === 'CENTRAL' ? <p>A sessão central será desativada somente nesta operação. A conta na origem VHG permanece conectada.</p> : null}<p>Novos links não poderão ser gerados até configurar outra sessão própria. A sessão central não será usada como alternativa. As ofertas e o histórico permanecem.</p>{error ? <p role="alert" className={styles.error}>{error}</p> : null}<Button variant="danger" loading={busy} onClick={() => void perform(async () => { await affiliateRequest('/catalog/session/disconnect', 'POST', {}); setGenerated(null); await load(); setSessionDisconnect(false); setNotice('Sessão de afiliados desconectada.') })}>Confirmar desconexão da sessão</Button></OverlayDialog>
    <OverlayDialog open={config} title="Configurar conta do catálogo" onClose={() => { if (!busy) { setConfig(false); setClientSecret('') } }} closeDisabled={busy} returnFocusTo={trigger.current}><form className={styles.form} onSubmit={event => void configure(event)}><p>Use as credenciais do seu aplicativo. Elas ficam protegidas no servidor.</p><Field label="ID do aplicativo"><Input required value={clientId} onChange={event => setClientId(event.target.value)} maxLength={120} autoComplete="off" /></Field><Field label="Segredo do aplicativo"><Input type="password" required value={clientSecret} onChange={event => setClientSecret(event.target.value)} maxLength={512} autoComplete="new-password" /></Field>{status?.redirectUri ? <p className={styles.url}>Cadastre esta URL de retorno no aplicativo: <code>{status.redirectUri}</code></p> : null}{error ? <p role="alert" className={styles.error}>{error}</p> : null}<Button loading={busy} type="submit"><ActionIcon name="save" />Salvar aplicativo</Button></form></OverlayDialog>
    <OverlayDialog open={disconnect} title={central ? 'Desativar catálogo central nesta operação?' : 'Desconectar conta do catálogo?'} onClose={() => { if (!busy) setDisconnect(false) }} closeDisabled={busy} returnFocusTo={trigger.current}>{central ? <p>O catálogo central será desativado somente nesta operação. A conta na origem VHG permanece conectada.</p> : null}<p>A busca ficará indisponível até uma nova conexão. O catálogo central não será usado como alternativa. As ofertas e o histórico permanecem.</p>{error ? <p role="alert" className={styles.error}>{error}</p> : null}<Button variant="danger" loading={busy} onClick={() => void perform(async () => { await affiliateRequest('/catalog/disconnect', 'POST', {}); setDisconnect(false); await load(); setProducts([]); setNotice('Conta desconectada.') })}>Confirmar desconexão</Button></OverlayDialog>
  </section>
}
