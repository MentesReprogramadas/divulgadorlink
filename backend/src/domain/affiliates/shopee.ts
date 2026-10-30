import { z } from 'zod'
import { affiliateSellerUrl, AffiliateCatalogError } from './mercado-livre'

export const affiliateCatalogProvider = z.enum(['MERCADO_LIVRE', 'SHOPEE'])
export type AffiliateCatalogProvider = z.infer<typeof affiliateCatalogProvider>
export const affiliateProductId = z.string().regex(/^(?:MLB\d+|SHP[1-9]\d{0,18}_[1-9]\d{0,18})$/).max(45)
export const shopeeConfigSchema = z.object({
  appId: z.string().trim().regex(/^\d{4,32}$/),
  secret: z.string().min(8).max(512).refine(value => !/[\r\n]/.test(value) && !value.includes(String.fromCharCode(0))),
  accountLabel: z.string().trim().min(1).max(80),
  subIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,50}$/)).max(5).default([]),
}).strict()
export type ShopeeCredentials = z.infer<typeof shopeeConfigSchema>

export function shopeePreviousPriceEstimate(priceCents:number,discountPercent:number|null|undefined):number|null {
  if(!Number.isInteger(priceCents)||priceCents<1||priceCents>100_000_000||typeof discountPercent!=='number'||!Number.isInteger(discountPercent)||discountPercent<=0||discountPercent>=100)return null
  const estimate=Math.round(priceCents*100/(100-discountPercent))
  return estimate>priceCents&&estimate<=100_000_000?estimate:null
}

export function shopeeUrl(value: string): URL {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new AffiliateCatalogError(400, 'Use um link HTTPS da Shopee Brasil.') }
  if (value.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port || !['shopee.com.br', 'shope.ee'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new AffiliateCatalogError(400, 'Use um link HTTPS da Shopee Brasil.')
  return url
}
export function shopeeProductIdentity(value: string) {
  const url = shopeeUrl(value)
  if (!['shopee.com.br', 'www.shopee.com.br'].includes(url.hostname)) throw new AffiliateCatalogError(400, 'Use a URL completa do produto Shopee, com loja e anúncio.')
  const match = /^\/product\/([1-9]\d{0,18})\/([1-9]\d{0,18})\/?$/.exec(url.pathname) ?? /-i\.([1-9]\d{0,18})\.([1-9]\d{0,18})\/?$/.exec(url.pathname)
  if (!match) throw new AffiliateCatalogError(400, 'Use a URL completa do produto Shopee, com loja e anúncio.')
  return { shopId: match[1], itemId: match[2], id: `SHP${match[1]}_${match[2]}`, url: `https://shopee.com.br/product/${match[1]}/${match[2]}` }
}
export const isShopeeProduct = (value: string) => value.startsWith('SHP')
export function affiliateProductUrl(value: string): URL {
  let url: URL
  try { url = new URL(value) } catch { throw new AffiliateCatalogError(400, 'Use um link de produto válido.') }
  return ['shopee.com.br', 'www.shopee.com.br'].includes(url.hostname) ? new URL(shopeeProductIdentity(value).url) : affiliateSellerUrl(value)
}
