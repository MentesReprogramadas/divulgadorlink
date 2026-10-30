import { createHash } from 'node:crypto'
import { z } from 'zod'
import { AffiliateCatalogError, type CatalogProduct } from '@/domain/affiliates/mercado-livre'
import { shopeeConfigSchema, shopeeProductIdentity, shopeeUrl, type ShopeeCredentials } from '@/domain/affiliates/shopee'
import { readCatalogJson } from './mercado-livre'

const endpoint = 'https://open-api.affiliate.shopee.com.br/graphql'
// Official BR Explorer: /explorer and /explorer/v2, inspected 2026-10-30.
export function shopeeAuthorization(credentials: ShopeeCredentials, payload: string, timestamp = Math.ceil(Date.now() / 1000)) {
  const signature = createHash('sha256').update(credentials.appId + timestamp + payload + credentials.secret).digest('hex')
  return `SHA256 Credential=${credentials.appId}, Timestamp=${timestamp}, Signature=${signature}`
}
export async function shopeeRequest(credentials: ShopeeCredentials, query: string, variables: Record<string, unknown> = {}): Promise<unknown> {
  shopeeConfigSchema.parse(credentials)
  const body = JSON.stringify({ query, variables })
  let response: Response
  try { response = await fetch(endpoint, { method: 'POST', headers: { Authorization: shopeeAuthorization(credentials, body), 'Content-Type': 'application/json', Accept: 'application/json' }, body, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000) }) }
  catch { throw new AffiliateCatalogError(502, 'A Shopee não respondeu. Tente novamente.') }
  if (!response.ok) {
    await response.body?.cancel()
    throw new AffiliateCatalogError([401,403,429].includes(response.status) ? response.status : 502, response.status === 429 ? 'A Shopee limitou as consultas. Aguarde antes de tentar novamente.' : [401,403].includes(response.status) ? 'A Shopee recusou o acesso. Confira as credenciais e a liberação da Open API.' : 'A Open API da Shopee está indisponível.')
  }
  const raw = await readCatalogJson(response)
  const envelope = z.object({ data: z.unknown().optional(), errors: z.array(z.object({ message: z.string().optional(), extensions: z.object({ code: z.union([z.number(),z.string()]).optional() }).optional() })).max(50).optional() }).safeParse(raw)
  if (!envelope.success) throw new AffiliateCatalogError(502, 'A Shopee não retornou uma resposta válida.')
  if (envelope.data.errors?.length) {
    const codes = envelope.data.errors.map(error => Number(error.extensions?.code))
    if (codes.some(code => [10020,10021,10022,10023,10024,10025,10030].includes(code))) throw new AffiliateCatalogError(401, 'A Shopee recusou a autenticação. Confira App ID, Secret e a liberação da Open API.')
    // Provider messages may contain request values; never reflect them in logs or HTTP errors.
    throw new AffiliateCatalogError(502, 'A Shopee recusou a consulta. Confira o acesso à Open API e tente novamente.')
  }
  if (envelope.data.data === undefined || envelope.data.data === null) throw new AffiliateCatalogError(502, 'A Shopee não retornou dados da consulta.')
  return envelope.data.data
}

