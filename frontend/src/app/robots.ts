import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { PRIVATE_PATHS, requestHost } from '@/domain/crawler-policy'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers()
  const host = requestHost(headerStore.get('x-forwarded-host'), headerStore.get('host'))
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: PRIVATE_PATHS,
    },
    sitemap: `https://${host}/sitemap.xml`,
  }
}
