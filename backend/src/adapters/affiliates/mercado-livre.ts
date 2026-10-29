import { z } from 'zod'
import { affiliateSellerUrl, authenticatedAffiliateResult, type AffiliateSessionCredentials, affiliateResult, AffiliateCatalogError, catalogItem, catalogItemRejectionKind, mercadoLivreProductUrl, type CatalogProduct } from '@/domain/affiliates/mercado-livre'
import { affiliateServiceOrigin } from './service-origin'

export async function readCatalogJson(response: Response): Promise<unknown> {
  if (!response.body) throw new AffiliateCatalogError(502, 'O serviço não retornou dados válidos.')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 1024 * 1024) {
        await reader.cancel()
        throw new AffiliateCatalogError(502, 'A resposta do serviço excedeu o limite permitido.')
      }
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch (error) {
    if (error instanceof AffiliateCatalogError) throw error
    throw new AffiliateCatalogError(502, 'O serviço não retornou dados válidos.')
  } finally { reader.releaseLock() }
}

export function assertCatalogPath(path: string): void {
  if (path.length > 4096 || !/^\/(?:products\/search\?[^#]+|products\/MLB\d+\/items\?[^#]+|users\/\d+)$/.test(path)) throw new AffiliateCatalogError(400, 'Consulta de catálogo não permitida.')
}

export async function mercadoLivreRequest(path: string, token: string): Promise<unknown> {
  assertCatalogPath(path)
  let response: Response
  try {
    response = await fetch(`https://api.mercadolibre.com${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(15000) })
  } catch { throw new AffiliateCatalogError(502, 'Não foi possível acessar o Mercado Livre. Tente novamente.') }
  if (!response.ok) {
    await response.body?.cancel()
    if (response.status === 404 && /^\/products\/MLB\d+\/items\?/.test(path)) return { results: [], paging: { total: 0 } }
    if (response.status === 400) throw new AffiliateCatalogError(400, 'O Mercado Livre recusou esta página. A cobertura do catálogo é parcial; consulte as páginas já coletadas.')
    if (response.status === 401) throw new AffiliateCatalogError(401, 'A autorização do Mercado Livre expirou. Conecte a conta novamente.')
    if (response.status === 403) throw new AffiliateCatalogError(403, 'A conta está conectada, mas o Mercado Livre não liberou o catálogo para este aplicativo.')
    if (response.status === 429) throw new AffiliateCatalogError(429, 'O Mercado Livre limitou as consultas. Aguarde antes de buscar novamente.')
    throw new AffiliateCatalogError(502, 'O catálogo do Mercado Livre está indisponível. Tente novamente.')
  }
  return readCatalogJson(response)
}

const tokensSchema = z.object({ access_token: z.string().min(1).max(4096), refresh_token: z.string().min(1).max(4096), expires_in: z.number().int().min(60).max(60 * 60 * 24 * 30), user_id: z.union([z.number().int().positive(), z.string().min(1)]).optional() })
export type MercadoLivreTokens = z.infer<typeof tokensSchema>

export async function exchangeMercadoLivreToken(values: Record<string, string>): Promise<MercadoLivreTokens> {
  let response: Response
  try {
    response = await fetch('https://api.mercadolibre.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(values), redirect: 'error', signal: AbortSignal.timeout(15000) })
  } catch { throw new AffiliateCatalogError(502, 'Não foi possível renovar a conexão com o Mercado Livre. Tente novamente.') }
  if (!response.ok) {
    await response.body?.cancel()
    throw new AffiliateCatalogError(response.status === 400 || response.status === 401 ? 409 : response.status === 429 ? 429 : 502, response.status === 400 || response.status === 401 ? 'A autorização expirou ou foi revogada. Conecte o Mercado Livre novamente.' : 'Não foi possível autorizar o aplicativo no Mercado Livre. Tente novamente.')
  }
  const parsed = tokensSchema.safeParse(await readCatalogJson(response))
  if (!parsed.success) throw new AffiliateCatalogError(502, 'O Mercado Livre não retornou uma autorização válida.')
  return parsed.data
}

const searchSchema = z.object({ results: z.array(z.object({ id: z.string().regex(/^MLB\d+$/), name: z.string(), pictures: z.array(z.object({ url: z.string() })).optional() })).max(100), paging: z.object({ total: z.number().int().nonnegative() }).optional() })
const pageSchema = z.object({ results: z.array(z.unknown()).max(100), paging: z.object({ total: z.number().int().nonnegative() }).optional() })

export async function sellers(catalogId: string, request: (path: string) => Promise<unknown>, deadline: number): Promise<unknown[]> {
  const rows: unknown[] = [], seen = new Set<string>()
  let offset = 0
  for (let page = 0; page < 5; page++) {
    if (Date.now() > deadline) throw new AffiliateCatalogError(502, 'A comparação dos vendedores ficou incompleta. Tente uma busca menor.')
    const result = pageSchema.safeParse(await request(`/products/${catalogId}/items?limit=100&offset=${offset}`))
    if (!result.success) throw new AffiliateCatalogError(502, 'O Mercado Livre não retornou uma lista válida de vendedores.')
    for (const row of result.data.results) {
      const id = z.object({ item_id: z.string().regex(/^MLB\d+$/) }).safeParse(row)
      if (!id.success || seen.has(id.data.item_id)) throw new AffiliateCatalogError(502, 'O catálogo retornou uma comparação de vendedores incompleta ou repetida.')
      seen.add(id.data.item_id)
      rows.push(row)
    }
    offset += result.data.results.length
    const total = result.data.paging?.total
    if (total !== undefined ? offset >= total : result.data.results.length < 100) return rows
    if (!result.data.results.length) break
  }
  throw new AffiliateCatalogError(502, 'A comparação de vendedores excedeu o limite da consulta. Nenhum preço parcial foi selecionado.')
}


export function parseSellerReputation(raw: unknown): NonNullable<CatalogProduct['reputation']> {
  const parsed=z.object({seller_reputation:z.object({level_id:z.string().nullable().optional()})}).safeParse(raw)
  const level=parsed.success?parsed.data.seller_reputation.level_id??null:null
  return {level,status:level===null?'UNKNOWN':['4_light_green','5_green'].includes(level)?'GREEN':'POOR'}
}

export type CatalogRequestMany = (paths: string[]) => Promise<PromiseSettledResult<unknown>[]>

export async function searchMercadoLivreCatalog(term: string, request: (path: string) => Promise<unknown>, requestMany?: CatalogRequestMany, options?: { offset?: number }) {
  const offset = z.number().int().min(0).max(1000000).parse(options?.offset ?? 0)
  const q = z.string().trim().min(2).max(120).parse(term), now = new Date(), deadline = Date.now() + 60000
  const result = searchSchema.safeParse(await request(`/products/search?status=active&site_id=MLB&q=${encodeURIComponent(q)}&limit=20${offset ? `&offset=${offset}` : ''}`))
  if (!result.success) throw new AffiliateCatalogError(502, 'O Mercado Livre não retornou uma lista válida de produtos.')
  const unique = [...new Map(result.data.results.map(product => [product.id, product])).values()].slice(0, 20)
  const counts = { catalogsFound: result.data.paging?.total ?? unique.length, catalogsChecked: unique.length, withoutOffers: 0, failed: 0 }
  const firstPages = new Map<string, PromiseSettledResult<unknown>>()
  if (requestMany) {
    await Promise.all([0, 10].filter(index => index < unique.length).map(async index => {
      const paths = unique.slice(index, index + 10).map(product => `/products/${product.id}/items?limit=100&offset=0`)
      const pages = await requestMany(paths)
      if (pages.length !== paths.length) throw new AffiliateCatalogError(502, 'O catálogo retornou uma consulta incompleta.')
      paths.forEach((path, offset) => firstPages.set(path, pages[offset]))
    }))
  }
  const cachedRequest = async (path: string) => {
    const cached = firstPages.get(path)
    if (!cached) return request(path)
    if (cached.status === 'rejected') throw cached.reason
    return cached.value
  }
  const rejected: {id:string;title:string;reason:string;kind?:'NO_LISTINGS'|'INELIGIBLE'|'PRICE_UNAVAILABLE'|'LOOKUP_FAILED'}[] = []
  const found: (CatalogProduct | undefined)[] = new Array(unique.length)
  let cursor = 0
  // Two independent catalog comparisons at a time, preserving source relevance order.
  const worker = async () => {
    while (cursor < unique.length) {
      const index = cursor++, product = unique[index]
      try {
        const items = await sellers(product.id, cachedRequest, deadline)
        const offers = items.map(item => catalogItem(product, item, now)).filter((item): item is CatalogProduct => item !== null).sort((a, b) => a.priceCents - b.priceCents)
        found[index] = offers[0]
        if (!offers.length) {
          counts.withoutOffers++
          const kind = !items.length ? 'NO_LISTINGS' : items.some(item => catalogItemRejectionKind(product, item) === 'PRICE_UNAVAILABLE') ? 'PRICE_UNAVAILABLE' : 'INELIGIBLE'
          const reason = kind === 'NO_LISTINGS' ? 'O catálogo não retornou anúncios disponíveis para este produto.' : kind === 'PRICE_UNAVAILABLE' ? 'O anúncio não retornou um preço atual verificável em BRL.' : 'Os anúncios retornados não atendem aos critérios de produto novo, ativo e disponível em BRL.'
          rejected.push({id:product.id,title:product.name,kind,reason})
        }
      } catch (error) {
        if (error instanceof AffiliateCatalogError && [401, 403, 409, 413, 429].includes(error.status)) throw error
        counts.failed++; rejected.push({id:product.id,title:product.name,kind:'LOOKUP_FAILED',reason:'Consulta não avaliada: não foi possível concluir a comparação dos vendedores.'})
      }
    }
  }
  await Promise.all([worker(), worker()])
  const products = found.filter((product): product is CatalogProduct => Boolean(product))
  // Reputation enrichment must not consume the deadline for complete seller-price comparisons.
  const reputationPaths = [...new Set(products.flatMap(product => product.sellerId ? [`/users/${product.sellerId}`] : []))]
  const reputations = new Map<string, NonNullable<CatalogProduct['reputation']>>()
  const batchSize = requestMany ? 10 : 1
  for (let index = 0; index < reputationPaths.length; index += batchSize * 2) {
    await Promise.all([index, index + batchSize].filter(start => start < reputationPaths.length).map(async start => {
      const paths = reputationPaths.slice(start, start + batchSize)
      let results: PromiseSettledResult<unknown>[]
      try {
        results = requestMany ? await requestMany(paths) : await Promise.allSettled(paths.map(request))
        if (results.length !== paths.length) throw new AffiliateCatalogError(502, 'O catálogo retornou uma consulta incompleta.')
      } catch (reason) { results = paths.map(() => ({ status: 'rejected', reason })) }
      results.forEach((result, offset) => {
        if (result.status === 'rejected' && result.reason instanceof AffiliateCatalogError && [401, 403, 409, 413, 429].includes(result.reason.status)) throw result.reason
        reputations.set(paths[offset], result.status === 'fulfilled' ? parseSellerReputation(result.value) : { level: null, status: 'UNKNOWN' })
      })
    }))
  }
  for (const product of products) if (product.sellerId) product.reputation = reputations.get(`/users/${product.sellerId}`)
  const warnings = counts.failed ? [`Não foi possível conferir os vendedores de ${counts.failed} produto(s). Esses produtos não foram incluídos.`] : []
  if (!products.length && counts.failed) throw new AffiliateCatalogError(502, 'Não foi possível concluir os preços dos vendedores. Atualize a busca antes de aprovar uma oferta.')
  return { products, rejected, pagination:{offset,limit:20,total:counts.catalogsFound,hasNext:offset+unique.length<counts.catalogsFound && unique.length>0}, checkedAt: now.toISOString(), comparison: 'catalog_sellers' as const, warnings, counts }
}

export type AffiliateGeneratorSettings = { url?: string; key?: string; tag?: string; profile?: string }
export function affiliateGeneratorConfigured(settings: AffiliateGeneratorSettings): boolean { return Boolean(settings.url && settings.key && settings.tag && settings.profile) }

export async function generateAffiliateLink(productUrl: string, settings: AffiliateGeneratorSettings) {
  const product = mercadoLivreProductUrl(productUrl)
  if (!affiliateGeneratorConfigured(settings)) throw new AffiliateCatalogError(503, 'Configure o serviço e a identificação do afiliado no servidor, ou cole um link de afiliado revisado manualmente.')
  const origin = affiliateServiceOrigin(settings.url!, true)
  let response: Response
  try {
    response = await fetch(new URL('/api/generate', origin).href, { method: 'POST', headers: { Authorization: `Bearer ${settings.key}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ url: product.href }), redirect: 'error', signal: AbortSignal.timeout(80000) })
  } catch { throw new AffiliateCatalogError(502, 'O gerador de afiliados não respondeu. Confira a sessão no serviço e tente novamente.') }
  if (!response.ok) {
    let reason:unknown
    try {reason=await readCatalogJson(response)} catch { /* An invalid provider error body keeps the generic failure below. */ }
    const failure=z.object({error:z.string()}).safeParse(reason)
    if(failure.success){
      if(failure.data.error==='affiliate_provider_rejected')throw new AffiliateCatalogError(409,'O Mercado Livre recusou a sessão de afiliado ou o acesso do serviço. Confira a conexão de afiliados no VHG antes de tentar novamente.')
      if(failure.data.error==='affiliate_session_missing')throw new AffiliateCatalogError(409,'Conecte a sessão de afiliado no VHG para gerar os links automaticamente.')
      if(failure.data.error==='affiliate_response_unconfirmed')throw new AffiliateCatalogError(502,'O gerador não confirmou o vínculo entre o anúncio, o vendedor e o link de afiliado. Nenhum link foi liberado.')
      if(failure.data.error==='affiliate_resolution_unavailable')throw new AffiliateCatalogError(502,'O Mercado Livre bloqueou a confirmação do produto/vendedor do link. Nenhum link foi liberado. Tente novamente mais tarde.')
    }
    throw new AffiliateCatalogError(response.status === 409 ? 409 : 502, response.status === 409 ? 'O gerador de afiliados está ocupado. Tente novamente em instantes.' : 'O gerador não concluiu o link. Confira a sessão de afiliado no serviço.')
  }
  return affiliateResult(await readCatalogJson(response), settings.tag!, settings.profile!)
}


export async function generateSessionAffiliateLink(productUrl: string, session: AffiliateSessionCredentials) {
  const product = affiliateSellerUrl(productUrl), origin = 'https://www.mercadolivre.com.br'
  let response: Response
  try {
    response = await fetch(`${origin}/affiliate-program/api/v2/affiliates/createLink`, { method: 'POST', redirect: 'error', headers: { Cookie: session.cookie, 'x-csrf-token': session.csrf, Origin: origin, Referer: `${origin}/afiliados/linkbuilder`, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, body: JSON.stringify({ urls: [product.href], tag: session.tag }), signal: AbortSignal.timeout(30000) })
  } catch { throw new AffiliateCatalogError(502, 'O gerador do Mercado Livre não respondeu. Tente novamente.') }
  if (!response.ok) {
    await response.body?.cancel()
    throw new AffiliateCatalogError([401, 403].includes(response.status) ? 401 : 502, [401, 403].includes(response.status) ? 'A sessão foi recusada pelo Mercado Livre. Configure novamente o Cookie e o token CSRF.' : 'O gerador do Mercado Livre está indisponível. Tente novamente.')
  }
  return authenticatedAffiliateResult(await readCatalogJson(response), product.href, session.tag, session.profile)
}
