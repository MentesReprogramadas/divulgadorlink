import { describe, expect, it } from 'vitest'
import { affiliateSellerUrl, affiliateSessionSchema, authenticatedAffiliateResult, affiliateResult, catalogItem, mercadoLivreProductUrl, priceCents } from './mercado-livre'

describe('Mercado Livre product contracts', () => {
  it('keeps centavos exact and rejects missing, nonnumeric and excessive prices', () => {
    expect(priceCents(39.9)).toBe(3990)
    expect(priceCents(19.99)).toBe(1999)
    expect(priceCents(0.001)).toBeNull()
    for (const value of [0, -1, '39,90', null, Infinity, 1000001]) expect(priceCents(value)).toBeNull()
  })

  it('restricts URLs to HTTPS Mercado Livre product hosts without credentials or ports', () => {
    expect(mercadoLivreProductUrl('https://produto.mercadolivre.com.br/MLB-123-produto').hostname).toBe('produto.mercadolivre.com.br')
    expect(mercadoLivreProductUrl('https://meli.la/abc').hostname).toBe('meli.la')
    for (const value of ['http://meli.la/abc', 'https://meli.la.evil.test/a', 'https://evil.test', 'https://x:y@meli.la/a', 'https://meli.la:8443/a']) {
      expect(() => mercadoLivreProductUrl(value)).toThrow()
    }
  })

  it('keeps the seller item in the catalog URL and only publishes genuine reference discounts', () => {
    const offer = catalogItem({ id: 'MLB123', name: 'Presente Natal', pictures: [{ url: 'https://http2.mlstatic.com/test.jpg' }] }, { item_id: 'MLB456', currency_id: 'BRL', condition: 'new', status: 'active', available_quantity: 3, price: 39.9, original_price: 59.9 }, new Date('2026-10-28T00:00:00Z'))
    expect(offer).toMatchObject({ id: 'MLB456', catalogId: 'MLB123', priceCents: 3990, oldPriceCents: 5990, title: 'Presente Natal' })
    expect(new URL(offer!.productUrl).searchParams.get('wid')).toBe('MLB456')
    expect(catalogItem({ id: 'MLB123', name: 'Presente' }, { item_id: 'MLB456', currency_id: 'BRL', condition: 'new', price: 39.9, original_price: 20 })?.oldPriceCents).toBeNull()
  })

  it('rejects non-BRL, used, inactive and unavailable items', () => {
    const product = { id: 'MLB123', name: 'Presente Natal' }
    const item = { item_id: 'MLB456', currency_id: 'BRL', condition: 'new', price: 40 }
    for (const patch of [{ currency_id: 'USD' }, { condition: 'used' }, { status: 'paused' }, { available_quantity: 0 }, { item_id: 'MLA1' }]) expect(catalogItem(product, { ...item, ...patch })).toBeNull()
  })

  it('keeps a verified current price when reference price evidence is absent or invalid', () => {
    const product = { id: 'MLB123', name: 'Presente Natal' }
    const item = { item_id: 'MLB456', currency_id: 'BRL', condition: 'new', price: 39.9 }
    for (const original_price of [undefined, null, '59.90', {}, -1, 0, Infinity, 39.999]) {
      expect(catalogItem(product, { ...item, original_price })).toMatchObject({ priceCents: 3990, oldPriceCents: null, oldPriceSource: null })
    }
    expect(catalogItem(product, { ...item, price: '39.90', original_price: 59.9 })).toBeNull()
  })

  it('validates generated affiliate attribution against configured identity', () => {
    const value = { url: 'https://meli.la/test', fullUrl: 'https://www.mercadolivre.com.br/social/minhaconta?matt_word=minhatag&matt_tool=123&ref=x', tag: 'minhatag', profile: 'minhaconta' }
    expect(affiliateResult(value, 'minhatag', 'minhaconta').url).toBe(value.url)
    expect(() => affiliateResult({ ...value, tag: 'terceiro' }, 'minhatag', 'minhaconta')).toThrow()
    expect(() => affiliateResult({ ...value, fullUrl: value.fullUrl.replace('minhatag', 'terceiro') }, 'minhatag', 'minhaconta')).toThrow()
    expect(() => affiliateResult(value, '', '')).toThrow()
  })
})


describe('Own session trust boundary', () => {
  const session = { cookie: 'ssid=private; test=value', csrf: 'csrf-token', tag: 'minhatag', profile: 'minhaconta', accountLabel: 'Minha conta' }
  const full = 'https://www.mercadolivre.com.br/social/minhaconta?matt_word=minhatag&matt_tool=123&ref=x'
  const envelope = { status: 200, total_items: 1, total_success: 1, total_error: 0, urls: [{ origin_url: 'https://produto.mercadolivre.com.br/MLB-456-_JM', tag: 'minhatag', type_url: 'SOCIAL_PROFILE_ENCRYPTED', short_url: 'https://meli.la/test', long_url: full }] }
  it('bounds secrets and rejects injected headers, missing ssid and unexpected fields', () => {
    expect(affiliateSessionSchema.parse(session)).toEqual(session)
    for (const patch of [{ cookie: 'a=1' }, { cookie: 'ssid=x\r\nHost: evil' }, { cookie: 'ssid=' + 'x'.repeat(24000) }, { csrf: 'a b c d e' }, { tag: 'x&evil=1' }, { profile: '../other' }, { accountLabel: '' }, { accessToken: 'unexpected' }]) expect(affiliateSessionSchema.safeParse({ ...session, ...patch }).success).toBe(false)
  })
  it('normalizes only an exact item and rejects conflicting or absent sellers', () => {
    expect(affiliateSellerUrl('https://www.mercadolivre.com.br/p/MLB123?wid=MLB456&pdp_filters=item_id:MLB456').href).toBe(envelope.urls[0].origin_url)
    for (const url of ['https://www.mercadolivre.com.br/p/MLB123', 'https://www.mercadolivre.com.br/p/MLB123?wid=MLB456&pdp_filters=item_id:MLB999', 'https://evil.mercadolivre.com.br/MLB-456-_JM', 'https://meli.la/test']) expect(() => affiliateSellerUrl(url)).toThrow()
  })
  it('requires authenticated success counts, exact item and matching attribution', () => {
    expect(authenticatedAffiliateResult(envelope, envelope.urls[0].origin_url, session.tag, session.profile).url).toBe('https://meli.la/test')
    for (const patch of [{ total_success: 0 }, { total_error: 1 }, { urls: [{ ...envelope.urls[0], origin_url: 'https://produto.mercadolivre.com.br/MLB-999-_JM' }] }, { urls: [{ ...envelope.urls[0], tag: 'other' }] }, { urls: [{ ...envelope.urls[0], long_url: full.replace('minhaconta', 'other') }] }]) expect(() => authenticatedAffiliateResult({ ...envelope, ...patch }, envelope.urls[0].origin_url, session.tag, session.profile)).toThrow()
  })
})
