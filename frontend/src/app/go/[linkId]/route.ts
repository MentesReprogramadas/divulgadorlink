import { tenantHost, forward } from '@/lib/upstream'

const noindex = { 'x-robots-tag': 'noindex, nofollow' }

export async function GET(request: Request, context: { params: Promise<{ linkId: string }> }) {
  const params = await context.params
  const url = new URL(request.url)
  const hostHeader = request.headers.get('host') ?? 'localhost'
  const result = await forward({
    method: 'GET',
    path: `/go/${params.linkId}${url.search}`,
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
    cookie: request.headers.get('cookie') ?? '',
    userAgent: request.headers.get('user-agent') ?? '',
    dnt: request.headers.get('dnt') ?? '',
    gpc: request.headers.get('sec-gpc') ?? '',
    analyticsTest: request.headers.get('x-analytics-test') ?? '',
  })
  const location = result.headers.location
  if (typeof location === 'string' && result.status >= 300 && result.status < 400) {
    return new Response(null, { status: result.status, headers: { ...noindex, location } })
  }
  return new Response(new Uint8Array(result.body), {
    status: result.status,
    headers: { ...noindex, 'content-type': String(result.headers['content-type'] ?? 'application/json') },
  })
}
