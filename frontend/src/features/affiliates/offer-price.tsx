import { formatCents } from '@/domain/money'
import styles from './affiliates.module.css'
import priceStyles from './offer-price.module.css'

export function OfferPrice({priceCents,oldPriceCents,reportedDiscountPercent,oldPriceEstimated=false,variant='card'}:{priceCents:number;oldPriceCents:number|null;reportedDiscountPercent?:number|null;oldPriceEstimated?:boolean;variant?:'card'|'review'}) {
  const previous=oldPriceCents!==null&&oldPriceCents>priceCents?oldPriceCents:null
  const rate=typeof reportedDiscountPercent==='number'&&Number.isInteger(reportedDiscountPercent)&&reportedDiscountPercent>0&&reportedDiscountPercent<=100?reportedDiscountPercent:0
  const percent=previous&&!oldPriceEstimated?Math.floor((previous-priceCents)/previous*100):rate
  return <>
    <p className={styles.price}>{formatCents(priceCents)}{variant==='card'&&previous?<><s>{formatCents(previous)}</s>{oldPriceEstimated?<small className={priceStyles.estimated}>estimado</small>:null}</>:null}{percent?<span className={`${styles.state} ${priceStyles.discount}`}>{percent}% OFF</span>:null}</p>
    {variant==='review'?(previous?<p>Preço anterior {oldPriceEstimated?'estimado':'informado'}: <s>{formatCents(previous)}</s></p>:!percent?<p className={styles.muted}>Preço anterior não informado</p>:null):null}
  </>
}
