import { tenantHost, forward } from '@/lib/upstream'

export async function GET(request: Request, context: { params: Promise<{ linkId: string }> }) {
  const params = await context.params
  const url = new URL(request.url)
  const hostHeader = request.headers.get('host') ?? 'localhost'
  const result = await forward({
    method: 'GET',
    path: `/go/${params.linkId}${url.search}`,
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
    cookie: request.headers.get('cookie') ?? '',
  })
  const location = result.headers.location
  if (typeof location === 'string' && result.status >= 300 && result.status < 400) {
    return Response.redirect(location, result.status)
  }
  return new Response(new Uint8Array(result.body), {
    status: result.status,
    headers: { 'content-type': String(result.headers['content-type'] ?? 'application/json') },
  })
}
