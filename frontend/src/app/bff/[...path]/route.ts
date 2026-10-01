import { tenantHost, forward } from '@/lib/upstream'

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  const url = new URL(request.url)
  const hostHeader = request.headers.get('host') ?? 'localhost'
  const raw = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : Buffer.from(await request.arrayBuffer())
  const body = raw && raw.length > 0 ? raw : undefined
  const result = await forward({
    method: request.method,
    path: `/api/${params.path.join('/')}${url.search}`,
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
    cookie: request.headers.get('cookie') ?? '',
    authorization: request.headers.get('authorization') ?? '',
    idempotencyKey: request.headers.get('idempotency-key') ?? '',
    csrf: request.headers.get('x-csrf-token') ?? '',
    body,
  })
  const headers = new Headers()
  const setCookie = result.headers['set-cookie']
  if (Array.isArray(setCookie)) setCookie.forEach((cookie) => headers.append('set-cookie', cookie))
  else if (typeof setCookie === 'string') headers.set('set-cookie', setCookie)
  if (result.status === 204) return new Response(null, { status: 204, headers })
  headers.set('content-type', String(result.headers['content-type'] ?? 'application/json'))
  return new Response(new Uint8Array(result.body), { status: result.status, headers })
}

export const GET = handle
export const POST = handle
export const PATCH = handle
