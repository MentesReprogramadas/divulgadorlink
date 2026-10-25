import { cache } from 'react'
import { headers } from 'next/headers'
import { tenantHost, forward } from '@/lib/upstream'
import type { LinkDiscovery } from '@/components/domain/link-meta'

type FacetRef = { name?: string; slug?: string; requiresAge?: boolean }

type PublicLink = {
  discovery?: LinkDiscovery
  available: boolean
  name?: string
  description?: string
  iconUrl?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  network?: FacetRef
  niche?: FacetRef
  surfaceToken?: string
  goPath?: string
  seo?: {
    title: string
    description: string
    canonical: string
    robots: string
    openGraph?: { title: string; description: string; url: string }
    structuredData?: Record<string, string>
  }
}

export const loadPublicLink = cache(async (id: string): Promise<{ status: number; link: PublicLink | null }> => {
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  const result = await forward({
    method: 'GET',
    path: `/api/v1/links/${id}`,
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
  })
  if (result.status === 404) return { status: 404, link: null }
  if (result.status !== 200) throw new Error(`Link upstream returned ${result.status}`)
  return { status: result.status, link: JSON.parse(result.body.toString()) as PublicLink }
})
