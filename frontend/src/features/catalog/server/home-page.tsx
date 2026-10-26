import { cache } from 'react'
import type { Metadata } from 'next'
import { HomeSearch } from '@/components/domain/home-search'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { homeStructuredData } from '@/domain/home-structured-data'
import { jsonLdScript } from '@/domain/json-ld'
import { loadCatalog } from '@/lib/catalog-page'
import { HomeDiscoveryPanel } from '@/features/catalog/components/home-discovery-panel'
import { discoveryQueryRecord, emptyDiscovery, type DiscoveryValues } from '@/features/catalog/discovery/discovery-contract'
import { InvalidDiscovery } from '@/features/catalog/discovery/invalid-discovery'
import styles from '@/features/catalog/components/ondas-catalog.module.css'
import { HomeCatalog } from '@/features/catalog/components/home-catalog'
import { HomeHeroCopy } from '@/features/catalog/components/home-hero-copy'
import { HomeTopics, HomeNetworkLinks, HomeNetworkSelect } from '@/features/catalog/components/home-navigation'
import { HomeCollections } from '@/features/catalog/components/home-collections'
import { catalogQueryRecord } from '@/domain/catalog-navigation'


type Facet = { name?: string; slug?: string } | null
type Card = { id: string; name: string; description: string; surfaceToken: string; iconUrl?: string | null; imageUrl?: string | null; imageAlt?: string | null; impressions?: number; niche?: Facet; network?: Facet; indexable?: boolean }
type Home = {
  heading?: string
  activeFilters?: DiscoveryValues
  seo: {
    title: string
    description: string
    canonical: string
    robots: string
    rating?: 'adult'
    openGraph: { title: string; description: string; url: string }
    structuredData?: Record<string, string>
  }
  networks: Array<{ id: string; name: string; slug: string; requiresAge?: boolean }>
  niches: Array<{ id: string; name: string; slug: string; requiresAge: boolean }>
  showImpressions?: boolean
  nextCursor?: string | null
  sponsored: Card[]
  organic: Card[]
}

const loadHome = cache(async (query = ''): Promise<Home | null> => {
  const result = await loadCatalog(`/api/v1/home${query ? `?${query}` : ""}`)
  if (result.status === 400) return null
  if (result.status !== 200) throw new Error(`Home upstream returned ${result.status}`)
  return result.body as Home
})

export async function generateHomeMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}): Promise<Metadata> {
  const query = await searchParams
  const home = await loadHome(catalogQueryRecord(query).toString())
  if (!home) return { robots: { index: false, follow: true } }
  const metadata=metadataFromSeo(home.seo)
  if(discoveryQueryRecord(query).size)metadata.robots={index:false,follow:true}
  return metadata
}


export async function HomeContent({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const query = await searchParams
  const filtersQuery = catalogQueryRecord(query)
  const home = await loadHome(filtersQuery.toString())
  if (!home) return <main className={styles.publicPage}><InvalidDiscovery href="/"/></main>
  const filters = home.activeFilters ?? emptyDiscovery()
  return (
    <>
      {home.seo.robots.startsWith('index') && home.seo.structuredData ? <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(homeStructuredData(
            home.seo.structuredData,
            new URL(home.seo.canonical).origin,
            [...home.sponsored, ...home.organic].filter((row) => row.indexable).map((row) => row.id),
          )),
        }}
      /> : null}
      <main className={styles.publicPage}>
          <section className={styles.hero} aria-labelledby="home-title">
            <HomeHeroCopy />
            <HomeSearch discoveryQuery={discoveryQueryRecord(query).toString()}/>
            <HomeNetworkLinks networks={home.networks} discoveryQuery={discoveryQueryRecord(query).toString()} />
          </section>
          <HomeTopics niches={home.niches} discoveryQuery={discoveryQueryRecord(query).toString()} />
          <HomeCatalog filters={filters} initial={{ sponsored: home.sponsored, organic: home.organic, nextCursor: home.nextCursor, showImpressions: home.showImpressions }}>
            <div className={styles.filterBar}><HomeNetworkSelect networks={home.networks} discoveryQuery={discoveryQueryRecord(query).toString()} /><span>Seu próximo interesse pode estar aqui.</span></div>
            <HomeDiscoveryPanel filters={filters} />
          </HomeCatalog>
          <HomeCollections links={[...home.sponsored, ...home.organic]} discoveryQuery={discoveryQueryRecord(query).toString()} />
      </main>
    </>
  )
}
