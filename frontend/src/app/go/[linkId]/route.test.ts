import { beforeEach, expect, it, vi } from 'vitest'
import { GET } from './route'

const { forward } = vi.hoisted(() => ({ forward: vi.fn() }))
vi.mock('@/lib/upstream', () => ({ forward, tenantHost: (host: string) => host }))
beforeEach(() => forward.mockReset())

it.each([302, 404])('não guarda em cache a saída pública com status %i após ocultar/desocultar', async status => {
  forward.mockResolvedValue({ status, headers: status === 302 ? { location: 'https://example.com/destino' } : {}, body: Buffer.from('{}') })
  const response = await GET(new Request('https://tenant.test/go/link?surfaceToken=anterior', { headers: { host: 'tenant.test' } }), { params: Promise.resolve({ linkId: 'link' }) })
  expect(response.status).toBe(status)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  expect(forward).toHaveBeenCalledWith(expect.objectContaining({ path: '/go/link?surfaceToken=anterior', host: 'tenant.test' }))
  if (status === 302) expect(response.headers.get('location')).toBe('https://example.com/destino')
})
