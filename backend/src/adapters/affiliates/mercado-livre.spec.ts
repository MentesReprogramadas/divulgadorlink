import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateAffiliateLink, mercadoLivreRequest, searchMercadoLivreCatalog, exchangeMercadoLivreToken } from './mercado-livre'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'

afterEach(() => vi.unstubAllGlobals())

describe('Mercado Livre connector', () => {
  it('batches distinct seller reputations after complete price comparisons', async () => {
    const records = Array.from({ length: 20 }, (_, index) => ({ id: `MLB${100 + index}`, name: `Produto ${index}` }))
    const request = vi.fn(async () => ({ results: records }))
    const calls: string[][] = []
    const requestMany = vi.fn(async (paths: string[]) => {
      calls.push(paths)
      return paths.map(path => ({ status: 'fulfilled' as const, value: path.startsWith('/users/') ? { seller_reputation: { level_id: '5_green' } } : { results: [{ item_id: `MLB${path.match(/MLB(\d+)/)![1]}9`, seller_id: 1000 + Number(path.match(/MLB(\d+)/)![1]) % 11, price: 39.9, currency_id: 'BRL', condition: 'new' }], paging: { total: 1 } } }))
    })
    const result = await searchMercadoLivreCatalog('produto', request, requestMany)
    expect(result.products).toHaveLength(20)
    expect(result.products.every(product => product.reputation?.status === 'GREEN')).toBe(true)
    expect(request).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(4)
    expect(calls.slice(0, 2).flat().every(path => path.startsWith('/products/'))).toBe(true)
    const reputationPaths = calls.slice(2).flat()
    expect(reputationPaths).toHaveLength(11)
    expect(new Set(reputationPaths).size).toBe(11)
    expect(calls.every(paths => paths.length <= 10)).toBe(true)
  })
  it('deduplicates fallback reputation requests and keeps unavailable reputation unknown', async () => {
    const request = vi.fn(async (path: string) => {
      if (path.startsWith('/products/search')) return { results: [{ id: 'MLB100', name: 'Produto A' }, { id: 'MLB101', name: 'Produto B' }] }
      if (path.startsWith('/users/')) throw new AffiliateCatalogError(502, 'unavailable')
      return { results: [{ item_id: `MLB${path.includes('MLB100') ? '900' : '901'}`, seller_id: 123, price: 39.9, currency_id: 'BRL', condition: 'new' }] }
    })
    const result = await searchMercadoLivreCatalog('produto', request)
    expect(request.mock.calls.filter(([path]) => path.startsWith('/users/'))).toHaveLength(1)
    expect(result.products).toHaveLength(2)
    expect(result.products.every(product => product.reputation?.status === 'UNKNOWN')).toBe(true)
    expect(result.counts.failed).toBe(0)
  })
  it.each([401, 403, 409, 413, 429])('propagates reputation authorization and service limits (%s) for both transports', async status => {
    for (const batch of [false, true]) {
      const request = async (path: string): Promise<unknown> => {
        if (path.startsWith('/products/search')) return { results: [{ id: 'MLB100', name: 'Produto A' }] }
        if (path.startsWith('/users/')) throw new AffiliateCatalogError(status, 'restricted')
        return { results: [{ item_id: 'MLB900', seller_id: 123, price: 39.9, currency_id: 'BRL', condition: 'new' }] }
      }
      await expect(searchMercadoLivreCatalog('produto', request, batch ? paths => Promise.allSettled(paths.map(request)) : undefined)).rejects.toMatchObject({ status })
    }
  })
  it('distinguishes missing listings, ineligible items, unavailable prices and failed lookups', async () => {
    const records = Array.from({ length: 5 }, (_, index) => ({ id: `MLB${index + 100}`, name: `Produto ${index}` }))
    const request = async (path: string) => {
      if (path.startsWith('/products/search')) return { results: records }
      if (path.includes('/MLB104/')) throw new Error('provider unavailable')
      const item = { item_id: 'MLB999', currency_id: 'BRL', condition: 'new', price: 39.9 }
      return { results: path.includes('/MLB100/') ? [item] : path.includes('/MLB101/') ? [] : path.includes('/MLB102/') ? [{ ...item, condition: 'used' }] : [{ ...item, price: null }], paging: { total: path.includes('/MLB101/') ? 0 : 1 } }
    }
    const result = await searchMercadoLivreCatalog('produto', request)
    expect(result.products).toHaveLength(1)
    expect(result.rejected).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'MLB101', kind: 'NO_LISTINGS' }),
      expect.objectContaining({ id: 'MLB102', kind: 'INELIGIBLE' }),
      expect.objectContaining({ id: 'MLB103', kind: 'PRICE_UNAVAILABLE' }),
      expect.objectContaining({ id: 'MLB104', kind: 'LOOKUP_FAILED' }),
    ]))
    expect(result.rejected.find(item => item.id === 'MLB101')?.reason).not.toContain('preço')
    expect(JSON.stringify(result)).not.toContain('provider unavailable')
  })
  it('supports bounded discovery paging without altering default search paths', async () => {
    const request = vi.fn(async () => ({ results: [] }))
    await searchMercadoLivreCatalog('Natal', request, undefined, { offset: 40 })
    expect(request).toHaveBeenCalledWith('/products/search?status=active&site_id=MLB&q=Natal&limit=20&offset=40')
    await searchMercadoLivreCatalog('Natal', request, undefined, { offset: 60 })
    expect(request).toHaveBeenCalledTimes(2)
  })
  it('checks beyond the first four catalog records and explains records without offers', async () => {
    const records = Array.from({ length: 20 }, (_, index) => ({ id: `MLB${index + 100}`, name: `Presente ${index}` }))
    const request = vi.fn(async (path: string) => path.startsWith('/products/search') ? { results: records, paging: { total: 10000 } } : { results: path.includes('/MLB112/') ? [{ item_id: 'MLB999', currency_id: 'BRL', condition: 'new', price: 19.9 }] : [], paging: { total: path.includes('/MLB112/') ? 1 : 0 } })
    const result = await searchMercadoLivreCatalog('Natal', request)
    expect(result.products).toHaveLength(1)
    expect(result.products[0].id).toBe('MLB999')
    expect(result.counts).toEqual({ catalogsFound: 10000, catalogsChecked: 20, withoutOffers: 19, failed: 0 })
    expect(result.warnings).toEqual([])
  })
  it('treats a missing catalog seller resource as no current offers, while search 404 remains an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status: 404 }))))
    await expect(mercadoLivreRequest('/products/MLB123/items?limit=100', 'SECRET')).resolves.toEqual({ results: [], paging: { total: 0 } })
    await expect(mercadoLivreRequest('/products/search?q=natal', 'SECRET')).rejects.toMatchObject({ status: 502 })
  })

  it('não libera link quando o provedor bloqueia a confirmação do produto/vendedor',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'affiliate_resolution_unavailable'},{status:502})))
    await expect(generateAffiliateLink('https://meli.la/fixture',{url:'https://private-generator.test',key:'private',tag:'tag',profile:'profile'})).rejects.toThrow('confirmação do produto/vendedor')
  })
  it('distingue recusa de sessão de resposta de geração não confirmada sem sugerir link manual',async()=>{
    const settings={url:'https://private-generator.test',key:'private',tag:'tag',profile:'profile'}
    for(const [error,status,message] of [['affiliate_provider_rejected',409,'recusou a sessão'],['affiliate_session_missing',409,'sessão de afiliado'],['affiliate_response_unconfirmed',502,'vínculo entre o anúncio']] as const){
      vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error},{status})))
      await expect(generateAffiliateLink('https://meli.la/fixture',settings)).rejects.toThrow(message)
    }
  })
  it('distinguishes permission and rate failures from empty catalogs and never returns provider secrets', async () => {
    for (const status of [403, 429, 500]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'token=SECRET' }), { status })))
      await expect(mercadoLivreRequest('/products/search?site_id=MLB', 'SECRET')).rejects.toMatchObject({ status: status === 429 ? 429 : status === 403 ? 403 : 502 })
      await expect(mercadoLivreRequest('/products/search?site_id=MLB', 'SECRET')).rejects.not.toThrow('SECRET')
    }
  })

  it('does not send a token to arbitrary paths or redirects', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [] }))
    vi.stubGlobal('fetch', fetcher)
    await expect(mercadoLivreRequest('//evil.test', 'SECRET')).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
    await mercadoLivreRequest('/products/search?site_id=MLB', 'SECRET')
    expect(fetcher).toHaveBeenCalledWith('https://api.mercadolibre.com/products/search?site_id=MLB', expect.objectContaining({ redirect: 'error', headers: expect.objectContaining({ Authorization: 'Bearer SECRET' }) }))
  })

  it('keeps exact seller identity and excludes incomplete seller comparisons', async () => {
    const request = vi.fn(async (path: string) => path.startsWith('/products/search') ? { results: [{ id: 'MLB123', name: 'Presente Natal' }, { id: 'MLB456', name: 'Outro presente' }] } : path.startsWith('/products/MLB123/') ? { results: [{ item_id: 'MLB777', currency_id: 'BRL', condition: 'new', price: 49.9 }, { item_id: 'MLB888', currency_id: 'BRL', condition: 'new', price: 39.9 }], paging: { total: 2 } } : { results: [{ item_id: 'MLB999', currency_id: 'BRL', condition: 'new', price: 19.9 }], paging: { total: 700 } })
    const result = await searchMercadoLivreCatalog('natal', request)
    expect(result.products).toHaveLength(1)
    expect(result.products[0]).toMatchObject({ id: 'MLB888', priceCents: 3990 })
    expect(result.warnings).toHaveLength(1)
  })

  it('rejects an invalid token envelope without exposing its body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ access_token: 'SECRET', refresh_token: 'REFRESH', expires_in: -1 })))
    await expect(exchangeMercadoLivreToken({ grant_type: 'refresh_token' })).rejects.toMatchObject({ status: 502 })
  })

  it('uses only a server-configured affiliate generator and validates identity', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ url: 'https://meli.la/generated', fullUrl: 'https://www.mercadolivre.com.br/social/me?matt_word=tag&matt_tool=t&ref=r', tag: 'tag', profile: 'me' }))
    vi.stubGlobal('fetch', fetcher)
    const settings = { url: 'https://affiliate.example.test', key: 'server-key', tag: 'tag', profile: 'me' }
    expect(await generateAffiliateLink('https://www.mercadolivre.com.br/p/MLB123?wid=MLB456', settings)).toMatchObject({ url: 'https://meli.la/generated' })
    expect(fetcher).toHaveBeenCalledWith('https://affiliate.example.test/api/generate', expect.objectContaining({ body: JSON.stringify({ url: 'https://www.mercadolivre.com.br/p/MLB123?wid=MLB456' }), redirect: 'error' }))
    await expect(generateAffiliateLink('https://evil.test', settings)).rejects.toThrow()
    await expect(generateAffiliateLink('https://meli.la/x', { ...settings, url: 'http://evil.test' })).rejects.toThrow()
  })
})
