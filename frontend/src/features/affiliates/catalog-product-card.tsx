import { LiquidLens } from '@/components/ui/liquid-lens'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/domain/money'
import { localDate, type DiscoveryProduct } from './contracts'
import { ProductImage } from './product-image'
import styles from './affiliates.module.css'
import discoveryStyles from './discovery.module.css'

export function CatalogProductCard({ product, busy, canGenerate, prepare, discard, restore, review = false }: { product: DiscoveryProduct; busy: boolean; canGenerate: boolean; prepare: (product: DiscoveryProduct) => void; discard?: (product: DiscoveryProduct) => void; review?: boolean; restore?: (product: DiscoveryProduct) => void }) {
  const analysis = product.evaluation
  return <article className={discoveryStyles.product}>
    <LiquidLens />
    <ProductImage src={product.imageUrl} title={product.title} />
    <div className={discoveryStyles.productBody}>
      <h3>{product.title}</h3>
      <p className={styles.price}>{formatCents(product.priceCents)}{product.oldPriceCents && product.oldPriceCents > product.priceCents ? <s>{formatCents(product.oldPriceCents)}</s> : null}</p>
      {analysis ? <p className={styles.state}>{product.decision === 'DISCARDED' ? 'Descartado por você' : product.decision === 'SENT' ? 'Enviado' : analysis.status === 'SELECTED' ? 'Boa oferta' : 'Conferir antes de enviar'}</p> : null}
      <div className={styles.actions}>{product.decision !== 'DISCARDED' && (canGenerate || review) ? <Button disabled={busy || !canGenerate || product.decision === 'SENT'} onClick={() => prepare(product)}>{review ? 'Revisar e enviar' : 'Gerar link e preparar'}</Button> : null}</div>
      <a href={product.productUrl} target="_blank" rel="noopener noreferrer">Ver no Mercado Livre<span className={styles.srOnly}>: {product.title} (abre em nova aba)</span></a>
      <details className={discoveryStyles.evidence}>
        <summary>{analysis ? 'Por que este produto?' : 'Mais opções'}</summary>
        {analysis ? <>
          <ul>{analysis.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
          <p>Reputação do vendedor: {analysis.reputation.level ?? 'não informada'} · {analysis.reputation.status === 'GREEN' ? 'verde' : analysis.reputation.status === 'POOR' ? 'fora da faixa verde; confira o vendedor' : 'não confirmada nesta consulta'}.</p>
          <p>Histórico próprio: {analysis.history.days} {analysis.history.days === 1 ? 'dia observado' : 'dias observados'} na janela de {analysis.history.windowDays} dias. {analysis.history.verified ? `Queda observada: ${analysis.history.dropPercent ?? 0}%.` : 'Histórico insuficiente para comprovar queda.'}</p>
          {analysis.history.medianPriceCents ? <p>Referência mediana observada: {formatCents(analysis.history.medianPriceCents)}. Não é o preço anterior do anúncio.</p> : null}
          {analysis.reportedDiscountPercent !== null ? <p>Desconto informado pelo Mercado Livre: {analysis.reportedDiscountPercent}%. Não comprova queda histórica.</p> : null}
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