const id = z.union([z.string().regex(/^[1-9]\d{0,18}$/), z.number().int().positive().max(Number.MAX_SAFE_INTEGER)]).transform(String)
const price = z.union([z.string().regex(/^\d{1,7}(?:\.\d{1,6})?$/), z.number().finite().nonnegative()])
const offerSchema = z.object({ itemId: id, shopId: id, productName: z.string().trim().min(3).max(250), productLink: z.string(), priceMin: price, priceMax: price, imageUrl: z.string(), commissionRate: z.string().optional(), periodStartTime: z.union([z.string(),z.number()]).optional(), periodEndTime: z.union([z.string(),z.number()]).optional() })
const resultSchema = z.object({ productOfferV2: z.object({ nodes: z.array(z.unknown()).max(50), pageInfo: z.object({ page: z.number().int().positive().nullable().optional(), limit: z.number().int().positive(), hasNextPage: z.boolean() }) }) })
const fields = 'itemId shopId productName productLink priceMin priceMax imageUrl commissionRate periodStartTime periodEndTime'
export type ShopeeRequest = (query: string, variables?: Record<string, unknown>) => Promise<unknown>
function cents(value: z.infer<typeof price>): number | null {
  const amount = Number(value), result = Math.round(amount * 100)
  return result > 0 && result <= 100_000_000 && Math.abs(amount * 100 - result) < 0.00001 ? result : null
}
export function shopeeCatalogItem(value: unknown, now = new Date()): CatalogProduct | null {
  const parsed = offerSchema.safeParse(value)
  if (!parsed.success) return null
  const row = parsed.data, min = cents(row.priceMin), max = cents(row.priceMax)
  // A variant price range cannot become a single-price approved WhatsApp offer.
  if (min === null || max !== min) return null
  const start = row.periodStartTime === undefined ? 0 : Number(row.periodStartTime), end = row.periodEndTime === undefined ? 0 : Number(row.periodEndTime), seconds = now.getTime() / 1000
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > seconds || (end > 0 && end <= seconds)) return null
  let identity: ReturnType<typeof shopeeProductIdentity>
  try { identity = shopeeProductIdentity(row.productLink) } catch { return null }
  if (identity.itemId !== row.itemId || identity.shopId !== row.shopId) return null
  let imageUrl: string | null = null
  try {
    const image = new URL(row.imageUrl)
    if (image.protocol === 'https:' && !image.username && !image.password && !image.port && (image.hostname === 'susercontent.com' || image.hostname.endsWith('.susercontent.com'))) imageUrl = image.href
  } catch { /* Missing or unsafe images do not make a valid price unusable. */ }
  // Shopee exposes a rounded discount rate, not a verified previous price.
  return { provider: 'SHOPEE', id: identity.id, catalogId: identity.id, title: row.productName, productUrl: identity.url, priceCents: min, oldPriceCents: null, oldPriceSource: null, imageUrl, checkedAt: now.toISOString(), sellerId: row.shopId, reputation: { level: null, status: 'UNKNOWN' } }
}
export async function searchShopeeCatalog(term: string, request: ShopeeRequest, options?: { offset?: number }) {
  const keyword = z.string().trim().min(2).max(120).parse(term), offset = z.number().int().min(0).max(1_000_000).multipleOf(20).parse(options?.offset ?? 0), page = offset / 20 + 1, now = new Date()
  const raw = await request(`query($keyword:String!,$page:Int!){productOfferV2(keyword:$keyword,page:$page,limit:20,sortType:1){nodes{${fields}} pageInfo{page limit hasNextPage}}}`, { keyword, page })
  const parsed = resultSchema.safeParse(raw)
  if (!parsed.success || (parsed.data.productOfferV2.pageInfo.page != null && parsed.data.productOfferV2.pageInfo.page !== page)) throw new AffiliateCatalogError(502, 'A Shopee não retornou uma página válida de ofertas.')
  const { nodes, pageInfo } = parsed.data.productOfferV2, products: CatalogProduct[] = [], rejected: { id: string; title: string; reason: string; kind: 'PRICE_UNAVAILABLE' }[] = [], seen = new Set<string>()
  for (const row of nodes) {
    const product = shopeeCatalogItem(row, now)
    if (product) { if (!seen.has(product.id)) { products.push(product); seen.add(product.id) }; continue }
    const identity = offerSchema.safeParse(row)
    if (identity.success) rejected.push({ id: `SHP${identity.data.shopId}_${identity.data.itemId}`, title: identity.data.productName, kind: 'PRICE_UNAVAILABLE', reason: 'A Shopee não confirmou um preço único atual ou uma oferta ativa. Confira variações e condições no anúncio.' })
  }
  // This API exposes hasNextPage, not a result total; reserve the next page's first slot.
  const total = offset + (pageInfo.hasNextPage ? 21 : nodes.length)
  return { products, rejected, pagination: { offset, limit: 20, total, hasNext: pageInfo.hasNextPage }, checkedAt: now.toISOString(), comparison: 'provider_offers' as const, warnings: ['Catálogo de ofertas da Shopee: cobertura parcial. Reputação do vendedor e preço anterior não foram confirmados. Produtos com faixa de preço exigem revisão no anúncio e não entram nesta lista. O total indica apenas as páginas consultadas e a existência de próxima página.'], counts: { catalogsFound: total, catalogsChecked: nodes.length, withoutOffers: nodes.length - products.length, failed: 0 } }
}
export async function refreshShopeeCatalogProduct(product: CatalogProduct, request: ShopeeRequest): Promise<CatalogProduct> {
  const identity = shopeeProductIdentity(product.productUrl)
  if (identity.id !== product.id) throw new AffiliateCatalogError(409, 'A identidade do produto mudou. Atualize a lista.')
  const parsed = resultSchema.safeParse(await request(`query($shopId:Int64!,$itemId:Int64!){productOfferV2(shopId:$shopId,itemId:$itemId,page:1,limit:20){nodes{${fields}} pageInfo{page limit hasNextPage}}}`, { shopId: identity.shopId, itemId: identity.itemId }))
  const fresh = parsed.success ? parsed.data.productOfferV2.nodes.map(row => shopeeCatalogItem(row)).find(row => row?.id === identity.id) : null
  if (!fresh) throw new AffiliateCatalogError(409, 'A Shopee não confirmou o produto com preço único atual. Atualize os produtos.')
  return fresh
}
export async function generateShopeeAffiliateLink(productUrl: string, subIds: string[], request: ShopeeRequest) {
  const product = shopeeProductIdentity(productUrl)
  const parsed = z.object({ generateShortLink: z.object({ shortLink: z.string().max(2048) }) }).safeParse(await request('mutation($input:ShortLinkInput!){generateShortLink(input:$input){shortLink}}', { input: { originUrl: product.url, subIds } }))
  if (!parsed.success) throw new AffiliateCatalogError(502, 'A Shopee não confirmou um link de afiliado.')
  const url = shopeeUrl(parsed.data.generateShortLink.shortLink).href
  return { url, fullUrl: url, productUrl: product.url, itemId: product.id, provider: 'SHOPEE' as const }
}
