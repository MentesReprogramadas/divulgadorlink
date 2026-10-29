import { afterEach, describe, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { affiliateCatalogGatewayRequest, affiliateCatalogGatewayRequests, affiliateCatalogGatewayStatus } from './catalog-gateway'
import { generateAffiliateLink } from './mercado-livre'

const previousNodeEnv = env.NODE_ENV
afterEach(() => { env.NODE_ENV = previousNodeEnv; vi.unstubAllGlobals() })
const settings = { url: 'http://127.0.0.1:4452', key: 'bridge-secret-never-browser' }

describe('Authenticated central catalog gateway', () => {
  it('permits only numeric seller lookup and preserves an actual provider pagination refusal',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({seller_reputation:{level_id:'5_green'}})).mockResolvedValueOnce(new Response('{}',{status:400}))
    vi.stubGlobal('fetch',fetcher)
    expect(await affiliateCatalogGatewayRequest(settings,'/users/3764961247')).toMatchObject({seller_reputation:{level_id:'5_green'}})
    await expect(affiliateCatalogGatewayRequest(settings,'/products/search?site_id=MLB&q=Natal&limit=20&offset=120')).rejects.toMatchObject({status:400})
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('batches bounded whitelisted paths, maps absent sellers, and preserves denied queries', async () => {
    const paths = ['/products/MLB123/items?limit=100', '/products/MLB456/items?limit=100', '/products/MLB789/items?limit=100']
    const fetcher = vi.fn().mockResolvedValue(Response.json({ results: paths.map((path, index) => ({ path, status: [200, 404, 403][index], body: index ? { secret: 'private' } : { results: [{ item_id: 'MLB999' }] } })) }))
    vi.stubGlobal('fetch', fetcher)
    const result = await affiliateCatalogGatewayRequests(settings)(paths)
    expect(result[0]).toMatchObject({ status: 'fulfilled', value: { results: [{ item_id: 'MLB999' }] } })
    expect(result[1]).toEqual({ status: 'fulfilled', value: { results: [], paging: { total: 0 } } })
    expect(result[2]).toMatchObject({ status: 'rejected', reason: { status: 403 } })
    expect(JSON.stringify(result)).not.toContain('private')
    expect(fetcher).toHaveBeenCalledOnce()
    await expect(affiliateCatalogGatewayRequests(settings)(Array(11).fill(paths[0]))).rejects.toMatchObject({ status: 400 })
    await expect(affiliateCatalogGatewayRequests(settings)(['/oauth/token'])).rejects.toMatchObject({ status: 400 })
  })
  it('rejects a reordered batch instead of assigning a price to a different catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [{ path: '/products/MLB456/items?limit=100', status: 200, body: { results: [] } }] })))
    await expect(affiliateCatalogGatewayRequests(settings)(['/products/MLB123/items?limit=100'])).rejects.toMatchObject({ status: 502 })
  })
  it('falls back to ordinary requests when an older gateway lacks batch support', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 404 })).mockResolvedValueOnce(new Response('{}', { status: 404 }))
    vi.stubGlobal('fetch', fetcher)
    expect(await affiliateCatalogGatewayRequests(settings)(['/products/MLB123/items?limit=100'])).toEqual([{ status: 'fulfilled', value: { results: [], paging: { total: 0 } } }])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('permits exact loopback only in dev/test and never follows redirects with the key', async () => {
    env.NODE_ENV = 'test'
    const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [] }))
    vi.stubGlobal('fetch', fetcher)
    await affiliateCatalogGatewayRequest(settings, '/products/search?site_id=MLB&q=presente')
    expect(fetcher).toHaveBeenCalledWith(new URL('http://127.0.0.1:4452/catalog/request'), expect.objectContaining({ redirect: 'error', headers: expect.objectContaining({ Authorization: 'Bearer bridge-secret-never-browser' }) }))
    env.NODE_ENV = 'production'
    await expect(affiliateCatalogGatewayRequest(settings, '/products/search?site_id=MLB&q=presente')).rejects.toMatchObject({ status: 503 })
    await expect(affiliateCatalogGatewayRequest({ ...settings, url: 'https://localhost:4452' }, '/products/search?site_id=MLB&q=presente')).rejects.toMatchObject({ status: 503 })
    env.NODE_ENV = 'test'
    await expect(affiliateCatalogGatewayRequest({ ...settings, url: 'http://127.0.0.1.evil.test:4452' }, '/products/search?site_id=MLB')).rejects.toMatchObject({ status: 503 })
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('validates whitelisted paths before forwarding authenticated requests', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    for (const path of ['//evil.test', '/users/me', '/oauth/token', '/products/search?x=y#fragment', '/products/MLB1/items?x=' + 'x'.repeat(4096)]) await expect(affiliateCatalogGatewayRequest(settings, path)).rejects.toMatchObject({ status: 400 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('projects only safe status fields and treats expired access as reconnect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ configured: true, connected: true, clientId: '123456', status: 'CONNECTED', expiresAt: Date.now() - 10, accessToken: 'source-secret', refreshToken: 'never-import' })))
    const result = await affiliateCatalogGatewayStatus(settings)
    expect(result).toMatchObject({ connected: false, status: 'RECONNECT' })
    expect(JSON.stringify(result)).not.toMatch(/source-secret|never-import|accessToken|refreshToken/)
  })

  it('fails safely for incomplete configuration or malformed status without forwarding secrets', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ connected: true, accessToken: 'source-secret' }))
    vi.stubGlobal('fetch', fetcher)
    await expect(affiliateCatalogGatewayStatus({ url: settings.url })).rejects.toMatchObject({ status: 503 })
    expect(fetcher).not.toHaveBeenCalled()
    await expect(affiliateCatalogGatewayStatus(settings)).rejects.toMatchObject({ status: 502 })
    await expect(affiliateCatalogGatewayStatus(settings)).rejects.not.toThrow('source-secret')
  })

  it('preserves 413/429 and redacts error bodies and network errors', async () => {
    for (const [status, expected] of [[413, 413], [429, 429], [401, 409], [500, 502]]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bridge-secret-never-browser source-secret', { status })))
      await expect(affiliateCatalogGatewayRequest(settings, '/products/search?site_id=MLB')).rejects.toMatchObject({ status: expected })
      await expect(affiliateCatalogGatewayRequest(settings, '/products/search?site_id=MLB')).rejects.not.toThrow('source-secret')
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('bridge-secret-never-browser')))
    await expect(affiliateCatalogGatewayStatus(settings)).rejects.not.toThrow('bridge-secret-never-browser')
  })

  it('cancels oversized responses before reading the whole stream', async () => {
    const cancel = vi.fn(), chunk = new Uint8Array(600000)
    let count = 0
    const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => { if (count++ < 8) controller.enqueue(chunk); else controller.close() })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ pull, cancel }))))
    await expect(affiliateCatalogGatewayStatus(settings)).rejects.toMatchObject({ status: 502 })
    expect(cancel).toHaveBeenCalledOnce()
    expect(pull.mock.calls.length).toBeLessThan(5)
  })

  it('allows the local affiliate bridge in test but rejects it in production', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ url: 'https://meli.la/a', fullUrl: 'https://www.mercadolivre.com.br/social/profile?matt_word=tag&matt_tool=t&ref=r', tag: 'tag', profile: 'profile' }))
    vi.stubGlobal('fetch', fetcher)
    const generation = { ...settings, tag: 'tag', profile: 'profile' }
    env.NODE_ENV = 'test'
    expect(await generateAffiliateLink('https://www.mercadolivre.com.br/p/MLB123?wid=MLB456', generation)).toMatchObject({ url: 'https://meli.la/a' })
    env.NODE_ENV = 'production'
    await expect(generateAffiliateLink('https://meli.la/product', generation)).rejects.toMatchObject({ status: 503 })
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
