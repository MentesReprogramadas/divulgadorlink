import { createCipheriv, randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAffiliateBridge } from './affiliate-bridge'

const key = 'bridge-test-key-with-at-least-32-characters'
const encryption = randomBytes(32)
const seller = 'https://produto.mercadolivre.com.br/MLB-456-_JM'
const fullUrl = 'https://www.mercadolivre.com.br/social/profile?matt_word=tag&matt_tool=tool&ref=reference'
const envelope = { status: 200, total_items: 1, total_success: 1, total_error: 0, urls: [{ origin_url: seller, tag: 'tag', type_url: 'SOCIAL_PROFILE_ENCRYPTED', short_url: 'https://meli.la/test', long_url: fullUrl }] }
const cleanups: Array<() => Promise<void>> = []
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup() })
const seal = (value: string) => {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryption, iv)
  return `${iv.toString('base64url')}.${Buffer.concat([cipher.update(value), cipher.final(), cipher.getAuthTag()]).toString('base64url')}`
}

async function fixture(transport: typeof fetch = vi.fn(async () => Response.json({ results: [] })), expires = Date.now() + 3600000) {
  const directory = mkdtempSync(join(tmpdir(), 'affiliate-bridge-')), path = join(directory, 'fitness.db')
  const db = new DatabaseSync(path)
  db.exec('CREATE TABLE ml_connections(id TEXT PRIMARY KEY,client_id TEXT,status TEXT,expires_at INTEGER,access_token TEXT); CREATE TABLE affiliate_sessions(id TEXT PRIMARY KEY,credentials TEXT)')
  db.prepare('INSERT INTO ml_connections VALUES (?,?,?,?,?)').run('primary', 'public-client', 'connected', expires, seal('private-access-token'))
  db.prepare('INSERT INTO affiliate_sessions VALUES (?,?)').run('primary', seal(JSON.stringify({ cookie: 'ssid=private-cookie', csrf: 'private-csrf' })))
  const server = createAffiliateBridge({ databasePath: path, key, encryptionKey: encryption.toString('base64url'), tag: 'tag', profile: 'profile', fetch: transport })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No listener')
  const call = (route: string, body?: unknown, authorization = `Bearer ${key}`) => fetch(`http://127.0.0.1:${address.port}${route}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) })
  cleanups.push(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); db.close(); rmSync(directory, { recursive: true, force: true }) })
  return { call, db }
}

describe('read-only production affiliate bridge', () => {
  it('requires its separate bearer key and returns only public connection status', async () => {
    const { call } = await fixture()
    expect((await call('/catalog/status', undefined, 'Bearer wrong')).status).toBe(401)
    const response = await call('/catalog/status')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ configured: true, connected: true, clientId: 'public-client', status: 'CONNECTED', expiresAt: expect.any(Number), affiliateSessionConfigured: true })
  })
  it('reads live owner updates without changing encrypted database values', async () => {
    const { call, db } = await fixture()
    const before = db.prepare('SELECT * FROM ml_connections').get()
    await call('/catalog/request', { path: '/products/search?q=phone' })
    expect(db.prepare('SELECT * FROM ml_connections').get()).toEqual(before)
    db.prepare('UPDATE ml_connections SET expires_at=0').run()
    expect((await call('/catalog/request', { path: '/users/123' })).status).toBe(409)
  })
  it('does not create a missing database or missing tables', () => {
    const directory = mkdtempSync(join(tmpdir(), 'affiliate-no-db-')), path = join(directory, 'missing.db')
    const open = () => createAffiliateBridge({ databasePath: path, key, encryptionKey: encryption.toString('base64url'), tag: 'tag', profile: 'profile' })
    try {
      expect(open).toThrow()
      new DatabaseSync(path).close()
      expect(open).toThrow()
      const db = new DatabaseSync(path)
      expect(db.prepare('SELECT name FROM sqlite_master').all()).toEqual([])
      db.close()
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })
  it('rejects malformed input, non-allowlisted paths and unknown endpoints before transport', async () => {
    const transport = vi.fn<typeof fetch>(), { call } = await fixture(transport)
    for (const path of ['https://evil.test', '//evil.test', '/users/me', '/items/MLB123', '/products/search?q=x#fragment', '/products/MLB123/items?x=1\r\nheader']) expect((await call('/catalog/request', { path })).status).toBe(400)
    for (const body of ['{', 'null', '[]']) expect((await call('/catalog/request', body)).status).toBe(400)
    expect((await call('/catalog/batch', { paths: [] })).status).toBe(400)
    expect((await call('/catalog/batch', { paths: Array(11).fill('/users/123') })).status).toBe(400)
    expect((await call('/unknown')).status).toBe(404)
    expect(transport).not.toHaveBeenCalled()
  })
  it('only returns reputation from the private user response', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ id: 123, email: 'secret@example.test', address: 'private', seller_reputation: { level_id: '5_green', power_seller_status: 'gold', private: 'secret' } }))
    const { call } = await fixture(transport)
    expect(await (await call('/catalog/request', { path: '/users/123' })).json()).toEqual({ id: 123, seller_reputation: { level_id: '5_green', power_seller_status: 'gold' } })
    expect(transport).toHaveBeenCalledWith('https://api.mercadolibre.com/users/123', expect.objectContaining({ redirect: 'error', headers: { Authorization: 'Bearer private-access-token', Accept: 'application/json' } }))
  })
  it('preserves source error statuses while removing provider error details', async () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
      const { call } = await fixture(vi.fn(async () => new Response('private-token-cookie-account', { status })))
      const result = await call('/catalog/request', { path: '/users/123' })
      expect(result.status).toBe(status === 500 ? 502 : status)
      expect(await result.json()).toEqual({ error: 'provider_rejected' })
    }
  })
  it('bounds concurrent batches globally to two provider requests and retains order', async () => {
    let active = 0, maximum = 0
    const { call } = await fixture(vi.fn(async () => { active++; maximum = Math.max(maximum, active); await new Promise(resolve => setTimeout(resolve, 10)); active--; return Response.json({ results: [] }) }))
    const paths = Array.from({ length: 10 }, (_, i) => `/products/search?q=${i}`)
    const responses = await Promise.all([call('/catalog/batch', { paths }), call('/catalog/batch', { paths })])
    for (const response of responses) expect((await response.json() as { results: Array<{ path: string }> }).results.map(result => result.path)).toEqual(paths)
    expect(maximum).toBe(2)
  })
  it('verifies seller, tag, profile and authenticated envelope before returning links', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json(envelope)), { call } = await fixture(transport)
    expect(await (await call('/api/generate', { url: 'https://www.mercadolivre.com.br/p/MLB123?wid=MLB456' })).json()).toEqual({ url: 'https://meli.la/test', fullUrl, tag: 'tag', profile: 'profile' })
    expect(JSON.parse(transport.mock.calls[0][1]?.body as string)).toEqual({ urls: [seller], tag: 'tag' })
    for (const row of [{ ...envelope.urls[0], origin_url: seller.replace('456', '999') }, { ...envelope.urls[0], tag: 'wrong' }, { ...envelope.urls[0], long_url: fullUrl.replace('/profile?', '/wrong?') }]) {
      transport.mockResolvedValueOnce(Response.json({ ...envelope, urls: [row] }))
      expect((await call('/api/generate', { url: seller })).status).toBe(502)
    }
    for (const url of ['https://evil.test/MLB-456', 'https://meli.la/test', 'https://www.mercadolivre.com.br/p/MLB123']) expect((await call('/api/generate', { url })).status).toBe(400)
  })
  it('rejects invalid session credentials and sanitizes unseal errors', async () => {
    const transport = vi.fn<typeof fetch>(), { call, db } = await fixture(transport)
    db.prepare('UPDATE affiliate_sessions SET credentials=?').run(seal(JSON.stringify({ cookie: 'ssid=secret\r\nInjected', csrf: 'private-csrf' })))
    expect((await call('/api/generate', { url: seller })).status).toBe(409)
    db.prepare('UPDATE affiliate_sessions SET credentials=?').run('private-corrupted-secret')
    expect(await (await call('/api/generate', { url: seller })).json()).toEqual({ error: 'central_provider_unavailable' })
    expect(transport).not.toHaveBeenCalled()
  })
  it('rejects oversized provider and aggregate responses', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ data: 'x'.repeat(1000000) })), { call } = await fixture(transport)
    expect((await call('/catalog/request', { path: '/products/search?q=x' })).status).toBe(502)
    transport.mockImplementation(async () => Response.json({ data: 'x'.repeat(600000) }))
    expect((await call('/catalog/batch', { paths: ['/products/search?q=1', '/products/search?q=2'] })).status).toBe(502)
  })
  it('rejects request bodies above 8192 bytes', async () => {
    const { call } = await fixture()
    expect((await call('/api/generate', JSON.stringify({ url: 'x'.repeat(8192) }))).status).toBe(413)
  })
})
