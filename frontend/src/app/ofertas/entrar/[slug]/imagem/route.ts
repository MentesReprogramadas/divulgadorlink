import { headers } from 'next/headers'
import { forward, tenantHost } from '@/lib/upstream'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const responseHeaders = { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex' }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return new Response(null, { status: 404, headers: responseHeaders })
  try {
    const result = await forward({ method: 'GET', path: '/api/v1/public/affiliates/' + encodeURIComponent(slug) + '/preview-image', host: tenantHost((await headers()).get('host') ?? 'localhost'), timeoutMs: 10000 })
    if (result.status !== 200) return new Response(null, { status: result.status === 404 ? 404 : 503, headers: responseHeaders })
    return new Response(new Uint8Array(result.body), { headers: { ...responseHeaders, 'content-type': 'image/jpeg' } })
  } catch { return new Response(null, { status: 503, headers: responseHeaders }) }
}
