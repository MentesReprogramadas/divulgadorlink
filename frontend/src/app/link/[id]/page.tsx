import { Suspense } from 'react'
import { RelatedSkeleton } from '@/features/catalog/components/catalog-skeleton'
import { RelatedLinksSection } from '@/features/catalog/server/related-links'
import { loadPublicLink } from '@/features/catalog/server/load-link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Impression } from '@/components/domain/impression'
import { trackedGoPath } from '@/domain/tracked-go'
import { metadataFromSeo } from '@/domain/crawler-policy'
import { jsonLdScript } from '@/domain/json-ld'
import { BackButton } from '@/components/ui/back-button'
import { LinkDetail } from '@/features/catalog/components/link-detail'
import styles from '@/features/catalog/components/ondas-catalog.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { LinkAgeConfirmation } from '@/features/catalog/components/link-age-confirmation'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const loaded = await loadPublicLink(id)
  if (loaded.status === 404 || !loaded.link) notFound()
  const seo = loaded.link.seo
  if (!seo) return {}
  return metadataFromSeo({
    title: seo.title,
    description: seo.description,
    canonical: seo.canonical,
    robots: seo.robots,
    rating: seo.rating,
    openGraph: seo.openGraph,
  })
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ surfaceToken?: string; queryId?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const loaded = await loadPublicLink(id)
  if (loaded.status === 404 || !loaded.link) notFound()
  const link = loaded.link
  if (!link.available) {
    return (
      <main className={styles.publicPage}>
        <BackButton />
        <section className={styles.detailSummary}><LiquidLens radius={22} /><h1>Link indisponível</h1></section>
      </main>
    )
  }
  const token = query.surfaceToken || link.surfaceToken || ''
  const href = trackedGoPath(id, query.surfaceToken, link.surfaceToken, query.queryId)
  const structuredData = link.seo?.robots.startsWith('index') && link.seo.structuredData
    ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(link.seo.structuredData) }} /> : null
  if (link.ageRequired || link.blocked) {
    return <main className={styles.publicPage}>
      {structuredData}
      <nav className={styles.breadcrumb} aria-label="Caminho do link"><a href="/">Catálogo</a></nav>
      <section className={styles.detailSummary}>
        <h1>{link.name || 'Conteúdo para maiores de 18 anos'}</h1>
        {link.description ? <p>{link.description}</p> : null}
        <p>O conteúdo completo exige confirmação de idade.</p>
      </section>
      {link.ageRequired ? <LinkAgeConfirmation /> : <p>Você informou que não tem 18 anos. <a href="/">Voltar ao catálogo</a>.</p>}
    </main>
  }
  return (
    <main className={styles.publicPage}>
        {structuredData}
        <LinkDetail id={id} link={link} href={href} sharePath={link.seo?.canonical ?? '/link/' + encodeURIComponent(id)} />
        <Impression linkId={id} surfaceToken={token} />
        <Suspense fallback={<RelatedSkeleton />}><RelatedLinksSection linkId={id} requiresAge={link.requiresAge === true || link.niche?.requiresAge === true || link.network?.requiresAge === true} /></Suspense>
    </main>
  )
}
