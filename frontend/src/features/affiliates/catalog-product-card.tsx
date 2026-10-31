import { LiquidLens } from '@/components/ui/liquid-lens'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { localDate, productProvider, providerLabel, type DiscoveryProduct } from './contracts'
import { ProductImage } from './product-image'
import { OfferPrice } from './offer-price'
import styles from './affiliates.module.css'
import discoveryStyles from './discovery.module.css'

export function CatalogProductCard({ product, busy, canGenerate, prepare, discard, restore, review = false,selected,toggleSelection }: { product: DiscoveryProduct; busy: boolean; canGenerate: boolean; prepare: (product: DiscoveryProduct) => void; discard?: (product: DiscoveryProduct) => void; review?: boolean; restore?: (product: DiscoveryProduct) => void;selected?:boolean;toggleSelection?:(product:DiscoveryProduct)=>void }) {
  const analysis = product.evaluation
  const source = providerLabel(productProvider(product))
  return <article className={discoveryStyles.product}>
    <LiquidLens />
    <ProductImage src={product.imageUrl} title={product.title} />
    <div className={discoveryStyles.productBody}>
      {toggleSelection&&product.decision!=='DISCARDED'?<label className={discoveryStyles.selectProduct}><input type="checkbox" checked={selected??false} disabled={busy||!canGenerate||!!product.pendingCount} onChange={()=>toggleSelection(product)}/><span>Selecionar para agendar<span className={styles.srOnly}>: {product.displayTitle??product.title}</span></span></label>:null}
      <h3>{product.displayTitle ?? product.title}</h3>
      <OfferPrice {...product}/>
      {(product.sentCount??0)>0?<p className={styles.state}>Enviado {product.sentCount} {product.sentCount===1?'vez':'vezes'}</p>:null}
      {(product.pendingCount??0)>0?<p className={styles.state}>{product.pendingCount} {product.pendingCount===1?'envio pendente':'envios pendentes'}</p>:null}
      {analysis ? <p className={styles.state}>{product.decision === 'DISCARDED' ? 'Descartado por você' : analysis.status === 'SELECTED' ? 'Boa oferta' : 'Conferir antes de enviar'}</p> : null}
      <div className={styles.actions}>{product.decision !== 'DISCARDED' && (canGenerate || review) ? <Button disabled={busy || !canGenerate || !!product.pendingCount} onClick={() => prepare(product)}>{review ? 'Revisar e enviar' : 'Gerar link e preparar'}</Button> : null}</div>
      <a href={product.productUrl} target="_blank" rel="noopener noreferrer">Ver {source === 'Shopee' ? 'na Shopee' : 'no Mercado Livre'}<span className={styles.srOnly}>: {product.title} (abre em nova aba)</span></a>
      <details className={discoveryStyles.evidence}>
        <summary>{analysis ? 'Por que este produto?' : 'Mais opções'}</summary>
        {product.displayTitle && product.displayTitle !== product.title ? <p>{product.title}</p> : null}
        {analysis ? <>
          <ul>{analysis.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
          <p>Reputação do vendedor: {analysis.reputation.level ?? 'não informada'} · {analysis.reputation.status === 'GREEN' ? 'verde' : analysis.reputation.status === 'POOR' ? 'fora da faixa verde; confira o vendedor' : 'não confirmada nesta consulta'}.</p>
          <p>Histórico próprio: {analysis.history.days} {analysis.history.days === 1 ? 'dia observado' : 'dias observados'} na janela de {analysis.history.windowDays} dias. {analysis.history.verified ? `Queda observada: ${analysis.history.dropPercent ?? 0}%.` : 'Histórico insuficiente para comprovar queda.'}</p>
          {analysis.history.medianPriceCents ? <p>Referência mediana observada: {formatCents(analysis.history.medianPriceCents)}. Não é o preço anterior do anúncio.</p> : null}
          {analysis.reportedDiscountPercent !== null ? <p>Desconto informado {source === 'Shopee' ? 'pela Shopee' : 'pelo Mercado Livre'}: {analysis.reportedDiscountPercent}%. Não comprova queda histórica.</p> : null}
          <p>Origem: {product.sourceTerm ?? 'consulta do catálogo'}{product.sourcePage ? ` · página ${product.sourcePage}` : ''}.</p>
        </> : null}
        <p className={styles.muted}>Consultado em {localDate(product.checkedAt)}</p>
        <div className={styles.actions}>
          {discard && product.decision !== 'DISCARDED' && product.decision !== 'SENT' ? <Button variant="ghost" disabled={busy} onClick={() => discard(product)}>Descartar</Button> : null}
          {restore && product.decision === 'DISCARDED' ? <Button variant="ghost" disabled={busy} onClick={() => restore(product)}>Restaurar</Button> : null}
        </div>
      </details>
    </div>
  </article>
}
