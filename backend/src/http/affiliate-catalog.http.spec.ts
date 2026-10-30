import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAffiliateCatalogRoutes } from './controllers/@Admin/affiliate-catalog'

const fixture = vi.hoisted(() => ({ user: vi.fn(), connection: vi.fn(), tenant: vi.fn(), combined: vi.fn() }))
vi.mock('@/use-cases/affiliates/combined-search', () => ({ searchCombinedAffiliateCatalog: fixture.combined }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: fixture.user }, affiliateConnection: { findUnique: fixture.connection } } }))
vi.mock('@/http/tenant', () => ({ normalizeTenantHost: (host: string) => host.split(':')[0], resolveTenant: fixture.tenant }))

const app = Fastify(), tenantId = 'catalog-http-tenant', actorId = 'catalog-http-admin'
beforeAll(async () => {
  await app.register(cookie)
  await app.register(jwt, { secret: 'test-only-affiliate-catalog-secret' })
  await app.register(registerAffiliateCatalogRoutes, { prefix: '/api/v1' })
  await app.ready()
})
afterAll(() => app.close())
beforeEach(() => { fixture.user.mockResolvedValue({ id: actorId }); fixture.connection.mockResolvedValue(null); fixture.tenant.mockResolvedValue({ id: tenantId, host: 'tenant.test', name: 'Tenant' }) })
const token = (claims: Record<string, unknown> = {}) => app.jwt.sign({ sub: actorId, tenantId, role: 'ADMIN', typ: 'access', ...claims })

describe('Admin affiliate catalog authorization', () => {
  it('searches both sources by default with the authenticated tenant and no source selector', async () => {
    fixture.combined.mockResolvedValueOnce({products:[{id:'MLB123'},{id:'SHP123_456'}],warnings:[]})
    const response=await app.inject({url:'/api/v1/admin/affiliates/catalog/search?q=Pets',headers:{host:'tenant.test',authorization:`Bearer ${token()}`}})
    expect(response.statusCode).toBe(200)
    expect(response.json().products.map((product:{id:string})=>product.id)).toEqual(['MLB123','SHP123_456'])
    expect(fixture.combined).toHaveBeenLastCalledWith(expect.anything(),tenantId,'Pets')
  })
  it('guards every Shopee credential operation with admin access and redacts invalid payloads', async () => {
    const base = '/api/v1/admin/affiliates/catalog/shopee'
    for (const method of ['GET','PUT','DELETE','POST'] as const) {
      const result = await app.inject({ method, url: method === 'POST' ? base + '/verify' : base, headers: { host: 'tenant.test' }, ...(method === 'PUT' ? { payload: { appId: '123456', secret: 'secret-sentinel', accountLabel: 'Conta' } } : {}) })
      expect(result.statusCode).toBe(401)
      expect(result.body).not.toContain('secret-sentinel')
    }
    expect(fixture.connection).not.toHaveBeenCalled()
    const invalid = await app.inject({ method: 'PUT', url: base, headers: { host: 'tenant.test', authorization: `Bearer ${token()}` }, payload: { appId: 'invalid', secret: 'secret-sentinel', accountLabel: 'Conta' } })
    expect(invalid.statusCode).toBe(400)
    expect(invalid.body).not.toContain('secret-sentinel')
    const status = await app.inject({ url: base, headers: { host: 'tenant.test', authorization: `Bearer ${token()}` } })
    expect(status.json()).toMatchObject({ provider: 'SHOPEE', configured: false, connected: false })
  })
  it('rejects unauthenticated users and refresh tokens before consulting credentials', async () => {
    for (const authorization of [undefined, `Bearer ${token({ typ: 'refresh' })}`]) {
      const result = await app.inject({ url: '/api/v1/admin/affiliates/catalog/status', headers: { host: 'tenant.test', ...(authorization ? { authorization } : {}) } })
      expect(result.statusCode).toBe(401)
      expect(result.headers['cache-control']).toBe('private, no-store')
    }
    expect(fixture.connection).not.toHaveBeenCalled()
  })

  it('does not trust JWT role after the current admin was suspended or revoked', async () => {
    fixture.user.mockResolvedValue(null)
    const result = await app.inject({ url: '/api/v1/admin/affiliates/catalog/status', headers: { host: 'tenant.test', authorization: `Bearer ${token()}` } })
    expect(result.statusCode).toBe(403)
    expect(fixture.user).toHaveBeenCalledWith({ where: { id: actorId, tenantId, role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })
    expect(fixture.connection).not.toHaveBeenCalled()
  })

  it('enforces host tenant even with an administrator access token', async () => {
    const result = await app.inject({ url: '/api/v1/admin/affiliates/catalog/status', headers: { host: 'tenant.test', authorization: `Bearer ${token({ tenantId: 'other-tenant' })}` } })
    expect(result.statusCode).toBe(403)
    expect(fixture.connection).not.toHaveBeenCalled()
  })

  it('returns an honest unconfigured state without credentials', async () => {
    const result = await app.inject({ url: '/api/v1/admin/affiliates/catalog/status', headers: { host: 'tenant.test', authorization: `Bearer ${token()}` } })
    expect(result.statusCode).toBe(200)
    expect(result.json()).toMatchObject({ configured: false, connected: false, status: 'NOT_CONFIGURED' })
    expect(result.body).not.toMatch(/clientSecret|accessToken|refreshToken|credentials/)
  })

  it('validates configuration and callbacks without reflecting secret input', async () => {
    const headers = { host: 'tenant.test', authorization: `Bearer ${token()}` }
    const result = await app.inject({ method: 'POST', url: '/api/v1/admin/affiliates/catalog/config', headers, payload: { clientId: 'invalid', clientSecret: 'do-not-reflect-this-secret' } })
    expect(result.statusCode).toBe(400)
    expect(result.body).not.toContain('do-not-reflect-this-secret')
    const callback = await app.inject({ url: '/api/v1/admin/affiliates/catalog/callback?state=invalid&code=secret-code', headers })
    expect(callback.statusCode).toBe(400)
    expect(callback.body).not.toContain('secret-code')
  })

  it('protects session writes with current admin authorization and strict secret validation', async () => {
    const payload = { cookie: 'ssid=private-session', csrf: 'private-csrf', tag: 'tag', profile: 'profile', accountLabel: 'Conta' }
    for (const path of ['session', 'session/disconnect']) {
      const unauthorized = await app.inject({ method: 'POST', url: `/api/v1/admin/affiliates/catalog/${path}`, headers: { host: 'tenant.test' }, payload })
      expect(unauthorized.statusCode).toBe(401)
      expect(unauthorized.body).not.toContain('private-session')
    }
    for (const patch of [{ cookie: 'ssid=x\r\nHost: attacker' }, { csrf: 'bad token' }, { credentials: 'unexpected' }]) {
      const result = await app.inject({ method: 'POST', url: '/api/v1/admin/affiliates/catalog/session', headers: { host: 'tenant.test', authorization: `Bearer ${token()}` }, payload: { ...payload, ...patch } })
      expect(result.statusCode).toBe(400)
      expect(result.headers['cache-control']).toBe('private, no-store')
      expect(result.body).not.toMatch(/private-session|private-csrf|attacker/)
    }
  })
})
