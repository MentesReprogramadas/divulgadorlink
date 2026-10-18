import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  sessions: new Map<string, string>(), revoked: false, down: false,
  actor: { id: 'admin', role: 'ADMIN', status: 'ACTIVE', tenantId: 'tenant' },
  target: { id: '12345678-1234-4234-8234-123456789abc', role: 'USER', status: 'ACTIVE', tenantId: 'tenant' },
  audit: vi.fn(),
}))
vi.mock('@/lib/redis', () => ({ createRedis: () => ({
  get: async (key: string) => { if (fixture.down) throw new Error('offline'); return fixture.sessions.get(key) },
  set: async (key: string, value: string) => { fixture.sessions.set(key, value) },
  del: async (key: string) => fixture.sessions.delete(key),
  eval: async (script: string, _count: number, first: string, second: string, ...args: Array<string | number>) => {
    if (script.includes('EXISTS')) {
      if (fixture.sessions.has(second)) return 0
      fixture.sessions.set(first, String(args[0])); fixture.sessions.set(second, String(args[2])); return 1
    }
    if (fixture.sessions.get(second) !== args[0]) return 0
    fixture.sessions.delete(first); fixture.sessions.delete(second); return 1
  },
}) }))
vi.mock('@/adapters/auth/refresh-revocation', () => ({ isRefreshRevoked: async () => fixture.revoked }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findFirst: async ({ where }: { where: Record<string, string> }) => [fixture.actor, fixture.target].find(row => Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)) ?? null },
  auditLog: { create: fixture.audit },
} }))
vi.mock('@/http/tenant', () => ({ resolveTenant: async (host: string) => ({ id: host === 'foreign.test' ? 'foreign' : 'tenant' }) }))
import { app } from '@/app'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { supportReadContext } from '@/lib/support-read-context'

