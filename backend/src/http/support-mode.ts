import { randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest, onSendAsyncHookHandler } from 'fastify'
import { z } from 'zod'
import { env } from '@/env'
import { createRedis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { isRefreshRevoked } from '@/adapters/auth/refresh-revocation'
import { resolveTenant } from '@/http/tenant'
import { verifyJWT } from '@/http/middlewares/verify-jwt'

const COOKIE = 'supportSession'
const TTL = 15 * 60
const flags = { path: '/', httpOnly: true, sameSite: 'strict' as const, secure: env.NODE_ENV === 'production' }
const sessionSchema = z.object({ actorId: z.string(), targetId: z.string(), tenantId: z.string(), refreshJti: z.string(), expiresAt: z.number() })
type SupportSession = z.infer<typeof sessionSchema>
declare module 'fastify' {
  interface FastifyRequest { supportSession?: SupportSession; supportUser?: FastifyRequest['user'] }
}
let client: ReturnType<typeof createRedis> | undefined
function redis() { return client ??= createRedis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2000 }) }
function key(token: string) { return `support:session:${token}` }
function bindingKey(session: Pick<SupportSession, 'tenantId' | 'actorId' | 'refreshJti'>) { return `support:actor:${session.tenantId}:${session.actorId}:${session.refreshJti}` }
function validToken(token: string) { return /^[a-f0-9]{64}$/.test(token) }
async function binding(q: FastifyRequest) {
  const bearer = q.headers.authorization?.startsWith('Bearer ') ? q.headers.authorization.slice(7) : undefined
  const seen = new Set<string>()
  for (const raw of [q.cookies.refreshToken, bearer, q.cookies.accessToken]) {
    if (!raw) continue
    let token: FastifyRequest['user']
    try { token = q.server.jwt.verify<FastifyRequest['user']>(raw) } catch { continue }
    if (token.role !== 'ADMIN') continue
    const sid = token.typ === 'refresh' ? token.jti : token.typ === 'access' ? token.sid : undefined
    if (!sid) continue
    const identity = { tenantId: token.tenantId, actorId: token.sub, refreshJti: sid }
    const actorKey = bindingKey(identity)
    if (seen.has(actorKey)) continue
    seen.add(actorKey)
    const active = await redis().get(actorKey)
    if (active) return { token: active, key: actorKey }
  }
  return null
}
async function read(token: string) {
  if (!validToken(token)) return null
  const raw = await redis().get(key(token))
  if (!raw) return null
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw))
    return parsed.success && parsed.data.expiresAt > Date.now() ? parsed.data : null
  } catch { return null }
}
async function actorSession(q: FastifyRequest) {
  const raw = q.cookies.refreshToken
  if (!raw) return null
  try {
    const token = q.server.jwt.verify<FastifyRequest['user']>(raw)
    if (token.typ !== 'refresh' || !token.jti || await isRefreshRevoked(token.jti)) return null
    const tenant = await resolveTenant(q.headers.host ?? '')
    if (tenant.id !== token.tenantId) return null
    const actor = await prisma.user.findFirst({ where: { id: token.sub, tenantId: tenant.id, role: 'ADMIN', status: 'ACTIVE' } })
    return actor ? { actor, jti: token.jti, exp: (token as { exp?: number }).exp } : null
  } catch { return null }
}
function denied(r: FastifyReply, status = 403) {
  return r.code(status).send({ code: 'support_read_only', message: 'Modo de suporte: somente leitura. Saia deste modo para continuar.' })
}
async function audit(q: FastifyRequest, session: SupportSession, action: string) {
  await prisma.auditLog.create({ data: {
    tenantId: session.tenantId, actorId: session.actorId, entityType: 'User', entityId: session.targetId,
    action, requestId: q.id, before: {}, after: { expiresAt: session.expiresAt },
  } })
}

