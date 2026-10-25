import { previewAvailable, previewImageUrl } from '@/features/home-preview/preview-data'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!previewAvailable(process.env.NODE_ENV)) return new Response(null, { status: 404 })
  const url = previewImageUrl((await params).id)
  if (!url) return new Response(null, { status: 404 })
  try {
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000), redirect: 'error' })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !/^image\/(jpeg|png|webp|avif)(;|$)/.test(contentType)) return new Response(null, { status: 502 })
    return new Response(await response.arrayBuffer(), { headers: { 'content-type': contentType, 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } })
  } catch { return new Response(null, { status: 502 }) }
}
