import {personalHostTarget} from '@/features/profile-hosts/host-routing'
import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { requestHost, sitemapUrls } from '@/domain/crawler-policy'
import { forward, tenantHost } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerStore = await headers()
  if(personalHostTarget(headerStore.get('host')??''))return []
  const host = requestHost(headerStore.get('x-forwarded-host'), headerStore.get('host'))
  const result = await forward({
    method: 'GET',
    path: '/api/v1/sitemap',
    host: tenantHost(host),
  })
  if (result.status !== 200) throw new Error(`Sitemap upstream returned ${result.status}`)
  const body = JSON.parse(result.body.toString()) as { entries?: Array<{ path: string; updatedAt: string }> }
  if (!Array.isArray(body.entries) || body.entries.length === 0) throw new Error('Sitemap entries missing')
  return sitemapUrls(host, body.entries)
}
