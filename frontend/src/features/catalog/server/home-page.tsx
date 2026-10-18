import { cache } from 'react'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { HomeExplore } from '@/components/domain/facet-filters'
import { HomeSearch } from '@/components/domain/home-search'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { homeStructuredData } from '@/domain/home-structured-data'
import { jsonLdScript } from '@/domain/json-ld'
import { forward, tenantHost } from '@/lib/upstream'
import { DiscoveryFilters } from '@/features/catalog/discovery/discovery-filters'
import { discoveryQueryRecord, emptyDiscovery, type DiscoveryValues } from '@/features/catalog/discovery/discovery-contract'
import { InvalidDiscovery } from '@/features/catalog/discovery/invalid-discovery'
import styles from '@/app/home.module.css'
import { HomeCatalog } from '@/features/catalog/components/home-catalog'


type Facet = { name?: string; slug?: string } | null
type Card = { id: string; name: string; description: string; surfaceToken: string; impressions?: number; niche?: Facet; network?: Facet; indexable?: boolean }
type Home = {
  activeFilters?: DiscoveryValues
  seo: {
    title: string
    description: string
    canonical: string
    robots: string
    openGraph: { title: string; description: string; url: string }
    structuredData: Record<string, string>
  }
  networks: Array<{ id: string; name: string; slug: string; requiresAge?: boolean }>
  niches: Array<{ id: string; name: string; slug: string; requiresAge: boolean }>
  showImpressions?: boolean
  nextCursor?: string | null
  sponsored: Card[]
  organic: Card[]
}

const loadHome = cache(async (query = ''): Promise<Home | null> => {
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  const result = await forward({
    method: 'GET',
    path: `/api/v1/home${query ? `?${query}` : ""}`,
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
  })
  if (result.status === 400) return null
  if (result.status !== 200) throw new Error(`Home upstream returned ${result.status}`)
  return JSON.parse(result.body.toString()) as Home
})

export async function generateHomeMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}): Promise<Metadata> {
  const home = await loadHome()
  if (!home) throw new Error("Home SEO missing")
  const metadata=metadataFromSeo(home.seo)
  if(discoveryQueryRecord(await searchParams).size)metadata.robots={index:false,follow:true}
  return metadata
}


export async function HomeContent({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const query = await searchParams
  const filtersQuery = discoveryQueryRecord(query)
  if (Array.isArray(query.cursor)) query.cursor.forEach(value=>filtersQuery.append('cursor',value))
  else if (typeof query.cursor === 'string') filtersQuery.set('cursor',query.cursor)
  const home = await loadHome(filtersQuery.toString())
  if (!home) return <main className={styles.page}><InvalidDiscovery href="/"/></main>
  const filters = home.activeFilters ?? emptyDiscovery()
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(homeStructuredData(
            home.seo.structuredData,
            new URL(home.seo.canonical).origin,
            [...home.sponsored, ...home.organic].filter((row) => row.indexable).map((row) => row.id),
          )),
        }}
      />
      <main className={styles.page}>
        <div className={styles.layout}>
          <section className={`home-masthead ${styles.masthead}`}>
            <div>
              <h1 className="entry-title">Encontre o que você procura.</h1>
              <p className="home-description">Links, comunidades e serviços organizados por tema e rede.</p>
            </div>
            <HomeSearch discoveryQuery={discoveryQueryRecord(query).toString()}/>
          </section>
          <section className={`home-explore ${styles.explore}`} aria-labelledby="home-explore">
            <h2 id="home-explore" className="home-explore-title">Explorar</h2>
            <HomeExplore niches={home.niches} networks={home.networks} discoveryQuery={discoveryQueryRecord(query).toString()}/>
          </section>
          <DiscoveryFilters initial={filters}/>
          <HomeCatalog filters={filters} key={filtersQuery.toString()} initial={{ sponsored: home.sponsored, organic: home.organic, nextCursor: home.nextCursor, showImpressions: home.showImpressions }} />
        </div>
      </main>
    </>
  )
}
