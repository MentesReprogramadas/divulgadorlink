'use client'

import { useRouter } from 'next/navigation'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
import { FacetFilters } from '@/components/domain/facet-filters'
import { LinkRow } from '@/components/domain/link-row'
import { EmptyState } from '@/components/feedback/empty-state'
import { jsonLdScript } from '@/domain/json-ld'
import { TitleMark } from '@/components/ui/facet-badge'
import { Breadcrumb } from '@/components/domain/breadcrumb'

type Facet = { name?: string; slug?: string } | null
type Card = {
  id: string
  name: string
  description: string
  surfaceToken: string
  impressions?: number
  niche?: Facet
  network?: Facet
}
type FacetItem = { id: string; name: string; slug: string; requiresAge?: boolean }

export type FacetCatalogBody = {
  heading: string
  seo: {
    title: string
    description?: string
    robots: string
    structuredData?: Record<string, unknown>
  }
  ageRequired?: boolean
  blocked?: boolean
  showImpressions?: boolean
  sponsored: Card[]
  organic: Card[]
}

function facetHref(route: 'niche' | 'network', slug: string, next: string | null): string {
  if (route === 'niche') {
    const base = `/nicho/${encodeURIComponent(slug)}`
    return next ? `${base}?rede=${encodeURIComponent(next)}` : base
  }
  const base = `/rede/${encodeURIComponent(slug)}`
  return next ? `${base}?nicho=${encodeURIComponent(next)}` : base
}

function rowHref(row: Card): string {
  return `/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}`
}

function usableDescription(heading: string, seo: FacetCatalogBody['seo']): string | null {
  const description = seo.description?.trim() ?? ''
  if (!description || description === heading.trim()) return null
  return description
}

function ResultList({
  id,
  title,
  rows,
  placement,
  showImpressions,
}: {
  id: string
  title: string
  rows: Card[]
  placement: 'sponsored' | 'organic'
  showImpressions: boolean
}) {
  return (
    <section className={`${id.split('-')[0]}-list`} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className={`${id.split('-')[0]}-results`}>
        {rows.map((row) => (
          <LinkRow
            key={row.id}
            id={row.id}
            name={row.name}
            description={row.description}
            href={rowHref(row)}
            placement={placement}
            niche={row.niche}
            network={row.network}
            impressions={row.impressions}
            showImpressions={showImpressions}
          />
        ))}
      </div>
    </section>
  )
}

export function FacetCatalog({
  pageClass,
  descriptionClass,
  listPrefix,
  mark,
  route,
  slug,
  facetLabel,
  facetKind,
  active,
  facets,
  body,
}: {
  pageClass: string
  descriptionClass: string
  listPrefix: string
  mark: 'niche' | 'network'
  route: 'niche' | 'network'
  slug: string
  facetLabel: string
  facetKind: 'niche' | 'network'
  active: string | null
  facets: FacetItem[]
  body: FacetCatalogBody
}) {
  const router = useRouter()
  const showImpressions = body.showImpressions !== false
  const sponsored = body.sponsored ?? []
  const organic = body.organic ?? []
  const description = usableDescription(body.heading, body.seo)
  const indexable = body.seo.robots.startsWith('index')

  async function answer(choice: 'yes' | 'no') {
    if (choice === 'no') {
      window.location.href = '/'
      return
    }
    if (await confirmAge('yes')) router.refresh()
  }

  return (
    <main className={pageClass}>
      {indexable && body.seo.structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(body.seo.structuredData) }} />
      ) : null}
      <Breadcrumb items={[{ href: '/', name: 'Início' }, { href: facetHref(route, slug, null), name: body.heading }]} />
      <h1 className="entry-title page-mark"><TitleMark kind={mark} slug={slug} />{body.heading}</h1>
      {description ? <p className={descriptionClass}>{description}</p> : null}
      <FacetFilters
        label={facetLabel}
        kind={facetKind}
        items={facets}
        active={active}
        hrefFor={(next) => facetHref(route, slug, next)}
      />
      {body.ageRequired ? <AgePrompt onYes={() => void answer('yes')} onNo={() => void answer('no')} /> : null}
      {body.blocked ? <p className="age-blocked">Este conteúdo é só para maiores de 18 anos.</p> : null}
      {sponsored.length > 0 ? (
        <ResultList id={`${listPrefix}-patrocinados`} title="Patrocinados" rows={sponsored} placement="sponsored" showImpressions={showImpressions} />
      ) : null}
      {organic.length > 0 ? (
        <ResultList id={`${listPrefix}-organicos`} title="Orgânicos" rows={organic} placement="organic" showImpressions={showImpressions} />
      ) : null}
      {!body.ageRequired && !body.blocked && sponsored.length === 0 && organic.length === 0 ? <EmptyState>Nenhum link publicado</EmptyState> : null}
    </main>
  )
}
