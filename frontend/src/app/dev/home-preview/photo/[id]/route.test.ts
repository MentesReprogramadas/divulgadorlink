import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const request = new Request('http://localhost/dev/home-preview/photo/mountains')
const context = { params: Promise.resolve({ id: 'mountains' }) }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('proxy de fotos do mock', () => {
  it('não atende produção nem URLs fora da allowlist', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    vi.stubEnv('NODE_ENV', 'production')
    expect((await GET(request, context)).status).toBe(404)
    vi.stubEnv('NODE_ENV', 'development')
    expect((await GET(request, { params: Promise.resolve({ id: '__proto__' }) })).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('serve somente imagem, com tipo e cache controlados', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'image/jpeg' } })))
    const response = await GET(request, context)
    expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await response.arrayBuffer()).toHaveProperty('byteLength', 2)
  })
  it('trata falhas e conteúdo inesperado sem refletir HTML externo', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fetch = vi.fn().mockResolvedValueOnce(new Response('<script>bad</script>', { headers: { 'content-type': 'text/html' } })).mockRejectedValueOnce(new Error('offline'))
    vi.stubGlobal('fetch', fetch)
    expect((await GET(request, context)).status).toBe(502)
    expect((await GET(request, context)).status).toBe(502)
  })
})
