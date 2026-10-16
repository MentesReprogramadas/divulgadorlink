// @vitest-environment node
import { createServer } from 'node:http'
import { afterEach, expect, it, vi } from 'vitest'
import { forward } from './upstream'

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })
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