// Global, before route handlers: new routes inherit the write prohibition.
// The support credential is opaque, revocable and bound to the admin's refresh session.
export async function supportGuard(q: FastifyRequest, r: FastifyReply) {
  const route = q.routeOptions.url ?? ''
  if (q.method === 'POST' && route === '/api/v1/support/exit') return
  let active: Awaited<ReturnType<typeof binding>>
  try { active = await binding(q) } catch { return denied(r, 503) }
  const marker = q.cookies[COOKIE]
  if (!active && !marker) return
  r.header('cache-control', 'private, no-store')
  const token = active?.token ?? marker!
  if (!active || (marker && marker !== token)) return denied(r, 401)
  if (!marker) r.setCookie(COOKIE, token, flags)
  if (q.method !== 'GET') return denied(r)
  // Never expose admin data, verification codes or tracked outbound redirects.
  if (!route.startsWith('/api/v1/') || route.includes('/admin/') || route.startsWith('/api/v1/r/')
    || route === '/api/v1/links/submission-started'
    || (route.startsWith('/api/v1/auth/') && route !== '/api/v1/auth/session')) return denied(r)
  try {
    const session = await read(token)
    const actor = await actorSession(q)
    if (!session || !actor || actor.actor.id !== session.actorId || actor.jti !== session.refreshJti || actor.actor.tenantId !== session.tenantId) return denied(r, 401)
    const target = await prisma.user.findFirst({ where: { id: session.targetId, tenantId: session.tenantId, role: 'USER' } })
    if (!target) return denied(r, 401)
    q.supportSession = session
    q.supportUser = { sub: target.id, role: 'USER', tenantId: session.tenantId, typ: 'access' }
    q.user = q.supportUser
    // A future handler must not re-authenticate the original admin credentials
    // and accidentally regain ADMIN privileges inside this request.
    delete q.headers.authorization
    delete q.cookies.accessToken
    delete q.cookies.refreshToken
  } catch { return denied(r, 503) }
}

// Existing hosted checkout links are capabilities: following one could allow
// changes at the payment provider without a mutation to our API.
const paymentCapabilities = new Set(['checkoutUrl', 'resumeCheckoutUrl', 'portalUrl', 'clientSecret', 'accessToken', 'refreshToken'])
export const supportResponse: onSendAsyncHookHandler = async (q, r, payload) => {
  if (!q.supportSession || typeof payload !== 'string' || !String(r.getHeader('content-type')).includes('application/json')) return payload
  return JSON.stringify(JSON.parse(payload, (key: string, value: unknown) => paymentCapabilities.has(key) ? null : value))
}

export async function supportRoutes(app: FastifyInstance) {
  app.post('/admin/users/:id/support', { onRequest: [verifyJWT] }, async (q, r) => {
    r.header('cache-control', 'private, no-store')
    const actor = await actorSession(q)
    if (!actor || q.user.sub !== actor.actor.id || q.user.role !== 'ADMIN') return denied(r)
    // Upgrade older access tokens through the ordinary refresh flow before
    // starting support, so removing cookies cannot bypass the server binding.
    if (q.user.sid !== actor.jti) return r.code(401).send({ message: 'Atualize a sessão para abrir o suporte.' })
    const { id } = z.object({ id: z.string().min(1).max(128) }).strict().parse(q.params)
    const target = await prisma.user.findFirst({ where: { id, tenantId: actor.actor.tenantId, role: 'USER' } })
    if (!target) return r.code(404).send({ message: 'Usuário não encontrado.' })
    const token = randomBytes(32).toString('hex')
    const session: SupportSession = { actorId: actor.actor.id, targetId: target.id, tenantId: target.tenantId, refreshJti: actor.jti, expiresAt: Date.now() + TTL * 1000 }
    await audit(q, session, 'support.start')
    const bindingTtl = Math.max(TTL, (actor.exp ?? Math.floor(Date.now() / 1000) + 7 * 86400) - Math.floor(Date.now() / 1000))
    const created = await redis().eval(`
      if redis.call('EXISTS', KEYS[2]) == 1 then return 0 end
      redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
      redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
      return 1
    `, 2, key(token), bindingKey(session), JSON.stringify(session), TTL, token, bindingTtl)
    if (created !== 1) return denied(r)
    r.setCookie(COOKIE, token, flags)
    r.setCookie('catalogo_role', 'USER', { ...flags, httpOnly: false })
    return { expiresAt: session.expiresAt }
  })
  app.post('/support/exit', async (q, r) => {
    r.header('cache-control', 'private, no-store')
    const active = await binding(q)
    const token = active?.token ?? q.cookies[COOKIE]
    if (token && validToken(token)) {
      const session = await read(token)
      if (active) {
        await redis().eval(`
          if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
          redis.call('DEL', KEYS[1], KEYS[2])
          return 1
        `, 2, key(token), active.key, token)
        if (session) await audit(q, session, 'support.end')
      }
    }
    r.clearCookie(COOKIE, flags)
    const actor = await actorSession(q)
    if (actor) r.setCookie('catalogo_role', 'ADMIN', { ...flags, httpOnly: false })
    return { returnTo: '/admin/visao' }
  })
}
