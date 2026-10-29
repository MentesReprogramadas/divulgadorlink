import type { CatalogProduct } from './mercado-livre'

export const AFFILIATE_RULES = { version: 'v1', reportedDiscountPercent: 10, historyDropPercent: 5, minimumHistoryDays: 3, historyWindowDays: 30 } as const
export function evaluateAffiliateProduct(product: CatalogProduct, observations: { day: Date; priceCents: number }[], now = new Date()) {
  const today = now.toISOString().slice(0,10)
  const cutoff = new Date(now.getTime()-30*86400000).toISOString().slice(0,10)
  const distinct = [...new Map(observations.filter(row => row.day.toISOString().slice(0,10) < today && row.day.toISOString().slice(0,10) >= cutoff).map(row=>[row.day.toISOString().slice(0,10),row.priceCents])).values()].sort((a,b)=>a-b)
  const days = distinct.length, middle = Math.floor(days/2)
  const medianPriceCents = days ? days%2 ? distinct[middle] : Math.round((distinct[middle-1]+distinct[middle])/2) : null
  const dropPercent = medianPriceCents ? Math.round((1-product.priceCents/medianPriceCents)*10000)/100 : null
  const reportedDiscountPercent = product.oldPriceSource === 'MERCADO_LIVRE' && product.oldPriceCents && product.oldPriceCents>product.priceCents ? Math.round((1-product.priceCents/product.oldPriceCents)*10000)/100 : null
  const reputation = product.reputation ?? {level:null,status:'UNKNOWN' as const}
  const historical = days>=3 && dropPercent!==null && dropPercent>=5
  const evidence = (reportedDiscountPercent??0)>=10 || historical
  const status: 'SELECTED'|'REVIEW'|'DISCARDED' = reputation.status==='POOR' ? 'DISCARDED' : reputation.status==='GREEN' && evidence ? 'SELECTED' : 'REVIEW'
  const reasons = [reputation.status==='GREEN'?'Reputação verde confirmada pelo Mercado Livre.':reputation.status==='POOR'?'Reputação fora das faixas verdes exigidas.':'Reputação do vendedor não confirmada.']
  reasons.push(reportedDiscountPercent===null?'Preço anterior verificável não informado pelo Mercado Livre.':`Desconto informado pelo Mercado Livre: ${reportedDiscountPercent}%; mínimo exigido: 10%.`)
  reasons.push(days<3?`Histórico próprio insuficiente: ${days} dia(s) anterior(es); mínimo de 3 dias distintos.`:`Referência: mediana das observações próprias em ${days} dias nos últimos 30 dias; queda de ${dropPercent}%; mínimo exigido: 5%.`)
  if (!evidence) reasons.push('Não há desconto relevante comprovado pelos critérios v1.')
  return {status,rulesVersion:'v1' as const,reasons,reportedDiscountPercent,reputation,history:{days,medianPriceCents,dropPercent,verified:days>=3,windowDays:30 as const}}
}
export type DiscoveryProduct = CatalogProduct & { evaluation: ReturnType<typeof evaluateAffiliateProduct>; sourceTerm: string; sourcePage: number; decision?: 'SENT'|'DISCARDED' }
