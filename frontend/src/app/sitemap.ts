import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { requestHost, sitemapUrls } from '@/domain/crawler-policy'
import { forward, tenantHost } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerStore = await headers()
  const host = requestHost(headerStore.get('x-forwarded-host'), headerStore.get('host'))
  const fallback = sitemapUrls(host, [{ path: '/', updatedAt: new Date().toISOString() }])
  try {
    const result = await forward({
      method: 'GET',
      path: '/api/v1/sitemap',
      host: tenantHost(host),
    })
    if (result.status !== 200) return fallback
    const body = JSON.parse(result.body.toString()) as { entries?: Array<{ path: string; updatedAt: string }> }
    return sitemapUrls(host, body.entries ?? [])
  } catch {
    return fallback
  }
}
