'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
import { LinkRow } from '@/components/domain/link-row'
import { SearchBox } from '@/components/domain/search-box'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Loading } from '@/components/feedback/loading'
import { api } from '@/lib/api'

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
type SearchTarget = { kind: 'niche' | 'network' | 'results'; slug: string | null; name?: string }
type SearchBody = { target: SearchTarget; ageRequired?: boolean; showImpressions?: boolean; sponsored: Card[]; organic: Card[] }

function SearchContext({ target }: { target: SearchTarget }) {
  if (target.kind === 'results' || !target.slug) return null
  const name = target.name?.trim() || null
  const href = target.kind === 'niche'
    ? `/nicho/${encodeURIComponent(target.slug)}`
    : `/rede/${encodeURIComponent(target.slug)}`
  return (
    <div className="search-context">
      <p className="search-context-label">{target.kind === 'niche' ? 'Nicho encontrado' : 'Rede encontrada'}</p>
      <a className={name ? 'search-context-name' : 'search-context-slug'} href={href}>{name ?? target.slug}</a>
    </div>
  )
}

function rowHref(row: Card): string {
  return `/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}`
}

function SearchResults() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const [sponsored, setSponsored] = useState<Card[]>([])
  const [organic, setOrganic] = useState<Card[]>([])
  const [target, setTarget] = useState<SearchTarget | null>(null)
  const [ageRequired, setAgeRequired] = useState(false)
  const [showImpressions, setShowImpressions] = useState(true)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')

  async function load() {
    setState('loading')
    const result = await api<SearchBody>(`/v1/search?q=${encodeURIComponent(q)}`)
    if (result.status !== 200) {
      setState('error')
      return
    }
    setSponsored(result.body.sponsored ?? [])
    setOrganic(result.body.organic ?? [])
    setTarget(result.body.target ?? null)
    setAgeRequired(result.body.ageRequired === true)
    setShowImpressions(result.body.showImpressions !== false)
    setState('ready')
  }

  async function answer(choice: 'yes' | 'no') {
    if (choice === 'no') {
      setAgeRequired(false)
      if (await confirmAge('no')) await load()
      return
    }
    if (await confirmAge('yes')) await load()
  }

  useEffect(() => { void load() }, [q])

  const showEmpty = state === 'ready'
    && !ageRequired
    && target?.kind === 'results'
    && sponsored.length === 0
    && organic.length === 0

  return (
    <main className="search-page">
      <h1 className="entry-title">Buscar</h1>
      <form className="search-form" action="/busca">
        <SearchBox id="search-query" label="Busca" initial={q} />
      </form>
      {state === 'loading' ? <Loading /> : null}
      {state === 'error' ? <ErrorState onRetry={() => void load()} /> : null}
      {showEmpty ? <EmptyState>Nenhum link encontrado</EmptyState> : null}
      {state === 'ready' && ageRequired ? <AgePrompt onYes={() => void answer('yes')} onNo={() => void answer('no')} /> : null}
      {state === 'ready' && target ? <SearchContext target={target} /> : null}
      {state === 'ready' && sponsored.length > 0 ? (
        <section className="search-list" aria-labelledby="search-patrocinados">
          <h2 id="search-patrocinados">Patrocinados</h2>
          <div className="search-results">
            {sponsored.map((row) => (
              <LinkRow key={row.id} id={row.id} name={row.name} description={row.description} href={rowHref(row)} placement="sponsored" niche={row.niche} network={row.network} impressions={row.impressions} showImpressions={showImpressions} />
            ))}
          </div>
        </section>
      ) : null}
      {state === 'ready' && organic.length > 0 ? (
        <section className="search-list" aria-labelledby="search-organicos">
          <h2 id="search-organicos">Orgânicos</h2>
          <div className="search-results">
            {organic.map((row) => (
              <LinkRow key={row.id} id={row.id} name={row.name} description={row.description} href={rowHref(row)} placement="organic" niche={row.niche} network={row.network} impressions={row.impressions} showImpressions={showImpressions} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default function Page() {
  return <Suspense fallback={<main><Loading /></main>}><SearchResults /></Suspense>
}
