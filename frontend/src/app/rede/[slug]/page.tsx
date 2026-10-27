import { catalogQueryRecord } from '@/domain/catalog-navigation'
import { InvalidDiscovery } from '@/features/catalog/discovery/invalid-discovery'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FacetCatalog, type FacetCatalogBody } from '@/components/domain/facet-catalog'
import { RetryState } from '@/components/feedback/retry-state'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { loadCatalog, oneSlug } from '@/lib/catalog-page'
import { PublicCollectionsSection } from '@/features/catalog/server/public-collections'
import { TelegramGuide } from '@/features/catalog/components/telegram-guide'

export const dynamic = 'force-dynamic'

type RedeBody = FacetCatalogBody & {
  seo: FacetCatalogBody['seo'] & {
    description: string
    canonical: string
    openGraph?: { title: string; description: string; url: string }
  }
  niches?: Array<{ id: string; name: string; slug: string; requiresAge?: boolean }>
}

function apiPath(slug: string, niche: string | null, discovery = ""): string {
  const query = new URLSearchParams(discovery)
  if (niche) query.set("niche",niche)
  const filter = query.size ? `?${query}` : ""
  return `/api/v1/networks/${encodeURIComponent(slug)}${filter}`
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
  const loaded = await loadCatalog(apiPath(slug, oneSlug(query.nicho), catalogQueryRecord(query).toString()))
  if (loaded.status === 404) notFound()
  if (loaded.status === 400) return {robots:{index:false,follow:true}}
  const body = loaded.body as RedeBody | null
  if (!body?.seo?.canonical) throw new Error('Network SEO missing')
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
  const niche = oneSlug(query.nicho)
  const loaded = await loadCatalog(apiPath(slug, niche, catalogQueryRecord(query).toString()))
  if (loaded.status === 404) notFound()
  if (loaded.status === 400) return <main><InvalidDiscovery href={`/rede/${encodeURIComponent(slug)}`}/></main>
  const body = loaded.body as RedeBody | null
  if (!body?.seo?.title) {
    return (
      <main className="rede-page">
        <a className="rede-back" href="/" aria-label="Voltar para início"><span aria-hidden="true">←</span>Início</a>
        <RetryState />
      </main>
    )
  }
  const showTopics = !niche && !Object.keys(query).length
  const topics = showTopics ? await PublicCollectionsSection({networkSlug:slug}) : null
  const betting = showTopics && slug === 'telegram'
    ? await PublicCollectionsSection({networkSlug:'site',nicheSlug:'apostas',heading:'Sites de apostas no catálogo'}) : null
  return (
    <FacetCatalog
      pageClass="rede-page"
      descriptionClass="rede-description"
      listPrefix="rede"
      mark="network"
      route="network"
      slug={slug}
      facetLabel="Nichos"
      facetKind="niche"
      active={niche}
      facets={body.niches ?? []}
      body={body}
    >
      {topics}
      {betting}
      {showTopics && slug === 'telegram' ? <TelegramGuide /> : null}
    </FacetCatalog>
  )
}