let access: string, refresh: string
const csrf = 'a'.repeat(64)
function call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' | 'HEAD' | 'OPTIONS', url: string, support?: string, extra: Record<string, string> = {}) {
  return app.inject({ method, url, headers: { host: 'local.test', 'x-csrf-token': csrf, ...extra }, cookies: { accessToken: access, refreshToken: refresh, csrf, ...(support ? { supportSession: support } : {}) } })
}
async function enter() {
  const result = await call('POST', `/api/v1/admin/users/${fixture.target.id}/support`)
  expect(result.statusCode, result.body).toBe(200)
  const cookie = result.cookies.find(c => c.name === 'supportSession')!
  expect(cookie.httpOnly).toBe(true)
  expect(cookie.sameSite).toBe('Strict')
  return cookie.value
}
beforeAll(async () => {
  app.get('/api/v1/future-support-read', async q => ({ user: await readAccessUser(q), readOnly: supportReadContext.getStore() === true }))
  app.get('/api/v1/future-direct-auth', { onRequest: async q => { await q.jwtVerify() } }, async q => q.user)
  app.get('/api/v1/future-payment-read', async () => ({ amount: 123, subscription: { resumeCheckoutUrl: 'https://checkout.stripe.com/private', clientSecret: 'private' } }))
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] as const) app.route({ method, url: '/api/v1/future-support-write', handler: async () => ({ changed: true }) })
  await app.ready()
})
beforeEach(() => {
  fixture.sessions.clear(); fixture.revoked = false; fixture.down = false; fixture.actor.role = 'ADMIN'; fixture.actor.status = 'ACTIVE'; fixture.target.role = 'USER'; fixture.audit.mockClear()
  access = app.jwt.sign({ sub: 'admin', role: 'ADMIN', tenantId: 'tenant', typ: 'access', sid: 'admin-session' })
  refresh = app.jwt.sign({ sub: 'admin', role: 'ADMIN', tenantId: 'tenant', typ: 'refresh', jti: 'admin-session' })
})
describe('support capability', () => {
  it('impersonates only the target, scopes the database, isolates concurrent ordinary requests and audits entry', async () => {
    const token = await enter()
    const supportRead = call('GET', '/api/v1/future-support-read', token)
    const originalAccess = access, originalRefresh = refresh
    access = app.jwt.sign({ sub: 'admin', role: 'ADMIN', tenantId: 'tenant', typ: 'access', sid: 'independent-session' })
    refresh = app.jwt.sign({ sub: 'admin', role: 'ADMIN', tenantId: 'tenant', typ: 'refresh', jti: 'independent-session' })
    const ordinaryRead = call('GET', '/api/v1/future-support-read')
    const ordinaryPayment = call('GET', '/api/v1/future-payment-read')
    access = originalAccess; refresh = originalRefresh
    const [support, ordinary] = await Promise.all([supportRead, ordinaryRead])
    expect(support.json()).toEqual({ user: { sub: fixture.target.id, role: 'USER', tenantId: 'tenant', typ: 'access' }, readOnly: true })
    expect(ordinary.json().user.sub).toBe('admin'); expect(ordinary.json().readOnly).toBe(false)
    expect(fixture.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: 'admin', entityId: fixture.target.id, action: 'support.start' }) }))
    expect((await call('GET', '/api/v1/future-payment-read', token)).json()).toEqual({ amount: 123, subscription: { resumeCheckoutUrl: null, clientSecret: null } })
    expect((await ordinaryPayment).json().subscription.clientSecret).toBe('private')
  })
  it('blocks every unsafe verb on future routes, auth refresh, codes, nested support, admin reads and tracked exits', async () => {
    const token = await enter()
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] as const) expect((await call(method, '/api/v1/future-support-write', token)).statusCode).toBe(403)
    for (const url of ['/api/v1/admin/office', '/api/v1/auth/confirmation-inbox', '/go/example', '/api/v1/links/submission-started']) expect((await call('GET', url, token)).statusCode).toBe(403)
    expect((await call('POST', '/api/v1/auth/refresh', token)).statusCode).toBe(403)
    expect((await call('POST', `/api/v1/admin/users/${fixture.target.id}/support`, token)).statusCode).toBe(403)
    expect((await call('HEAD', '/api/v1/future-support-read', token)).statusCode).toBe(403)
    expect((await call('GET', '/api/v1/future-direct-auth', token, { authorization: `Bearer ${access}` })).statusCode).toBe(401)
    expect((await call('POST', '/api/v1/future-support-write')).statusCode).toBe(403)
    expect((await call('GET', '/api/v1/future-support-read')).json().user.sub).toBe(fixture.target.id)
    const bearerOnly = await app.inject({ method: 'POST', url: '/api/v1/future-support-write', headers: { host: 'local.test', authorization: `Bearer ${access}` } })
    expect(bearerOnly.statusCode).toBe(403)
  })
  it('fails closed for forgery, expiration, Redis outage, other tenant and revoked or changed admin session', async () => {
    const token = await enter()
    expect((await call('GET', '/api/v1/future-support-read', 'forged')).statusCode).toBe(401)
    expect((await call('GET', '/api/v1/future-support-read', token, { host: 'foreign.test' })).statusCode).toBe(401)
    const otherRefresh = refresh
    refresh = app.jwt.sign({ sub: 'admin', role: 'ADMIN', tenantId: 'tenant', typ: 'refresh', jti: 'other-session' })
    expect((await call('GET', '/api/v1/future-support-read', token)).statusCode).toBe(401)
    refresh = otherRefresh
    fixture.actor.status = 'BANNED'; expect((await call('GET', '/api/v1/future-support-read', token)).statusCode).toBe(401); fixture.actor.status = 'ACTIVE'
    fixture.actor.role = 'USER'; expect((await call('GET', '/api/v1/future-support-read', token)).statusCode).toBe(401); fixture.actor.role = 'ADMIN'
    fixture.revoked = true; expect((await call('GET', '/api/v1/future-support-read', token)).statusCode).toBe(401); fixture.revoked = false
    fixture.down = true; expect((await call('GET', '/api/v1/future-support-read', token)).statusCode).toBe(503); fixture.down = false
    const key = `support:session:${token}`, session = JSON.parse(fixture.sessions.get(key)!)
    fixture.sessions.set(key, JSON.stringify({ ...session, expiresAt: 0 }))
    expect((await call('GET', '/api/v1/future-support-read', token)).statusCode).toBe(401)
  })
  it('rejects non-admin actors, admin targets and start without CSRF', async () => {
    expect((await call('POST', `/api/v1/admin/users/${fixture.target.id}/support`, undefined, { 'x-csrf-token': '' })).statusCode).toBe(403)
    fixture.actor.role = 'USER'
    expect((await call('POST', `/api/v1/admin/users/${fixture.target.id}/support`)).statusCode).toBe(403)
    fixture.actor.role = 'ADMIN'; fixture.target.role = 'ADMIN'
    expect((await call('POST', `/api/v1/admin/users/${fixture.target.id}/support`)).statusCode).toBe(404)
  })
  it('requires CSRF on exit, revokes replay, clears even expired sessions and keeps the original admin identity', async () => {
    const token = await enter()
    expect((await call('POST', '/api/v1/support/exit', token, { 'x-csrf-token': '' })).statusCode).toBe(403)
    expect((await call('POST', '/api/v1/support/exit', token, { 'x-csrf-token': '', authorization: 'Bearer forged' })).statusCode).toBe(403)
    const exit = await call('POST', '/api/v1/support/exit', token)
    expect(exit.statusCode, exit.body).toBe(200)
    expect(exit.cookies.find(c => c.name === 'supportSession')?.value).toBe('')
    expect((await call('GET', '/api/v1/future-support-read', token)).statusCode).toBe(401)
    expect((await call('GET', '/api/v1/future-support-read')).json().user.sub).toBe('admin')
    expect((await call('POST', '/api/v1/support/exit', token)).statusCode).toBe(200)
  })
})
