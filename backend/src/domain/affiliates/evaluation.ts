import type { CatalogProduct } from './mercado-livre'
import { shopeePreviousPriceEstimate } from './shopee'

export const AFFILIATE_RULES = { version: 'v2', reportedDiscountPercent: 10, historyDropPercent: 5, minimumHistoryDays: 3, historyWindowDays: 30 } as const
type PriceHistory = {days:number;medianPriceCents:number|null;dropPercent:number|null;verified:boolean;windowDays:30}
type AffiliateEvaluation = {status:'SELECTED'|'REVIEW'|'DISCARDED';rulesVersion:typeof AFFILIATE_RULES.version;reasons:string[];reportedDiscountPercent:number|null;reputation:NonNullable<CatalogProduct['reputation']>;history:PriceHistory}
export function evaluateAffiliateProduct(product: CatalogProduct, observations: { day: Date; priceCents: number }[], now = new Date()) {
  const today = now.toISOString().slice(0,10)
  const cutoff = new Date(now.getTime()-30*86400000).toISOString().slice(0,10)
  const distinct = [...new Map(observations.filter(row => row.day.toISOString().slice(0,10) < today && row.day.toISOString().slice(0,10) >= cutoff).map(row=>[row.day.toISOString().slice(0,10),row.priceCents])).values()].sort((a,b)=>a-b)
  const days = distinct.length, middle = Math.floor(days/2)
  const medianPriceCents = days ? days%2 ? distinct[middle] : Math.round((distinct[middle-1]+distinct[middle])/2) : null
  const dropPercent = medianPriceCents ? Math.round((1-product.priceCents/medianPriceCents)*10000)/100 : null
  return assessEvidence(product,{days,medianPriceCents,dropPercent,verified:days>=3,windowDays:30})
}
function assessEvidence(product:CatalogProduct,history:PriceHistory):AffiliateEvaluation {
  const {days,dropPercent}=history
  const priceDiscountPercent = product.oldPriceSource === 'MERCADO_LIVRE' && product.oldPriceCents && product.oldPriceCents>product.priceCents ? Math.round((1-product.priceCents/product.oldPriceCents)*10000)/100 : null
  const rate=product.reportedDiscountPercent
  const shopeeDiscount=product.provider==='SHOPEE' && typeof rate==='number' && Number.isInteger(rate) && rate>0 && rate<=100 ? rate : null
  const reportedDiscountPercent=shopeeDiscount??priceDiscountPercent
  const reputation = product.reputation ?? {level:null,status:'UNKNOWN' as const}
  const historical = days>=3 && dropPercent!==null && dropPercent>=5
  // A provider's rounded rate is displayed, but does not replace verified price evidence.
  const evidence = (priceDiscountPercent??0)>=10 || historical
  // Evidence highlights candidates; only the administrator discards valid listings.
  const status = reputation.status==='GREEN' && evidence ? 'SELECTED' : 'REVIEW'
  const reasons = [reputation.status==='GREEN'?'Reputação verde do vendedor confirmada pelo Mercado Livre.':reputation.status==='POOR'?'Atenção: reputação do vendedor fora da faixa verde. Confira o anúncio antes de enviar.':'Reputação do vendedor não informada nesta consulta.']
  reasons.push(reportedDiscountPercent===null?'Preço anterior não informado nesta consulta; confira as condições no anúncio.':shopeeDiscount!==null?`Desconto informado pela Shopee: ${shopeeDiscount}%. O preço anterior exato não foi informado pela API.`:`Desconto informado pelo Mercado Livre: ${reportedDiscountPercent}%.`)
  reasons.push(days<3?`Histórico em formação: ${days} de 3 dias anteriores observados. O produto continua disponível para revisão.`:`Histórico próprio: ${days} dias nos últimos 30 dias; variação abaixo da mediana: ${dropPercent}%.`)
  if (!evidence) reasons.push(shopeeDiscount!==null?'O percentual informado pela Shopee não comprova queda histórica; você pode revisar e enviar.':'Desconto ainda não confirmado pelos dados disponíveis; você pode revisar e enviar.')
  return {status,rulesVersion:AFFILIATE_RULES.version,reasons,reportedDiscountPercent,reputation,history}
}
export type DiscoveryProduct = CatalogProduct & { evaluation: ReturnType<typeof evaluateAffiliateProduct>; sourceTerm: string; sourcePage: number; decision?: 'SENT'|'DISCARDED';sentCount?:number;pendingCount?:number;lastSentAt?:string|null }
export function refreshCachedAffiliateEvaluation(product:DiscoveryProduct):DiscoveryProduct {
  if(product.provider==='SHOPEE'){
    const oldPriceCents=shopeePreviousPriceEstimate(product.priceCents,product.reportedDiscountPercent)
    product={...product,oldPriceCents,oldPriceEstimated:oldPriceCents!==null,oldPriceSource:oldPriceCents?'SHOPEE_ESTIMATED':null}
  }
  if(product.evaluation?.rulesVersion===AFFILIATE_RULES.version && (product.provider!=='SHOPEE'||product.evaluation.reportedDiscountPercent===(product.reportedDiscountPercent??null)))return product
  return {...product,evaluation:assessEvidence(product,product.evaluation?.history??{days:0,medianPriceCents:null,dropPercent:null,verified:false,windowDays:30})}
}
