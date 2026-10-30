import { z } from 'zod'

export class AffiliateCatalogError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

export function mercadoLivreProductUrl(value: string): URL {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new AffiliateCatalogError(400, 'Use um link HTTPS do Mercado Livre ou meli.la.') }
  if (value.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port || !['mercadolivre.com.br', 'mercadolibre.com', 'meli.la'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new AffiliateCatalogError(400, 'Use um link HTTPS do Mercado Livre ou meli.la.')
  }
  return url
}

export function priceCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1000000) return null
  const cents = Math.round(value * 100)
  return cents > 0 && Number.isSafeInteger(cents) && Math.abs(value * 100 - cents) < 0.00001 ? cents : null
}

export type CatalogProduct = {
  provider?: 'MERCADO_LIVRE' | 'SHOPEE'
  id: string
  catalogId: string
  title: string
  displayTitle?: string
  productUrl: string
  priceCents: number
  oldPriceCents: number | null
  reportedDiscountPercent?: number | null
  imageUrl: string | null
  checkedAt: string
  sellerId?: string | null
  reputation?: { level: string | null; status: 'GREEN' | 'POOR' | 'UNKNOWN' }
  oldPriceSource?: 'MERCADO_LIVRE' | null
}

const productSchema = z.object({ id: z.string().regex(/^MLB\d+$/), name: z.string().trim().min(3).max(250), pictures: z.array(z.object({ url: z.string() })).optional() })
const sellerSchema = z.object({ seller_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(), item_id: z.string().regex(/^MLB\d+$/), currency_id: z.literal('BRL'), condition: z.literal('new'), price: z.number(), original_price: z.unknown().optional(), status: z.literal('active').optional(), available_quantity: z.number().positive().optional() })
const sellerEligibilitySchema = sellerSchema.omit({ price: true, original_price: true })

export function catalogItemRejectionKind(rawProduct: unknown, rawSeller: unknown): 'PRICE_UNAVAILABLE' | 'INELIGIBLE' {
  return productSchema.safeParse(rawProduct).success && sellerEligibilitySchema.safeParse(rawSeller).success ? 'PRICE_UNAVAILABLE' : 'INELIGIBLE'
}

export function catalogItem(rawProduct: unknown, rawSeller: unknown, now = new Date()): CatalogProduct | null {
  const product = productSchema.safeParse(rawProduct), seller = sellerSchema.safeParse(rawSeller)
  if (!product.success || !seller.success) return null
  const price = priceCents(seller.data.price), previous = priceCents(seller.data.original_price)
  if (price === null) return null
  const url = new URL(`https://www.mercadolivre.com.br/p/${product.data.id}`)
  url.searchParams.set('wid', seller.data.item_id)
  url.searchParams.set('pdp_filters', `item_id:${seller.data.item_id}`)
  let imageUrl: string | null = null
  try {
    const image = new URL(product.data.pictures?.[0]?.url?.replace(/^http:/, 'https:') ?? '')
    if (image.protocol === 'https:' && !image.username && !image.password && !image.port && (image.hostname === 'mlstatic.com' || image.hostname.endsWith('.mlstatic.com'))) imageUrl = image.href
  } catch { /* A missing image never changes the seller or price. */ }
  return { sellerId: seller.data.seller_id === undefined ? null : String(seller.data.seller_id), oldPriceSource: previous !== null && previous > price ? 'MERCADO_LIVRE' : null, id: seller.data.item_id, catalogId: product.data.id, title: product.data.name, productUrl: url.href, priceCents: price, oldPriceCents: previous !== null && previous > price ? previous : null, imageUrl, checkedAt: now.toISOString() }
}

