import { discoveryQueryRecord } from '@/features/catalog/discovery/discovery-contract'
import { InvalidDiscovery } from '@/features/catalog/discovery/invalid-discovery'
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

function apiPath(slug: string, network: string | null, discovery = ""): string {
  const query = new URLSearchParams(discovery)
  if (network) query.set("network",network)
  const filter = query.size ? `?${query}` : ""
  return `/api/v1/niches/${encodeURIComponent(slug)}${filter}`
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string,string|string[]|undefined>>
}): Promise<Metadata> {
  const { slug } = await params
  const query = await searchParams
  const loaded = await loadCatalog(apiPath(slug, oneSlug(query.rede), discoveryQueryRecord(query).toString()))
  if (loaded.status === 404) notFound()
  if (loaded.status === 400) return {robots:{index:false,follow:true}}
  const body = loaded.body as NicheBody | null
  if (!body?.seo?.canonical) throw new Error('Niche SEO missing')
  return metadataFromSeo(body.seo)
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string,string|string[]|undefined>>
}) {
  const { slug } = await params
  const query = await searchParams
  const network = oneSlug(query.rede)
  const loaded = await loadCatalog(apiPath(slug, network, discoveryQueryRecord(query).toString()))
  if (loaded.status === 404) notFound()
  if (loaded.status === 400) return <main><InvalidDiscovery href={`/nicho/${encodeURIComponent(slug)}`}/></main>
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
