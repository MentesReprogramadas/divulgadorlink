import { cache } from 'react'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { LinkMeta } from '@/components/domain/link-meta'
import { LinkRow, SponsoredKicker } from '@/components/domain/link-row'
import { HomeExplore } from '@/components/domain/facet-filters'
import { HomeMore } from '@/components/domain/home-more'
import { HomeSearch } from '@/components/domain/home-search'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { homeStructuredData } from '@/domain/home-structured-data'
import { jsonLdScript } from '@/domain/json-ld'
import { forward, tenantHost } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

type Facet = { name?: string; slug?: string } | null
type Card = { id: string; name: string; description: string; surfaceToken: string; impressions?: number; niche?: Facet; network?: Facet; indexable?: boolean }
type Home = {
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

const loadHome = cache(async (cursor = ''): Promise<Home | null> => {
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  try {
    const result = await forward({
      method: 'GET',
      path: `/api/v1/home${query}`,
      host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
    })
    if (result.status !== 200) return null
    return JSON.parse(result.body.toString()) as Home
  } catch {
    return null
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const home = await loadHome()
  if (!home) return { title: 'Tem Link Aqui' }
  return metadataFromSeo(home.seo)
}

function rowHref(row: Card): string {
  return `/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}`
}

function SponsoredSpot({ row, showImpressions }: { row: Card; showImpressions: boolean }) {
  return (
    <article className="home-spot lift" data-placement="sponsored" data-link-id={row.id}>
      <SponsoredKicker impressions={row.impressions ?? 0} show={showImpressions} />
      <a className="home-spot-name" href={rowHref(row)}>{row.name}</a>
      {row.description ? <p className="home-spot-description">{row.description}</p> : null}
      <LinkMeta niche={row.niche} network={row.network} />
    </article>
  )
}

export default async function Page({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const cursor = (await searchParams).cursor ?? ''
  const home = await loadHome(cursor)
  if (!home) return <main><ErrorState /></main>
  const showImpressions = home.showImpressions !== false
  const leftSponsored = home.sponsored.filter((_, index) => index % 2 === 0)
  const rightSponsored = home.sponsored.filter((_, index) => index % 2 === 1)
  const layoutClass = [
    'home-layout',
    leftSponsored.length > 0 ? 'has-start' : '',
    rightSponsored.length > 0 ? 'has-end' : '',
  ].filter(Boolean).join(' ')
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
      <main>
        <div className={layoutClass}>
          {leftSponsored.length > 0 ? (
            <aside className="home-rail home-rail-start" aria-labelledby="patrocinados">
              <h2 id="patrocinados" className="home-sponsored-heading">Patrocinados</h2>
              {leftSponsored.map((row) => <SponsoredSpot key={row.id} row={row} showImpressions={showImpressions} />)}
            </aside>
          ) : null}
          <section className="home-masthead">
            <h1 className="entry-title">Encontre o que você procura.</h1>
            <p className="home-description">Links, comunidades e serviços organizados por tema e rede.</p>
            <HomeSearch />
          </section>
          {rightSponsored.length > 0 ? (
            <aside className="home-rail home-rail-end" aria-labelledby="patrocinados">
              {rightSponsored.map((row) => <SponsoredSpot key={row.id} row={row} showImpressions={showImpressions} />)}
            </aside>
          ) : null}
          <section className="home-explore" aria-labelledby="home-explore">
            <h2 id="home-explore" className="home-explore-title">Explorar</h2>
            <HomeExplore niches={home.niches} networks={home.networks} />
          </section>
          {home.organic.length > 0 || home.sponsored.length === 0 ? (
            <div className="home-catalog">
              {home.organic.length > 0 ? (
                <section className="home-list" aria-labelledby="organicos">
                  <h2 id="organicos">Orgânicos</h2>
                  <div className="home-organic">
                    {home.organic.map((row) => (
                      <LinkRow
                        key={row.id}
                        id={row.id}
                        name={row.name}
                        description={row.description}
                        href={rowHref(row)}
                        placement="organic"
                        niche={row.niche}
                        network={row.network}
                        impressions={row.impressions}
                        showImpressions={showImpressions}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <div className="home-empty"><EmptyState>Nenhum link publicado</EmptyState></div>
              )}
            </div>
          ) : null}
          <HomeMore cursor={home.nextCursor ?? null} />
        </div>
      </main>
    </>
  )
}
