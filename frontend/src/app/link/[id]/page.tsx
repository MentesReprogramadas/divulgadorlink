import { cache, Suspense } from 'react'
import { RelatedSkeleton } from '@/features/catalog/components/catalog-skeleton'
import { RelatedLinksSection } from '@/features/catalog/server/related-links'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Impression } from '@/components/domain/impression'
import { trackedGoPath } from '@/domain/tracked-go'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { jsonLdScript } from '@/domain/json-ld'
import { tenantHost, forward } from '@/lib/upstream'
import { BackButton } from '@/components/ui/back-button'
import type { LinkDiscovery } from '@/components/domain/link-meta'
import { LinkDetail } from '@/features/catalog/components/link-detail'
import styles from '@/features/catalog/components/ondas-catalog.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { AgeWall } from '@/components/domain/age-gate'

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

const loadLink = cache(async (id: string): Promise<{ status: number; link: PublicLink | null }> => {
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const loaded = await loadLink(id)
  if (loaded.status === 404 || !loaded.link) notFound()
  const seo = loaded.link.seo
  if (!seo) return {}
  if (loaded.link.niche?.requiresAge) {
    return { title: 'Conteúdo para maiores de 18', robots: { index: false, follow: false } }
  }
  return metadataFromSeo({
    title: seo.title,
    description: seo.description,
    canonical: seo.canonical,
    robots: seo.robots,
    openGraph: seo.openGraph,
  })
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ surfaceToken?: string; queryId?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const loaded = await loadLink(id)
  if (loaded.status === 404 || !loaded.link) notFound()
  const link = loaded.link
  if (!link.available) {
    return (
      <main className={styles.publicPage}>
        <BackButton />
        <section className={styles.detailSummary}><LiquidLens radius={22} /><h1>Link indisponível</h1></section>
      </main>
    )
  }
  const token = query.surfaceToken || link.surfaceToken || ''
  const href = trackedGoPath(id, query.surfaceToken, link.surfaceToken, query.queryId)
  return (
    <main className={styles.publicPage}>
      <AgeWall required={link.niche?.requiresAge === true}>
        {link.seo?.robots.startsWith('index') && link.seo.structuredData ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(link.seo.structuredData) }} />
        ) : null}
        <LinkDetail id={id} link={link} href={href} sharePath={link.seo?.canonical ?? '/link/' + encodeURIComponent(id)} />
        <Impression linkId={id} surfaceToken={token} />
        <Suspense fallback={<RelatedSkeleton />}><RelatedLinksSection linkId={id} requiresAge={link.niche?.requiresAge === true} /></Suspense>
      </AgeWall>
    </main>
  )
}
