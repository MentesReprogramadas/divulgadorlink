import { forward, tenantHost } from '@/lib/upstream'

const origins = new Set(['https://temlinkaqui.com', 'https://pets.temlinkaqui.com'])
function allowed(origin: string | null) {
  return !!origin && (origins.has(origin) || process.env.NODE_ENV !== 'production' && ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3018', 'http://127.0.0.1:3018', 'http://localhost:3019', 'http://127.0.0.1:3019'].includes(origin))
}
function responseHeaders(origin: string) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, DNT, Sec-GPC', 'Cache-Control': 'no-store', Vary: 'Origin' }
}
async function boundedBody(request: Request): Promise<string | null> {
  const length = request.headers.get('content-length')
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 4096)) {
    void request.body?.cancel().catch(() => undefined)
    return null
  }
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4096) {
        void reader.cancel().catch(() => undefined)
        return null
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks, size).toString('utf8')
  } finally { reader.releaseLock() }
}
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  return new Response(null, { status: allowed(origin) ? 204 : 403, headers: allowed(origin) ? responseHeaders(origin!) : { 'Cache-Control': 'no-store', Vary: 'Origin' } })
}
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const origin = request.headers.get('origin')
  if (!allowed(origin)) return Response.json({ message: 'Origem não permitida.' }, { status: 403 })
  const headers = responseHeaders(origin!)
  const { slug } = await context.params
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return Response.json({ message: 'Convite inválido.' }, { status: 400, headers })
  try {
    const raw = await boundedBody(request)
    if (raw === null) return Response.json({ message: 'Dados muito grandes.' }, { status: 413, headers })
    let input: Record<string, unknown>
    try { input = JSON.parse(raw) as Record<string, unknown> } catch { return Response.json({ message: 'Dados inválidos.' }, { status: 400, headers }) }
    if (!input || typeof input !== 'object' || typeof input.marketingConsent !== 'boolean' || typeof input.sourceUrl !== 'string') return Response.json({ message: 'Confira os dados e tente novamente.' }, { status: 400, headers })
    let source: URL
    try { source = new URL(input.sourceUrl) } catch { return Response.json({ message: 'Origem inválida.' }, { status: 400, headers }) }
    if (source.origin !== origin || source.username || source.password) return Response.json({ message: 'Origem inválida.' }, { status: 400, headers })
    const consent = input.marketingConsent && request.headers.get('dnt') !== '1' && request.headers.get('sec-gpc') !== '1'
    const payload = { phone: consent && typeof input.phone === 'string' ? input.phone.slice(0, 40) : '', marketingConsent: consent, sourceUrl: source.origin + source.pathname,
      ...(consent && typeof input.fbclid === 'string' ? { fbclid: input.fbclid.slice(0, 512) } : {}),
      ...(consent && typeof input.fbp === 'string' ? { fbp: input.fbp.slice(0, 256) } : {}) }
    const result = await forward({ origin: origin!, method: 'POST', path: '/api/v1/public/affiliates/' + encodeURIComponent(slug) + '/conversion-intent', host: tenantHost(request.headers.get('host')?.split(':')[0] || 'localhost'), body: Buffer.from(JSON.stringify(payload)), userAgent: request.headers.get('user-agent') ?? '', dnt: request.headers.get('dnt') ?? '', gpc: request.headers.get('sec-gpc') ?? '', timeoutMs: 10000 })
    return new Response(new Uint8Array(result.body), { status: result.status, headers: { ...headers, 'Content-Type': 'application/json' } })
  } catch {
    return Response.json({ message: 'Não foi possível continuar. Tente novamente.' }, { status: 502, headers })
  }
}
