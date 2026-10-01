import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Impression } from '@/components/domain/impression'
import { tenantHost, forward } from '@/lib/upstream'

type PublicLink = {
  available: boolean
  name?: string
  description?: string
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

async function loadLink(id: string): Promise<{ status: number; link: PublicLink | null }> {
  const hostHeader = (await headers()).get('host') ?? 'localhost'
  const result = await forward({
    method: 'GET',
    path: `/api/v1/links/${id}`,
    host: tenantHost(hostHeader.split(':')[0] || 'localhost'),
  })
  if (result.status === 404) return { status: 404, link: null }
  return { status: result.status, link: JSON.parse(result.body.toString()) as PublicLink }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const loaded = await loadLink(id)
  if (loaded.status === 404 || !loaded.link) notFound()
  const seo = loaded.link.seo
  if (!seo) return {}
  return {
    title: seo.title,
    description: seo.description,
    robots: { index: seo.robots.startsWith('index'), follow: seo.robots.includes('follow') },
    alternates: { canonical: seo.canonical },
    openGraph: seo.openGraph,
  }
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
  if (!link.available) return <main><h1>Link indisponível</h1></main>
  const token = query.surfaceToken || link.surfaceToken || ''
  const href = link.goPath ?? `/go/${id}?surfaceToken=${encodeURIComponent(token)}`
  return (
    <main>
      {link.seo?.structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(link.seo.structuredData) }} />
      ) : null}
      <h1>{link.name}</h1>
      <p>{link.description}</p>
      <Impression linkId={id} surfaceToken={token} />
      <a href={href}>Acessar</a>
    </main>
  )
}
