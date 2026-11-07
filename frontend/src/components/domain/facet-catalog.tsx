'use client'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'

import { DiscoveryFilters } from '@/features/catalog/discovery/discovery-filters'
import { discoveryHref, emptyDiscovery, type DiscoveryValues } from '@/features/catalog/discovery/discovery-contract'
import {useId, useState, type ReactNode} from 'react'
import {CatalogCardsSkeleton} from '@/features/catalog/components/catalog-skeleton'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
import { FacetFilters } from '@/components/domain/facet-filters'
import { LinkRow } from '@/components/domain/link-row'
import type { LinkDiscovery } from '@/components/domain/link-meta'
import { EmptyState } from '@/components/feedback/empty-state'
import { jsonLdScript } from '@/domain/json-ld'
import { TitleMark } from '@/components/ui/facet-badge'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { CatalogGrid } from './catalog-grid'
import { CatalogBreadcrumbs, type CatalogBreadcrumb } from '@/features/catalog/components/catalog-breadcrumbs'
import seoStyles from '@/features/catalog/components/catalog-seo.module.css'
import styles from './facet-catalog.module.css'

type Facet = { name?: string; slug?: string } | null
type Card = {
  id: string
  name: string
  description: string
  surfaceToken: string
  iconUrl?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  impressions?: number
  niche?: Facet
  discovery?: LinkDiscovery
  network?: Facet
}
type FacetItem = { id: string; name: string; slug: string; requiresAge?: boolean }

export type FacetCatalogBody = {
  activeFilters?: DiscoveryValues
  heading: string
  seo: {
    title: string
    description?: string
    robots: string
    structuredData?: Record<string, unknown>
  }
  ageRequired?: boolean
  blocked?: boolean
  nextCursor?: string | null
  breadcrumbs?: CatalogBreadcrumb[]
  previews?: Array<{ id: string; name: string; description: string }>
  showImpressions?: boolean
  sponsored: Card[]
  organic: Card[]
}

function facetHref(route: 'niche' | 'network' | 'collection', slug: string, next: string | null): string {
  if (route === 'collection') return `/descobrir/${encodeURIComponent(slug)}`
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
  filterButton,
  filterPanel,
  children,
}: {
  id: string
  title: string
  rows: Card[]
  placement: 'sponsored' | 'organic'
  showImpressions: boolean
  filterButton?: ReactNode
  filterPanel?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className={`${id.split('-')[0]}-list`} aria-labelledby={id}>
      {filterButton ? <header className={styles.resultHeading}><h2 id={id}>{title}</h2>{filterButton}</header> : <h2 id={id}>{title}</h2>}
      {filterPanel}
      {children}
      {rows.length > 0 ? <CatalogGrid>
        {rows.map((row) => (
          <LinkRow
            cornerAction={<FavoriteButton linkId={row.id} />}
            key={row.id}
            id={row.id}
            name={row.name}
            description={row.description}
            iconUrl={row.iconUrl}
            imageUrl={row.imageUrl}
            imageAlt={row.imageAlt}
            href={rowHref(row)}
            placement={placement}
            niche={row.niche}
            network={row.network}
            discovery={row.discovery}
            impressions={row.impressions}
            showImpressions={showImpressions}
          />
        ))}
      </CatalogGrid> : null}
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
  children,
}: {
  pageClass: string
  descriptionClass: string
  listPrefix: string
  mark: 'niche' | 'network'
  route: 'niche' | 'network' | 'collection'
  slug: string
  facetLabel: string
  facetKind: 'niche' | 'network'
  active: string | null
  facets: FacetItem[]
  body: FacetCatalogBody
  children?: ReactNode
}) {
  const [filtering,setFiltering]=useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersId = useId()
  const filters = body.activeFilters ?? emptyDiscovery()
  const filterCount = Object.values(filters).filter(Boolean).length
  const showImpressions = body.showImpressions !== false
  const sponsored = body.sponsored ?? []
  const organic = body.organic ?? []
  const firstPlacement = sponsored.length ? 'sponsored' : 'organic'
  const firstRows = sponsored.length ? sponsored : organic
  const description = usableDescription(body.heading, body.seo)
  const indexable = body.seo.robots.startsWith('index')
  const nextPage = body.nextCursor ? discoveryHref(facetHref(route, slug, active), body.activeFilters ?? emptyDiscovery()) : null

  async function answer(choice: 'yes' | 'no') {
    if (!(await confirmAge(choice))) throw new Error('Confirmação indisponível')
    const url = new URL(window.location.href)
    url.searchParams.delete('cursor')
    // A document request avoids stalled RSC refreshes after the age cookie changes.
    window.location.replace(url.href)
  }

  return (
    <main className={pageClass}>
      {indexable && body.seo.structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(body.seo.structuredData) }} />
      ) : null}
      <BackButton />
      {body.breadcrumbs ? <CatalogBreadcrumbs items={body.breadcrumbs} /> : null}
      <h1 className="entry-title page-mark"><TitleMark kind={mark} slug={slug} />{body.heading}</h1>
      {description ? <p className={descriptionClass}>{description}</p> : null}
      {route !== 'collection' ? <FacetFilters
        label={facetLabel}
        kind={facetKind}
        items={facets}
        active={active}
        hrefFor={(next) => discoveryHref(facetHref(route, slug, next), body.activeFilters ?? emptyDiscovery())}
      /> : null}
      {body.ageRequired ? <AgePrompt onYes={() => answer('yes')} onNo={() => answer('no')} /> : null}
      {body.blocked ? <p className="age-blocked">Este conteúdo é só para maiores de 18 anos.</p> : null}
      {body.previews?.length ? <section className={seoStyles.previews} aria-labelledby="public-previews"><h2 id="public-previews">Conheça as comunidades</h2><ul>{body.previews.map(preview => <li key={preview.id}><a href={`/link/${encodeURIComponent(preview.id)}`}>{preview.name}</a><p>{preview.description}</p></li>)}</ul></section> : null}
      <ResultList
        id={`${listPrefix}-${sponsored.length ? 'patrocinados' : organic.length ? 'organicos' : 'resultados'}`}
        title={sponsored.length ? 'Patrocinados' : organic.length ? 'Orgânicos' : 'Links'}
        rows={filtering ? [] : firstRows}
        placement={firstPlacement}
        showImpressions={showImpressions}
        filterButton={<Button type="button" variant="secondary" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(open => !open)}>
          Filtros{filterCount ? ` (${filterCount})` : ''}
        </Button>}
        filterPanel={<div id={filtersId} className={styles.filterPanel} hidden={!filtersOpen}><DiscoveryFilters initial={filters} onPending={setFiltering} open={filtersOpen} onOpenChange={setFiltersOpen} /></div>}
      >
        {filtering ? <CatalogCardsSkeleton count={Math.max(sponsored.length + organic.length, 3)} /> : null}
        {!filtering && !body.ageRequired && !body.blocked && firstRows.length === 0 ? <EmptyState>{filterCount ? 'Nenhum link encontrado com estes filtros' : 'Nenhum link publicado'}</EmptyState> : null}
      </ResultList>
      {!filtering && sponsored.length > 0 && organic.length > 0 ? (
        <ResultList id={`${listPrefix}-organicos`} title="Orgânicos" rows={organic} placement="organic" showImpressions={showImpressions} />
      ) : null}
      {nextPage && body.nextCursor ? <nav className={seoStyles.pagination} aria-label="Paginação"><a href={`${nextPage}${nextPage.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(body.nextCursor)}`} rel="next">Próxima página</a></nav> : null}
      {children}
    </main>
  )
}
