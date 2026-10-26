import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FacetCatalog, type FacetCatalogBody } from '@/components/domain/facet-catalog'
import { InvalidDiscovery } from '@/features/catalog/discovery/invalid-discovery'
import { catalogQueryRecord } from '@/domain/catalog-navigation'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { loadCatalog } from '@/lib/catalog-page'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }
type CollectionBody = FacetCatalogBody & { seo: FacetCatalogBody['seo'] & {description:string; canonical:string; rating?:'adult'} }

async function collection({ params, searchParams }: Props) {
  const { slug } = await params
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound()
  const query = catalogQueryRecord(await searchParams)
  const result = await loadCatalog(`/api/v1/catalog-collections/${encodeURIComponent(slug)}${query.size ? `?${query}` : ''}`)
  if (result.status === 404) notFound()
  return { slug, result }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { result } = await collection(props)
  if (result.status === 400) return {robots:{index:false,follow:true}}
  return metadataFromSeo((result.body as CollectionBody).seo)
}

export default async function Page(props: Props) {
  const { slug, result } = await collection(props)
  if (result.status === 400) return <main><InvalidDiscovery href={`/descobrir/${encodeURIComponent(slug)}`} /></main>
  return <FacetCatalog pageClass="niche-page" descriptionClass="niche-description" listPrefix="collection" mark="niche" route="collection" slug={slug} facetLabel="Categorias" facetKind="niche" active={null} facets={[]} body={result.body as CollectionBody} />
}
