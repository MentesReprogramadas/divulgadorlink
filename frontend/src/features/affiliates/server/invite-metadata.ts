import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { loadCatalog } from '@/lib/catalog-page'
import { tenantHost } from '@/lib/upstream'

const fallback: Metadata = { title: 'Entrar no grupo de ofertas | Tem Link Aqui', robots: { index: false, follow: false } }

export async function inviteMetadata(slug: string): Promise<Metadata> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return fallback
  try {
    const response = await loadCatalog('/api/v1/public/affiliates/' + encodeURIComponent(slug))
    const segment = response.body as { name?: string; shareImageUrl?: string | null } | null
    if (response.status !== 200 || !segment?.name) return fallback
    const origin = 'https://' + tenantHost((await headers()).get('host') ?? 'temlinkaqui.com')
    const url = new URL('/ofertas/entrar/' + encodeURIComponent(slug), origin).href
    const image = segment.shareImageUrl ? new URL(segment.shareImageUrl, origin) : null
    const images = image?.protocol === 'https:' ? [{ url: image.href, alt: 'Foto do grupo ' + segment.name, ...(image.pathname.endsWith('/imagem') ? { width: 600, height: 600, type: 'image/jpeg' } : {}) }] : []
    const description = 'Entre no grupo de ofertas no WhatsApp.'
    return { title: segment.name, description, robots: fallback.robots, alternates: { canonical: url },
      openGraph: { type: 'website', title: segment.name, description, url, siteName: 'Tem Link Aqui', locale: 'pt_BR', images },
      twitter: { card: 'summary', title: segment.name, description, images: images.map(image => image.url) } }
  } catch { return fallback }
}
