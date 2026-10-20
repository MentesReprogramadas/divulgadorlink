// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, PUT } from './route'
import { forward } from '@/lib/upstream'

vi.mock('@/lib/upstream', () => ({ tenantHost: (host: string) => host, forward: vi.fn() }))
const mockedForward = vi.mocked(forward)
beforeEach(() => { vi.resetAllMocks(); mockedForward.mockResolvedValue({ status: 200, headers: {}, body: Buffer.from('{}') }) })
describe('BFF de destaque administrativo', () => {
  it('F01 preserva a política de cache privada do relatório', async () => {
    mockedForward.mockResolvedValue({ status: 200, headers: { 'cache-control': 'private, no-store' }, body: Buffer.from('{}') })
    const response = await GET(new Request('http://tenant-a.localhost/bff/v1/analytics/links/own/performance'), { params: Promise.resolve({ path: ['v1', 'analytics', 'links', 'own', 'performance'] }) })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it.each([['PUT', PUT], ['DELETE', DELETE]] as const)('encaminha %s mantendo tenant, sessão e CSRF', async (method, handler) => {
    const body = method === 'PUT' ? JSON.stringify({ surfaces: ['HOME'], expiresAt: null }) : undefined
    const request = new Request('http://tenant-a.localhost/bff/v1/admin/links/link-1/promotions', { method, headers: { host: 'tenant-a.localhost:3000', cookie: 'accessToken=fixture', 'x-csrf-token': 'csrf-fixture' }, body })
    const response = await handler(request, { params: Promise.resolve({ path: ['v1', 'admin', 'links', 'link-1', 'promotions'] }) })
    expect(response.status).toBe(200)
    expect(mockedForward).toHaveBeenCalledWith(expect.objectContaining({ method, path: '/api/v1/admin/links/link-1/promotions', host: 'tenant-a.localhost', cookie: 'accessToken=fixture', csrf: 'csrf-fixture', body: body ? Buffer.from(body) : undefined }))
  })
})

it('F38 preserves private JSON attachment headers across the BFF',async()=>{
 mockedForward.mockResolvedValue({status:200,headers:{'cache-control':'private, no-store','content-disposition':'attachment; filename="minha-pagina-draft.json"'},body:Buffer.from('{"schemaVersion":1}')})
 const response=await GET(new Request('http://tenant-a.localhost/bff/v1/me/profile/export?revision=draft'),{params:Promise.resolve({path:['v1','me','profile','export']})})
 expect(response.headers.get('cache-control')).toBe('private, no-store');expect(response.headers.get('content-disposition')).toContain('attachment;');expect(await response.json()).toEqual({schemaVersion:1})
})

it('F20 resource selector is forwarded as untrusted context; avatar selector is removed from upstream URL',async()=>{await GET(new Request('http://tenant.localhost/bff/v1/me/profile/avatar/'+ 'a'.repeat(64)+'?profileId=profile-a'),{params:Promise.resolve({path:['v1','me','profile','avatar','a'.repeat(64)]})});expect(mockedForward).toHaveBeenCalledWith(expect.objectContaining({path:'/api/v1/me/profile/avatar/'+'a'.repeat(64),profileTarget:'profile-a'}));mockedForward.mockClear();await GET(new Request('http://tenant.localhost/bff/v1/me/profile',{headers:{'x-profile-id':'profile-b'}}),{params:Promise.resolve({path:['v1','me','profile']})});expect(mockedForward).toHaveBeenCalledWith(expect.objectContaining({profileTarget:'profile-b'}))})