export function affiliateResult(value: unknown, tag: string, profile: string) {
  const parsed = z.object({ url: z.string(), fullUrl: z.string(), tag: z.string(), profile: z.string() }).safeParse(value)
  if (!parsed.success || !tag || !profile || parsed.data.tag !== tag || parsed.data.profile !== profile) throw new AffiliateCatalogError(502, 'O gerador não confirmou a identificação de afiliado configurada.')
  const short = mercadoLivreProductUrl(parsed.data.url), full = mercadoLivreProductUrl(parsed.data.fullUrl)
  if ((short.hostname !== 'meli.la' && short.href !== full.href) || full.hostname !== 'www.mercadolivre.com.br' || full.pathname !== `/social/${profile}` || full.searchParams.get('matt_word') !== tag || !full.searchParams.get('matt_tool') || !full.searchParams.get('ref')) throw new AffiliateCatalogError(502, 'O gerador retornou um link de outra identificação de afiliado.')
  return { url: short.href, fullUrl: full.href, tag, profile }
}


export const affiliateSessionSchema = z.object({
  cookie: z.string().min(1).max(24000).regex(/^[\x20-\x7e]+$/).regex(/(?:^|;\s*)ssid=[^;\s]+/),
  csrf: z.string().min(8).max(512).regex(/^[\x21-\x7e]+$/),
  tag: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  profile: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  accountLabel: z.string().trim().min(1).max(80).regex(/^[^\p{Cc}]+$/u),
}).strict()
export type AffiliateSessionCredentials = z.infer<typeof affiliateSessionSchema>

export function affiliateSellerUrl(value: string): URL {
  const url = mercadoLivreProductUrl(value)
  if (!['www.mercadolivre.com.br', 'produto.mercadolivre.com.br', 'mercadolivre.com.br'].includes(url.hostname)) throw new AffiliateCatalogError(400, 'Use o endereço completo do anúncio do Mercado Livre, com o vendedor identificado.')
  const catalog = /^\/p\/MLB\d+\/?$/.test(url.pathname) || /\/p\/MLB\d+\/?$/.test(url.pathname)
  const direct = /^\/MLB-?(\d+)(?:-|_|\/|$)/.exec(url.pathname)
  const wid = url.searchParams.get('wid'), filter = url.searchParams.get('pdp_filters')
  const filtered = filter ? /^item_id:(MLB\d+)$/.exec(filter)?.[1] : undefined
  if ((wid && !/^MLB\d+$/.test(wid)) || (filter && !filtered) || (wid && filtered && wid !== filtered)) throw new AffiliateCatalogError(400, 'O link contém identificações de anúncio conflitantes.')
  const item = catalog ? wid || filtered : direct ? `MLB${direct[1]}` : null
  if (!item || (!catalog && ((wid && wid !== item) || (filtered && filtered !== item)))) throw new AffiliateCatalogError(400, 'Abra o anúncio de um vendedor e copie o endereço completo. O link de catálogo sozinho não identifica o anúncio.')
  return new URL(`https://produto.mercadolivre.com.br/MLB-${item.slice(3)}-_JM`)
}

export function authenticatedAffiliateResult(value: unknown, productUrl: string, tag: string, profile: string) {
  const parsed = z.object({ status: z.literal(200), total_items: z.literal(1), total_success: z.literal(1), total_error: z.literal(0), urls: z.array(z.object({ origin_url: z.string(), tag: z.string(), type_url: z.literal('SOCIAL_PROFILE_ENCRYPTED'), short_url: z.string(), long_url: z.string() })).length(1) }).safeParse(value)
  if (!parsed.success) throw new AffiliateCatalogError(502, 'O gerador não confirmou o anúncio e a identificação de afiliado.')
  const row = parsed.data.urls[0]
  let same = false
  try { same = affiliateSellerUrl(row.origin_url).href === affiliateSellerUrl(productUrl).href } catch { /* Untrusted origins never confirm an item. */ }
  if (!same || row.tag !== tag) throw new AffiliateCatalogError(502, 'O gerador retornou outro anúncio ou outra identificação de afiliado.')
  const result = affiliateResult({ url: row.short_url, fullUrl: row.long_url, tag, profile }, tag, profile)
  if (new URL(result.url).hostname !== 'meli.la') throw new AffiliateCatalogError(502, 'O gerador não retornou um link curto confirmado.')
  return result
}
