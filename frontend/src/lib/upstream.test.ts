// @vitest-environment node
import { createServer } from 'node:http'
import { afterEach, expect, it, vi } from 'vitest'
import { forward } from './upstream'

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })
it('permits up to 2 MiB only for link submission and exact media upload routes', async () => {
  const received: Array<{ method: string | undefined; path: string | undefined; bytes: number }> = []
  const server = createServer((req, res) => {
    let bytes = 0
    req.on('data', (chunk: Buffer) => { bytes += chunk.length })
    req.on('end', () => { received.push({ method: req.method, path: req.url, bytes }); res.statusCode = 204; res.end() })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server')
  vi.stubEnv('API_ORIGIN', 'http://127.0.0.1:' + address.port)
  const allowed = [
    ['POST', '/api/v1/links'],
    ['POST', '/api/v1/links?source=catalog'],
    ['PUT', '/api/v1/links/cm-link_123/media/icon'],
    ['PUT', '/api/v1/links/cm-link_123/media/image?source=editor'],
  ] as const
  try {
    for (const [method, path] of allowed) {
      for (const bytes of [1024 * 1024 + 1, 2 * 1024 * 1024]) {
        const result = await forward({ method, path, host: 'fixture.test', body: Buffer.alloc(bytes, 'x') })
        expect(result.status, method + ' ' + path).toBe(204)
        expect(received.at(-1)).toEqual({ method, path, bytes })
      }
      const count = received.length
      const result = await forward({ method, path, host: 'fixture.test', body: Buffer.alloc(2 * 1024 * 1024 + 1, 'x') })
      expect(result.status, method + ' ' + path).toBe(413)
      expect(received).toHaveLength(count)
    }
    for (const [method, path] of [
      ['PUT', '/api/v1/links'], ['PATCH', '/api/v1/links'], ['GET', '/api/v1/links'],
      ['POST', '/api/v1/links/cm123/media/icon'], ['DELETE', '/api/v1/links/cm123/media/image'],
      ['PATCH', '/api/v1/links/cm123/media/image'], ['PUT', '/api/v1/links/cm123/media/private'],
      ['POST', '/v1/links'], ['POST', '/api/v1/links/'], ['POST', '/api/v1/links/submission-started'],
      ['POST', '/api/v1/links/../users'], ['POST', '/api/v1/links%3Fignored'],
      ['POST', '/api/v1/users?next=/api/v1/links'], ['POST', '/api/v1/links#ignored'],
      ['POST', '//api/v1/links'], ['POST', 'http://fixture.test/api/v1/links'],
      ['PUT', '/api/v1/links/cm123/media/image/extra'], ['PUT', '/api/v1/links/cm123/media/image/'],
      ['PUT', '/api/v1/links/cm123/media/image%3Fignored'], ['PUT', '/api/v1/links/cm123%2Fother/media/image'],
      ['PUT', '/api/v1/links/../media/icon'], ['PUT', '/api/v1/links/cm123/media/icon/../../users'],
      ['PUT', '/api/v1/links/cm123/media?next=/image'], ['put', '/api/v1/links/cm123/media/image'],
      ['PUT', '/api/v1/links/cm123/media/image\n'], ['PUT', '/api/v1/links/cm123/media/icon\r'],
    ]) {
      const count = received.length
      const result = await forward({ method, path, host: 'fixture.test', body: Buffer.alloc(1024 * 1024 + 1, 'x') })
      expect(result.status, method + ' ' + path).toBe(413)
      expect(received).toHaveLength(count)
    }
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
it('F04 regression: API payload above the existing 1 MiB transport limit returns 413 before a socket write', async () => {
  let received = 0
  const server = createServer((req, res) => { received++; req.resume(); req.on('end', () => { res.statusCode = 204; res.end() }) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server')
  vi.stubEnv('API_ORIGIN', 'http://127.0.0.1:' + address.port)
  try {
    const result = await forward({ method: 'POST', path: '/oversize', host: 'fixture.test', body: Buffer.alloc(1024 * 1024 + 1, 'x') })
    expect(result.status).toBe(413); expect(received).toBe(0)
    expect(JSON.parse(result.body.toString())).toMatchObject({ code: 'validation' })
    expect((await forward({ method: 'POST', path: '/boundary', host: 'fixture.test', body: Buffer.alloc(1024 * 1024, 'x') })).status).toBe(204)
    expect(received).toBe(1)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
it('F03-C03 optional deadline aborts a stalled transport and legacy calls still forward host/cookie', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/stall') return
    res.end(JSON.stringify({ host: req.headers.host, cookie: req.headers.cookie }))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server')
  vi.stubEnv('API_ORIGIN', 'http://127.0.0.1:' + address.port)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await expect(forward({ method: 'GET', path: '/stall', host: 'fixture.test', timeoutMs: 50 })).rejects.toMatchObject({ name: 'AbortError' })
    const result = await forward({ method: 'GET', path: '/ok', host: 'fixture.test', cookie: 'age=yes' })
    expect(result.status).toBe(200); expect(JSON.parse(result.body.toString())).toEqual({ host: 'fixture.test', cookie: 'age=yes' })
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})

it('F08 transports privacy opt-outs and the explicit test marker across the BFF boundary', async () => {
  const server = createServer((req, res) => res.end(JSON.stringify({ dnt: req.headers.dnt, gpc: req.headers['sec-gpc'], test: req.headers['x-analytics-test'] })))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing test server')
  vi.stubEnv('API_ORIGIN', 'http://127.0.0.1:' + address.port)
  try {
    const result = await forward({ method: 'GET', path: '/search', host: 'fixture.test', dnt: '1', gpc: '1', analyticsTest: '1' })
    expect(JSON.parse(result.body.toString())).toEqual({ dnt: '1', gpc: '1', test: '1' })
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
