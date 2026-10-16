import { tenantHost, forward } from '@/lib/upstream'
const policy = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' }
export async function GET(request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params
  if (!/^[a-f0-9-]{36}$/i.test(handle)) return new Response(null, { status: 404, headers: policy })
  let restricted = false
  try {
    const result = await forward({ method: request.method, path: '/api/v1/r/' + handle, host: tenantHost(request.headers.get('host') ?? 'localhost'), cookie: request.headers.get('cookie') ?? '', timeoutMs: 12000 })
    const location = result.headers.location
    if (result.status === 302 && typeof location === 'string') {
      const destination = new URL(location)
      if (destination.protocol === 'https:' && !destination.username && !destination.password && (!destination.port || destination.port === '443')) return new Response(null, { status: 302, headers: { ...policy, location } })
    }
    if (result.status === 200) restricted = JSON.parse(result.body.toString()).restricted === true
  } catch { /* Visitors receive a recoverable state without upstream data. */ }
  return new Response(null, { status: 303, headers: { ...policy, location: '/r/' + handle + '/estado' + (restricted ? '?idade=1' : '') } })
}
export const HEAD = GET
