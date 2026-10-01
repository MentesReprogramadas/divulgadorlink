import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { HomePage } from '@/components/domain/home-page'
import { ErrorState } from '@/components/feedback/error-state'
import { forward, tenantHost } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

type Card = { id: string; name: string; description: string; surfaceToken: string }
type Home = {
  seo: {
    title: string
    description: string
    canonical: string
    robots: string
    openGraph: { title: string; description: string; url: string }
    structuredData: Record<string, string>
  }
  networks: Array<{ id: string; name: string; slug: string }>
  niches: Array<{ id: string; name: string; slug: string; requiresAge: boolean }>
  sponsored: Card[]
  organic: Card[]
}

async function loadHome(): Promise<Home | null> {
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  const result = await forward({
    method: 'GET',
    path: '/api/v1/home',
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
  })
  if (result.status !== 200) return null
  return JSON.parse(result.body.toString()) as Home
}

export async function generateMetadata(): Promise<Metadata> {
  const home = await loadHome()
  if (!home) return { title: 'Tem Link Aqui' }
  const index = home.seo.robots.startsWith('index')
  return {
    title: home.seo.title,
    description: home.seo.description,
    robots: { index, follow: home.seo.robots.includes('follow') },
    alternates: { canonical: home.seo.canonical },
    openGraph: {
      title: home.seo.openGraph.title,
      description: home.seo.openGraph.description,
      url: home.seo.openGraph.url,
    },
  }
}

export default async function Page() {
  const home = await loadHome()
  if (!home) return <main><ErrorState /></main>
  const links = [...home.sponsored, ...home.organic]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(home.seo.structuredData) }} />
      <HomePage links={links} />
      <section>
        {home.niches.filter((niche) => !niche.requiresAge).map((niche) => (
          <a key={niche.id} href={`/nicho/${niche.slug}`}>{niche.name}</a>
        ))}
        {home.networks.map((network) => (
          <a key={network.id} href={`/rede/${network.slug}`}>{network.name}</a>
        ))}
      </section>
    </>
  )
}
