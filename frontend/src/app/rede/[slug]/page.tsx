import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FacetCatalog, type FacetCatalogBody } from '@/components/domain/facet-catalog'
import { RetryState } from '@/components/feedback/retry-state'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { loadCatalog, oneSlug } from '@/lib/catalog-page'

export const dynamic = 'force-dynamic'

type RedeBody = FacetCatalogBody & {
  seo: FacetCatalogBody['seo'] & {
    description: string
    canonical: string
    openGraph?: { title: string; description: string; url: string }
  }
  niches?: Array<{ id: string; name: string; slug: string; requiresAge?: boolean }>
}

function apiPath(slug: string, niche: string | null): string {
  const filter = niche ? `?niche=${encodeURIComponent(niche)}` : ''
  return `/api/v1/networks/${encodeURIComponent(slug)}${filter}`
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ nicho?: string | string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const query = await searchParams
  const loaded = await loadCatalog(apiPath(slug, oneSlug(query.nicho)))
  if (loaded.status === 404) notFound()
  const body = loaded.body as RedeBody | null
  if (!body?.seo?.canonical) return { title: 'Tem Link Aqui', robots: { index: false, follow: false } }
  return metadataFromSeo(body.seo)
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ nicho?: string | string[] }>
}) {
  const { slug } = await params
  const niche = oneSlug((await searchParams).nicho)
  const loaded = await loadCatalog(apiPath(slug, niche))
  if (loaded.status === 404) notFound()
  const body = loaded.body as RedeBody | null
  if (!body?.seo?.title) {
    return (
      <main className="rede-page">
        <a className="rede-back" href="/" aria-label="Voltar para início"><span aria-hidden="true">←</span>Início</a>
        <RetryState />
      </main>
    )
  }
  return (
    <FacetCatalog
      pageClass="rede-page"
      descriptionClass="rede-description"
      backClass="rede-back"
      listPrefix="rede"
      mark="network"
      route="network"
      slug={slug}
      facetLabel="Nichos"
      facetKind="niche"
      active={niche}
      facets={body.niches ?? []}
      body={body}
    />
  )
}
