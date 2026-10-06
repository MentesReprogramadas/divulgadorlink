import { cache } from 'react'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Impression } from '@/components/domain/impression'
import { trackedGoPath } from '@/domain/tracked-go'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { jsonLdScript } from '@/domain/json-ld'
import { tenantHost, forward } from '@/lib/upstream'
import { DetailContext } from './detail-context'
import { LinkMeta } from '@/components/domain/link-meta'
import { AgeWall } from '@/components/domain/age-gate'

type FacetRef = { name?: string; slug?: string; requiresAge?: boolean }

type PublicLink = {
  available: boolean
  name?: string
  description?: string
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

type ContextTarget = { href: string; name: string; home: boolean }

function facetTarget(facet: FacetRef | undefined, prefix: '/nicho' | '/rede'): ContextTarget | null {
  const name = facet?.name?.trim() ?? ''
  const slug = facet?.slug?.trim() ?? ''
  if (!name || !slug) return null
  return { href: `${prefix}/${encodeURIComponent(slug)}`, name, home: false }
}

function contextOf(link: PublicLink): ContextTarget {
  return facetTarget(link.niche, '/nicho')
    ?? facetTarget(link.network, '/rede')
    ?? { href: '/', name: 'Início', home: true }
}

function usableDescription(name: string, description: string | undefined): string | null {
  const text = description?.trim() ?? ''
  if (!text || text === name.trim()) return null
  return text
}

const loadLink = cache(async (id: string): Promise<{ status: number; link: PublicLink | null }> => {
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  const result = await forward({
    method: 'GET',
    path: `/api/v1/links/${id}`,
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
  })
  if (result.status === 404) return { status: 404, link: null }
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
  searchParams: Promise<{ surfaceToken?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const loaded = await loadLink(id)
  if (loaded.status === 404 || !loaded.link) notFound()
  const link = loaded.link
  if (!link.available) {
    return (
      <main className="detail-page">
        <DetailContext href="/" name="Início" home />
        <h1 className="entry-title">Link indisponível</h1>
      </main>
    )
  }
  const token = query.surfaceToken || link.surfaceToken || ''
  const href = trackedGoPath(id, query.surfaceToken, link.surfaceToken)
  const context = contextOf(link)
  const description = usableDescription(link.name ?? '', link.description)
  return (
    <main className="detail-page">
      <AgeWall required={link.niche?.requiresAge === true}>
        {link.seo?.structuredData ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(link.seo.structuredData) }} />
        ) : null}
        <DetailContext href={context.href} name={context.name} home={context.home} />
        <h1 className="entry-title">{link.name}</h1>
        {description ? <p className="detail-description">{description}</p> : null}
        <LinkMeta niche={link.niche} network={link.network} />
        <Impression linkId={id} surfaceToken={token} />
        <a className="detail-access" href={href}>Acessar</a>
      </AgeWall>
    </main>
  )
}
