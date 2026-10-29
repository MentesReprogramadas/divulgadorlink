import { createDecipheriv, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage } from 'node:http'
import { DatabaseSync, type StatementSync } from 'node:sqlite'
import { affiliateSellerUrl, affiliateSessionSchema, authenticatedAffiliateResult } from '../domain/affiliates/mercado-livre'

const MAX_BODY = 8192
const MAX_RESPONSE = 1000000
const catalogPath = /^\/(?:products\/search\?[^#\r\n]+|products\/MLB\d+\/items\?[^#\r\n]+|users\/\d{1,20})$/
type Result = { status: number; body: unknown }
type Options = { databasePath: string; encryptionKey: string; key: string; tag: string; profile: string; fetch?: typeof fetch }
type Connection = { client_id: string; status: string; expires_at: number | null; access_token: string | null }
class BridgeError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}

function limiter() {
  let active = 0
  const waiting: Array<{ resolve: (release: (() => void) | null) => void; timer: ReturnType<typeof setTimeout> }> = []
  const take = (): (() => void) => {
    active++
    let released = false
    return () => {
      if (released) return
      released = true
      active--
      const next = waiting.shift()
      if (next) { clearTimeout(next.timer); next.resolve(take()) }
    }
  }
  return (): Promise<(() => void) | null> => {
    if (active < 2) return Promise.resolve(take())
    if (waiting.length >= 4) return Promise.resolve(null)
    return new Promise(resolve => {
      const next = { resolve, timer: setTimeout(() => { waiting.splice(waiting.indexOf(next), 1); resolve(null) }, 12000) }
      waiting.push(next)
    })
  }
}

async function inputJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length
    if (size > MAX_BODY) { request.resume(); throw new BridgeError(413, 'request_too_large') }
    chunks.push(chunk)
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value as Record<string, unknown>
  } catch { throw new BridgeError(400, 'invalid_request') }
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new BridgeError(502, 'invalid_provider_response')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_RESPONSE) { await reader.cancel(); throw new BridgeError(502, 'provider_response_too_large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function failure(error: unknown): Result {
  return error instanceof BridgeError ? { status: error.status, body: { error: error.code } } : { status: 502, body: { error: 'central_provider_unavailable' } }
}

export function createAffiliateBridge(options: Options) {
  const encryptionKey = Buffer.from(options.encryptionKey, 'base64url')
  const identity = affiliateSessionSchema.pick({ tag: true, profile: true }).safeParse({ tag: options.tag, profile: options.profile })
  if (options.key.length < 32 || encryptionKey.length !== 32 || !/^[A-Za-z0-9_-]{43}=?$/.test(options.encryptionKey) || !identity.success) throw new Error('Invalid affiliate bridge configuration')
  // VHG owns schema, token refresh and session writes; this service can only read its mounted database.
  const db = new DatabaseSync(options.databasePath, { readOnly: true })
  let connectionQuery: StatementSync, sessionQuery: StatementSync
  try {
    connectionQuery = db.prepare('SELECT client_id,status,expires_at,access_token FROM ml_connections WHERE id=?')
    sessionQuery = db.prepare('SELECT credentials FROM affiliate_sessions WHERE id=?')
  } catch (error) { db.close(); throw error }
  const requestSlot = limiter(), providerSlot = limiter()
  const transport = options.fetch ?? fetch
  const connected = (connection: Connection | undefined) => !!connection && connection.status === 'connected' && !!connection.access_token && Number(connection.expires_at) > Date.now() + 60000
  const unseal = (value: string) => {
    const parts = value.split('.')
    if (parts.length !== 2 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error('Invalid sealed value')
    const iv = Buffer.from(parts[0], 'base64url'), encrypted = Buffer.from(parts[1], 'base64url')
    if (iv.length !== 12 || encrypted.length < 17) throw new Error('Invalid sealed value')
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv)
    decipher.setAuthTag(encrypted.subarray(-16))
    return Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]).toString('utf8')
  }
  const provider = async (url: string, init: RequestInit): Promise<Result> => {
    const release = await providerSlot()
    if (!release) throw new BridgeError(429, 'central_provider_busy')
    try {
      const response = await transport(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(30000) })
      if (!response.ok) {
        await response.body?.cancel()
        return { status: [400, 401, 403, 404, 429].includes(response.status) ? response.status : 502, body: { error: 'provider_rejected' } }
      }
      return { status: 200, body: await boundedJson(response) }
    } finally { release() }
  }
  const query = async (path: string, token: string): Promise<Result> => {
    try {
      const result = await provider(`https://api.mercadolibre.com${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      if (result.status !== 200 || !path.startsWith('/users/')) return result
      const raw = result.body as { id?: unknown; seller_reputation?: { level_id?: unknown; power_seller_status?: unknown } } | null
      const reputation = raw?.seller_reputation
      return { status: 200, body: { id: typeof raw?.id === 'number' && Number.isSafeInteger(raw.id) ? raw.id : null, seller_reputation: { level_id: typeof reputation?.level_id === 'string' ? reputation.level_id : null, power_seller_status: typeof reputation?.power_seller_status === 'string' ? reputation.power_seller_status : null } } }
    } catch (error) { return failure(error) }
  }
  const server = createServer(async (request, response) => {
    const send = ({ status, body }: Result) => {
      let data = JSON.stringify(body)
      if (Buffer.byteLength(data) > MAX_RESPONSE) { status = 502; data = '{"error":"provider_response_too_large"}' }
      if (!response.destroyed) { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(data) }
    }
    const expected = Buffer.from(`Bearer ${options.key}`), received = Buffer.from(request.headers.authorization ?? '')
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) { send({ status: 401, body: { error: 'unauthorized' } }); return }
    const release = await requestSlot()
    if (!release) { send({ status: 429, body: { error: 'central_provider_busy' } }); return }
    try {
      if (response.destroyed) return
      const input = await inputJson(request)
      const route = request.url
      const connection = connectionQuery.get('primary') as Connection | undefined
      if (request.method === 'GET' && route === '/catalog/status') {
        send({ status: 200, body: { configured: !!connection, connected: connected(connection), clientId: connection?.client_id ?? null, status: !connection ? 'CONFIGURED' : connected(connection) ? 'CONNECTED' : 'RECONNECT', ...(connection?.expires_at ? { expiresAt: connection.expires_at } : {}), affiliateSessionConfigured: !!sessionQuery.get('primary') } })
      } else if (request.method === 'POST' && (route === '/catalog/request' || route === '/catalog/batch')) {
        const paths = route === '/catalog/request' ? [input.path] : input.paths
        if (!Array.isArray(paths) || !paths.length || paths.length > 10 || !paths.every((path): path is string => typeof path === 'string' && path.length <= 2048 && catalogPath.test(path))) throw new BridgeError(400, 'invalid_paths')
        if (!connected(connection)) throw new BridgeError(409, 'central_connection_expired')
        const token = unseal(connection!.access_token!)
        if (route === '/catalog/request') { send(await query(paths[0], token)); return }
        const results: Array<Result & { path: string }> = new Array(paths.length)
        let cursor = 0
        const worker = async () => { while (cursor < paths.length) { const index = cursor++; results[index] = { path: paths[index], ...await query(paths[index], token) } } }
        await Promise.all([worker(), worker()])
        send({ status: 200, body: { results } })
      } else if (request.method === 'POST' && route === '/api/generate') {
        if (typeof input.url !== 'string') throw new BridgeError(400, 'seller_required')
        let seller: URL
        try { seller = affiliateSellerUrl(input.url) } catch { throw new BridgeError(400, 'seller_required') }
        const session = sessionQuery.get('primary') as { credentials: string } | undefined
        if (!session) throw new BridgeError(409, 'affiliate_session_missing')
        const raw: unknown = JSON.parse(unseal(session.credentials))
        const credentials = affiliateSessionSchema.pick({ cookie: true, csrf: true }).safeParse(raw)
        if (!credentials.success) throw new BridgeError(409, 'affiliate_session_invalid')
        const result = await provider('https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink', { method: 'POST', headers: { Cookie: credentials.data.cookie, 'x-csrf-token': credentials.data.csrf, Origin: 'https://www.mercadolivre.com.br', Referer: 'https://www.mercadolivre.com.br/afiliados/linkbuilder', 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, body: JSON.stringify({ urls: [seller.href], tag: options.tag }) })
        if (result.status !== 200) { send(result); return }
        try { send({ status: 200, body: authenticatedAffiliateResult(result.body, seller.href, options.tag, options.profile) }) } catch { throw new BridgeError(502, 'affiliate_response_unconfirmed') }
      } else throw new BridgeError(404, 'route_not_found')
    } catch (error) { send(failure(error)) } finally { release() }
  })
  server.headersTimeout = 10000
  server.requestTimeout = 110000
  server.on('close', () => db.close())
  return server
}

if (require.main === module) {
  try {
    const server = createAffiliateBridge({ databasePath: process.env.DATABASE_PATH ?? '/data/fitness.db', encryptionKey: process.env.ML_ENCRYPTION_KEY ?? '', key: process.env.AFFILIATE_BRIDGE_KEY ?? '', tag: process.env.AFFILIATE_TAG ?? '', profile: process.env.AFFILIATE_PROFILE ?? '' })
    const port = Number(process.env.PORT ?? '8080')
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port')
    server.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log('Affiliate bridge listening'))
    const shutdown = () => { server.close(); server.closeIdleConnections() }
    process.once('SIGTERM', shutdown)
    process.once('SIGINT', shutdown)
  } catch { console.error('Affiliate bridge could not start; check configuration and read-only database mount.'); process.exitCode = 1 }
}
