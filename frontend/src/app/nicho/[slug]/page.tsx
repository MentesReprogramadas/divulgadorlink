import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FacetCatalog, type FacetCatalogBody } from '@/components/domain/facet-catalog'
import { RetryState } from '@/components/feedback/retry-state'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { loadCatalog, oneSlug } from '@/lib/catalog-page'

export const dynamic = 'force-dynamic'

type NicheBody = FacetCatalogBody & {
  seo: FacetCatalogBody['seo'] & {
    description: string
    canonical: string
    openGraph?: { title: string; description: string; url: string }
  }
  networks?: Array<{ id: string; name: string; slug: string; requiresAge?: boolean }>
}

function apiPath(slug: string, network: string | null): string {
  const filter = network ? `?network=${encodeURIComponent(network)}` : ''
  return `/api/v1/niches/${encodeURIComponent(slug)}${filter}`
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ rede?: string | string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const query = await searchParams
  const loaded = await loadCatalog(apiPath(slug, oneSlug(query.rede)))
  if (loaded.status === 404) notFound()
  const body = loaded.body as NicheBody | null
  if (!body?.seo?.canonical) return { title: 'Tem Link Aqui', robots: { index: false, follow: false } }
  return metadataFromSeo(body.seo)
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ rede?: string | string[] }>
}) {
  const { slug } = await params
  const network = oneSlug((await searchParams).rede)
  const loaded = await loadCatalog(apiPath(slug, network))
  if (loaded.status === 404) notFound()
  const body = loaded.body as NicheBody | null
  if (!body?.seo?.title) {
    return (
      <main className="niche-page">
        <a className="niche-back" href="/" aria-label="Voltar para início"><span aria-hidden="true">←</span>Início</a>
        <RetryState />
      </main>
    )
  }
  return (
    <FacetCatalog
      pageClass="niche-page"
      descriptionClass="niche-description"
      backClass="niche-back"
      listPrefix="niche"
      mark="niche"
      route="niche"
      slug={slug}
      facetLabel="Redes"
      facetKind="network"
      active={network}
      facets={body.networks ?? []}
      body={body}
    />
  )
}
