import type { Metadata, MetadataRoute } from 'next'

export const PRIVATE_PATHS = [
  '/painel',
  '/admin',
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/recuperar-senha',
  '/nao-encontrado',
  '/bff',
]

export const privateMetadata: Metadata = {
  robots: { index: false, follow: false },
}

export const searchMetadata: Metadata = {
  robots: { index: false, follow: true },
}

type PublicSeo = {
  title: string
  description: string
  canonical: string
  robots: string
  openGraph?: { title: string; description: string; url: string }
}

export function metadataFromSeo(seo: PublicSeo): Metadata {
  const index = seo.robots.split(',').some((part) => part.trim() === 'index')
  const follow = seo.robots.split(',').some((part) => part.trim() === 'follow')
  return {
    title: seo.title,
    description: seo.description,
    robots: { index, follow },
    alternates: { canonical: seo.canonical },
    ...(seo.openGraph ? { openGraph: seo.openGraph } : {}),
  }
}

export function sitemapUrls(
  host: string,
  entries: Array<{ path: string; updatedAt: string }>,
): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: `https://${host}${entry.path}`,
    ...(entry.updatedAt ? { lastModified: entry.updatedAt } : {}),
  }))
}

export function requestHost(forwardedHost: string | null, host: string | null): string {
  const raw = (forwardedHost || host || 'localhost').split(',')[0]?.trim() || 'localhost'
  return publicHost(raw)
}

export function publicHost(raw: string): string {
  const normalized = raw.trim().toLowerCase().split(':')[0] || 'localhost'
  if (normalized === 'www.temlinkaqui.com' || normalized === 'links.temlinkaqui.com') return 'temlinkaqui.com'
  return normalized
}
