// @vitest-environment node
import { createServer } from 'node:http'
import { afterEach, expect, it, vi } from 'vitest'
import { POST, OPTIONS } from './route'

afterEach(() => vi.unstubAllEnvs())
const context = { params: Promise.resolve({ slug: 'pets' }) }
function request(body: unknown, extra: Record<string, string> = {}) { return new Request('http://localhost:3000/api/affiliate-entry/pets', { method: 'POST', headers: { origin: 'https://pets.temlinkaqui.com', host: 'temlinkaqui.com', 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) }) }
it('isolates credentials, forwards real user agent, strips source query, and honors opt outs with an HTTP fixture', async () => {
  const received: { body: Record<string, unknown>; headers: import('node:http').IncomingHttpHeaders; path?: string }[] = []
  const server = createServer((req, res) => { let raw = ''; req.on('data', chunk => { raw += chunk }); req.on('end', () => { received.push({ body: JSON.parse(raw), headers: req.headers, path: req.url }); res.setHeader('set-cookie', 'admin=never'); res.end(JSON.stringify({ joinUrl: 'https://temlinkaqui.com/ofertas/entrar/pets', tracked: true })) }) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address(); if (!address || typeof address === 'string') throw Error('fixture')
  vi.stubEnv('API_ORIGIN', 'http://127.0.0.1:' + address.port); vi.stubEnv('TENANT_HOST', 'temlinkaqui.com')
  const input = { phone: '+55 (11) 99999-9999', marketingConsent: true, sourceUrl: 'https://pets.temlinkaqui.com/?fbclid=real#private', fbclid: 'real', fbp: 'fb.test' }
  try {
    const response = await POST(request(input, { cookie: 'admin=secret', authorization: 'Bearer secret', 'user-agent': 'real browser' }), context)
    expect(response.status).toBe(200); expect(response.headers.get('access-control-allow-origin')).toBe('https://pets.temlinkaqui.com'); expect(response.headers.has('set-cookie')).toBe(false)
    expect(received[0]).toMatchObject({ path: '/api/v1/public/affiliates/pets/conversion-intent', body: { ...input, sourceUrl: 'https://pets.temlinkaqui.com/' }, headers: { host: 'temlinkaqui.com', origin: 'https://pets.temlinkaqui.com', 'user-agent': 'real browser' } })
    expect(received[0].headers.cookie).toBeUndefined(); expect(received[0].headers.authorization).toBeUndefined()
    for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }] as Record<string, string>[]) {
      await POST(request(input, headers), context)
      expect(received.at(-1)?.body).toEqual({ phone: '', marketingConsent: false, sourceUrl: 'https://pets.temlinkaqui.com/' })
    }
    await POST(request({ ...input, marketingConsent: false }), context)
    expect(received.at(-1)?.body).toEqual({ phone: '', marketingConsent: false, sourceUrl: 'https://pets.temlinkaqui.com/' })
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
it('rejects sibling/lookalike origins, malformed requests, and local development origins in production', async () => {
  for (const origin of ['https://pets.temlinkaqui.com.evil.test', 'https://other.temlinkaqui.com', 'null']) {
    expect((await OPTIONS(new Request('http://localhost', { headers: { origin } }))).status).toBe(403)
    expect((await POST(request({}, { origin }), context)).status).toBe(403)
  }
  vi.stubEnv('NODE_ENV', 'production')
  expect((await OPTIONS(new Request('http://localhost', { headers: { origin: 'http://127.0.0.1:3019' } }))).status).toBe(403)
  expect((await POST(request({ sourceUrl: 'https://evil.test', marketingConsent: false }), context)).status).toBe(400)
  expect((await POST(request({ sourceUrl: 'invalid', marketingConsent: false }), context)).status).toBe(400)
  expect((await POST(request({ sourceUrl: 'https://pets.temlinkaqui.com', marketingConsent: false, phone: 'x'.repeat(5000) }), context)).status).toBe(413)
  expect((await OPTIONS(new Request('http://localhost', { headers: { origin: 'https://pets.temlinkaqui.com' } }))).status).toBe(204)
})

it('bounds streamed bodies without trusting Content-Length or buffering the full request', async () => {
  for (const contentLength of [undefined, '10']) {
    let cancelled = false
    let reads = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { reads++; controller.enqueue(new Uint8Array(2049)) },
      cancel() { cancelled = true },
    }, { highWaterMark: 0 })
    const incoming = new Request('http://localhost:3000/api/affiliate-entry/pets', { method: 'POST', headers: { origin: 'https://pets.temlinkaqui.com', ...(contentLength ? { 'content-length': contentLength } : {}) }, body: stream, duplex: 'half' } as RequestInit & { duplex: 'half' })
    const text = vi.spyOn(incoming, 'text')
    expect((await POST(incoming, context)).status).toBe(413)
    expect(text).not.toHaveBeenCalled(); expect(cancelled).toBe(true); expect(reads).toBe(2)
  }
})
it('rejects declared oversized bodies before obtaining a stream reader', async () => {
  const incoming = request({}, { 'content-length': '4097' })
  const reader = vi.spyOn(incoming.body!, 'getReader')
  expect((await POST(incoming, context)).status).toBe(413)
  expect(reader).not.toHaveBeenCalled()
})
