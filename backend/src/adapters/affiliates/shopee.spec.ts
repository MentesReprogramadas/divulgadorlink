import { createHash } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { affiliateProductId, affiliateProductUrl, shopeeProductIdentity, shopeePreviousPriceEstimate } from '@/domain/affiliates/shopee'
import { imageUrl } from '@/domain/affiliates/contracts'
import { generateShopeeAffiliateLink, refreshShopeeCatalogProduct, searchShopeeCatalog, shopeeAuthorization, shopeeCatalogItem, shopeeRequest } from './shopee'

const credentials = { appId: '123456', secret: 'test-only-shopee-secret', accountLabel: 'Teste', subIds: ['catalogo'] }
const row = { itemId: 456, shopId: 123, productName: 'Brinquedo para gatos', productLink: 'https://shopee.com.br/Brinquedo-i.123.456', priceMin: '29.90', priceMax: '29.90', imageUrl: 'https://down-br.img.susercontent.com/file/test', commissionRate: '0.03' }
const response = (nodes: unknown[], page = 1, hasNextPage = false) => ({ productOfferV2: { nodes, pageInfo: { page, limit: 20, hasNextPage } } })

it('normalizes the real BR API image CDN and preserves the original title beside a concise display title', () => {
  const title='Pá de Aço Inoxidável com Malha de 2,8mm, Grande 28,5x14x6cm, Pá Robusta para Areia Aglomerante e Limpeza de Resíduos'
  const product=shopeeCatalogItem({...row,productName:title,imageUrl:'https://cf.shopee.com.br/file/br-11134207-81z1k-meuvcvmcu41s4c'})!
  expect(product.imageUrl).toBe('https://down-br.img.susercontent.com/file/br-11134207-81z1k-meuvcvmcu41s4c')
  expect(imageUrl.safeParse(product.imageUrl).success).toBe(true)
  expect(product.title).toBe(title)
  expect(product.displayTitle!.length).toBeLessThanOrEqual(60)
  expect(product.displayTitle).toContain('2,8mm')
  expect(product.displayTitle).toContain('28,5x14x6cm')
  for(const image of ['https://cf.shopee.com.br.evil.test/file/id','https://cf.shopee.com.br@evil.test/file/id','http://cf.shopee.com.br/file/id','https://cf.shopee.com.br:8080/file/id','https://cf.shopee.com.br/internal']){
    expect(shopeeCatalogItem({...row,imageUrl:image})?.imageUrl).toBeNull()
  }
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('signs exactly the transmitted UTF-8 JSON using the official BR scheme and a fixed HTTPS origin', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
  const fetch = vi.fn(async () => Response.json({ data: response([]) }))
  vi.stubGlobal('fetch', fetch)
  const query = 'query($keyword:String!){productOfferV2(keyword:$keyword){nodes{itemId}}}'
  await shopeeRequest(credentials, query, { keyword: 'ração' })
  const body = JSON.stringify({ query, variables: { keyword: 'ração' } })
  const signature = createHash('sha256').update(credentials.appId + '1700000000' + body + credentials.secret).digest('hex')
  expect(shopeeAuthorization(credentials, body)).toBe(`SHA256 Credential=123456, Timestamp=1700000000, Signature=${signature}`)
  expect(fetch).toHaveBeenCalledWith('https://open-api.affiliate.shopee.com.br/graphql', expect.objectContaining({ body, redirect: 'error', cache: 'no-store', headers: expect.objectContaining({ Authorization: `SHA256 Credential=123456, Timestamp=1700000000, Signature=${signature}` }) }))
  now.mockRestore()
})

it.each([401,403,429,500])('handles HTTP provider failures without reflecting response contents (%s)', async status => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('provider-secret-sentinel', { status })))
  await expect(shopeeRequest(credentials, '{x}')).rejects.toMatchObject({ status: status === 500 ? 502 : status, message: expect.not.stringContaining('provider-secret-sentinel') })
})
it('rejects GraphQL partial data and redacts upstream errors and rejects oversized bodies', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ data: response([row]), errors: [{ message: 'secret-sentinel', extensions: { code: 10020 } }] })).mockResolvedValueOnce(new Response('x'.repeat(1024 * 1024 + 1)))
  vi.stubGlobal('fetch', fetch)
  await expect(shopeeRequest(credentials, '{x}')).rejects.toMatchObject({ status: 401, message: expect.not.stringContaining('secret-sentinel') })
  await expect(shopeeRequest(credentials, '{x}')).rejects.toMatchObject({ status: 502 })
})
it('parses exact money and identity without inventing discounts or seller reputation', () => {
  const item = shopeeCatalogItem({ ...row, priceDiscountRate: 35 })
  expect(item).toMatchObject({ id: 'SHP123_456', catalogId: 'SHP123_456', productUrl: 'https://shopee.com.br/product/123/456', priceCents: 2990, oldPriceCents: 4600, oldPriceEstimated:true, oldPriceSource: 'SHOPEE_ESTIMATED', reputation: { status: 'UNKNOWN' } })
  expect(shopeeCatalogItem({ ...row, priceMax: '39.90' })).toBeNull()
  expect(shopeeCatalogItem({ ...row, itemId: 999 })).toBeNull()
  expect(shopeeCatalogItem({ ...row, priceMin: '29.901', priceMax: '29.901' })).toBeNull()
  expect(shopeeCatalogItem({ ...row, periodEndTime: 1 })).toBeNull()
  expect(shopeeCatalogItem({ ...row, imageUrl: 'http://127.0.0.1/image' })?.imageUrl).toBeNull()
})
it('derives an explicitly estimated reference from the rounded discount', async () => {
  const discounted={...row,priceMin:'28.8',priceMax:'28.8',priceDiscountRate:3}
  expect(shopeeCatalogItem(discounted)).toMatchObject({priceCents:2880,reportedDiscountPercent:3,oldPriceCents:2969,oldPriceEstimated:true,oldPriceSource:'SHOPEE_ESTIMATED'})
  for(const priceDiscountRate of [undefined,null,0,-1,101,3.5,'3']) {
    expect(shopeeCatalogItem({...discounted,priceDiscountRate})).toMatchObject({priceCents:2880,reportedDiscountPercent:null,oldPriceCents:null})
  }
  const request=vi.fn<(query:string)=>Promise<ReturnType<typeof response>>>(async()=>response([discounted]))
  expect((await searchShopeeCatalog('areia',request)).products[0].reportedDiscountPercent).toBe(3)
  expect(request.mock.calls[0][0]).toContain('priceDiscountRate')
  await refreshShopeeCatalogProduct(shopeeCatalogItem(discounted)!,request)
  expect(request.mock.calls[1][0]).toContain('priceDiscountRate')
})
it('bounds the inverse percentage calculation and rounds only to whole cents',()=>{
 expect(shopeePreviousPriceEstimate(2130,39)).toBe(3492)
 for(const rate of [undefined,null,0,100,101,-1,3.5])expect(shopeePreviousPriceEstimate(2130,rate)).toBeNull()
 expect(shopeePreviousPriceEstimate(100_000_000,99)).toBeNull()
 expect(shopeePreviousPriceEstimate(1,1)).toBeNull()
})
it('uses bounded variables for keyword pagination, honors hasNextPage and exposes unusable prices', async () => {
  const request = vi.fn(async () => response([row, { ...row, itemId: 457, productLink: 'https://shopee.com.br/product/123/457', priceMax: '39.90' }], 2, true))
  const result = await searchShopeeCatalog('ração "gato"', request, { offset: 20 })
  expect(request).toHaveBeenCalledWith(expect.any(String), { keyword: 'ração "gato"', page: 2 })
  expect(result.products).toHaveLength(1)
  expect(result.rejected).toEqual([expect.objectContaining({ id: 'SHP123_457', kind: 'PRICE_UNAVAILABLE' })])
  expect(result.pagination).toMatchObject({ offset: 20, hasNext: true, total: 41 })
  await expect(searchShopeeCatalog('ração', request, { offset: 1 })).rejects.toThrow()
})
it('keeps catalog image origins compatible with preview and outbound message validation', () => {
  for (const source of ['https://down-br.img.susercontent.com/file/test','https://shopee.com.br/image/test','https://susercontent.com.evil.test/image']) {
    const product = shopeeCatalogItem({...row,imageUrl:source})!
    expect(imageUrl.safeParse(product.imageUrl).success).toBe(true)
    expect(product.imageUrl).toBe(source === row.imageUrl ? source : null)
  }
})
it('refreshes only the exact product and never substitutes another shop or listing', async () => {
  const product = shopeeCatalogItem(row)!
  const request = vi.fn(async () => response([row]))
  await expect(refreshShopeeCatalogProduct(product, request)).resolves.toMatchObject({ id: product.id })
  expect(request).toHaveBeenCalledWith(expect.any(String), { shopId: '123', itemId: '456' })
  request.mockResolvedValueOnce(response([{ ...row, itemId: 777 }]))
  await expect(refreshShopeeCatalogProduct(product, request)).rejects.toMatchObject({ status: 409 })
})
it('creates links only through the official mutation and validates the returned host', async () => {
  const request = vi.fn(async () => ({ generateShortLink: { shortLink: 'https://s.shopee.com.br/test123' } }))
  await expect(generateShopeeAffiliateLink(row.productLink, credentials.subIds, request)).resolves.toMatchObject({ url: 'https://s.shopee.com.br/test123', itemId: 'SHP123_456' })
  expect(request).toHaveBeenCalledWith(expect.stringContaining('generateShortLink'), { input: { originUrl: 'https://shopee.com.br/product/123/456', subIds: ['catalogo'] } })
  request.mockResolvedValueOnce({ generateShortLink: { shortLink: 'https://evil.test/link' } })
  await expect(generateShopeeAffiliateLink(row.productLink, [], request)).rejects.toMatchObject({ status: 400 })
})
it.each(['https://shopee.com.br.evil.test/product/123/456','https://shopee.com.br@evil.test/product/123/456','http://shopee.com.br/product/123/456','https://s.shopee.com.br/short','https://shopee.com.br:8080/product/123/456'])('rejects unsafe or unresolved product URLs (%s)', value => {
  expect(() => shopeeProductIdentity(value)).toThrow()
})
it('keeps Mercado Livre identities compatible and namespaces Shopee listings', () => {
  expect(affiliateProductId.parse('MLB123')).toBe('MLB123')
  expect(affiliateProductId.parse('SHP123_456')).toBe('SHP123_456')
  expect(affiliateProductUrl('https://shopee.com.br/title-i.123.456?utm_source=test').href).toBe('https://shopee.com.br/product/123/456')
  expect(affiliateProductUrl('https://www.mercadolivre.com.br/p/MLB123?wid=MLB456').hostname).toBe('produto.mercadolivre.com.br')
})
