// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, PUT } from './route'
import { forward } from '@/lib/upstream'

vi.mock('@/lib/upstream', () => ({ tenantHost: (host: string) => host, forward: vi.fn() }))
const mockedForward = vi.mocked(forward)
beforeEach(() => { vi.resetAllMocks(); mockedForward.mockResolvedValue({ status: 200, headers: {}, body: Buffer.from('{}') }) })
describe('BFF de destaque administrativo', () => {
  it.each([['PUT', PUT], ['DELETE', DELETE]] as const)('encaminha %s mantendo tenant, sessão e CSRF', async (method, handler) => {
    const body = method === 'PUT' ? JSON.stringify({ surfaces: ['HOME'], expiresAt: null }) : undefined
    const request = new Request('http://tenant-a.localhost/bff/v1/admin/links/link-1/promotions', { method, headers: { host: 'tenant-a.localhost:3000', cookie: 'accessToken=fixture', 'x-csrf-token': 'csrf-fixture' }, body })
    const response = await handler(request, { params: Promise.resolve({ path: ['v1', 'admin', 'links', 'link-1', 'promotions'] }) })
    expect(response.status).toBe(200)
    expect(mockedForward).toHaveBeenCalledWith(expect.objectContaining({ method, path: '/api/v1/admin/links/link-1/promotions', host: 'tenant-a.localhost', cookie: 'accessToken=fixture', csrf: 'csrf-fixture', body: body ? Buffer.from(body) : undefined }))
  })
})
