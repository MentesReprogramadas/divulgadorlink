'use client'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'

import { DiscoveryFilters } from '@/features/catalog/discovery/discovery-filters'
import { discoveryHref, discoveryParams, emptyDiscovery, readDiscovery, type DiscoveryValues } from '@/features/catalog/discovery/discovery-contract'
import { InvalidDiscovery } from '@/features/catalog/discovery/invalid-discovery'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
import { LinkRow } from '@/components/domain/link-row'
import type { LinkDiscovery } from '@/components/domain/link-meta'
import { CatalogGrid } from '@/components/domain/catalog-grid'
import { BackButton } from '@/components/ui/back-button'
import { SearchBox } from '@/components/domain/search-box'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { CatalogCardsSkeleton, SearchSkeleton } from '@/features/catalog/components/catalog-skeleton'
import { api } from '@/lib/api'
import styles from './search-results.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

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
type SearchTarget = { kind: 'niche' | 'network' | 'results'; slug: string | null; name?: string }
type SearchFacet = {kind:'niche'|'network';slug:string;name?:string;requiresAge?:boolean}
type SearchBody = { queryId?: string; target: SearchTarget; facets?:SearchFacet[];ageRequired?: boolean; showImpressions?: boolean; sponsored: Card[]; organic: Card[] }

function SearchContext({ facets, filters }: { facets: SearchFacet[]; filters: DiscoveryValues }) {
  if(!facets.length)return null
  return (
    <nav className={styles.context} aria-label="Nichos e redes relacionados">
      <LiquidLens radius={16} />
      <p className="search-context-label">{facets.length===1?(facets[0].kind==='niche'?'Nicho encontrado':'Rede encontrada'):'Nichos e redes relacionados'}</p>
      {facets.map(facet=><a key={facet.kind+':'+facet.slug} href={discoveryHref((facet.kind==='niche'?'/nicho/':'/rede/')+encodeURIComponent(facet.slug),filters)}>Explorar {facet.name?.trim()||facet.slug}{facet.requiresAge?' · +18':null} <span aria-hidden="true">→</span></a>)}
    </nav>
  )
}

function rowHref(row: Card, queryId?: string): string {
  return `/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}${queryId ? `&queryId=${encodeURIComponent(queryId)}` : ''}`
}

function SearchResults() {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const query = params.toString()
  const discovery = useMemo(()=>{try{return {value:readDiscovery(new URLSearchParams(query)),valid:true}}catch{return {value:emptyDiscovery(),valid:false}}},[query])
  const filterQuery = discoveryParams(discovery.value).toString()
  const resultKey=JSON.stringify([q,filterQuery,discovery.valid])
  const [loadedKey,setLoadedKey]=useState('')
  const [filtering,setFiltering]=useState(false)
  const [invalid,setInvalid] = useState(false)
  const [sponsored, setSponsored] = useState<Card[]>([])
  const [organic, setOrganic] = useState<Card[]>([])
  const [queryId, setQueryId] = useState<string | undefined>()
  const [facets, setFacets] = useState<SearchFacet[]>([])
  const [ageRequired, setAgeRequired] = useState(false)
  const [showImpressions, setShowImpressions] = useState(true)
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading')
  const displayState=filtering || loadedKey!==resultKey ? 'loading' : state

  const loadSequence = useRef(0)
  const request = useRef<AbortController | null>(null)
  async function load() {
    const sequence = ++loadSequence.current
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState('loading')
    setLoadedKey(resultKey)
    setQueryId(undefined);setInvalid(!discovery.valid)
    if (!discovery.valid) {setState('error');return}
    let result: Awaited<ReturnType<typeof api<SearchBody>>>
    try { result = await api<SearchBody>(`/v1/search?q=${encodeURIComponent(q)}${filterQuery ? `&${filterQuery}` : ''}`, { signal: controller.signal }) } catch { if (sequence === loadSequence.current) setState('error'); return }
    if (sequence !== loadSequence.current) return
    if (result.status !== 200) {
      setInvalid(result.status === 400)
      setState('error')
      return
    }
    setQueryId(result.body.queryId)
    setSponsored(result.body.sponsored ?? [])
    setOrganic(result.body.organic ?? [])
    const target=result.body.target
    setFacets(result.body.facets??(target?.slug&&target.kind!=='results'?[{kind:target.kind,slug:target.slug,name:target.name}]:[]))
    setAgeRequired(result.body.ageRequired === true)
    setShowImpressions(result.body.showImpressions !== false)
    setState('ready')
  }

  async function answer(choice: 'yes' | 'no') {
    if (await confirmAge(choice)) await load()
  }

  useEffect(() => { void load(); return () => { loadSequence.current++; request.current?.abort() } }, [q,filterQuery,discovery.valid])

  const showEmpty = displayState === 'ready'
    && !ageRequired
    && sponsored.length === 0
    && organic.length === 0

  return (
    <main className="search-page">
      <BackButton />
      <h1 className="entry-title">Buscar</h1>
      <p className={styles.summary}>{q.trim() ? `Resultados para “${q}”` : 'Encontre links ou explore por nicho e rede.'}</p>
      <form className="search-form" action="/busca">
        <SearchBox id="search-query" label="Busca" initial={q} discoveryQuery={filterQuery} />
        {Array.from(discoveryParams(discovery.value)).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
      </form>
      {!invalid && discovery.valid ? <DiscoveryFilters initial={discovery.value} onPending={setFiltering}/> : null}
      {displayState === 'loading' ? <CatalogCardsSkeleton count={Math.max(organic.length + sponsored.length, 3)} /> : null}
      {displayState === 'error' ? invalid ? <InvalidDiscovery href={`/busca?q=${encodeURIComponent(q)}`} headingLevel={2}/> : <ErrorState onRetry={() => void load()} /> : null}
      <p className={styles.summary} role="status" aria-label="Resultados da busca">{displayState === 'ready' && !ageRequired && sponsored.length + organic.length > 0 ? `${sponsored.length + organic.length} ${sponsored.length + organic.length === 1 ? 'link encontrado.' : 'links encontrados.'}` : ''}</p>
      {showEmpty ? <EmptyState action={filterQuery ? <a href={`/busca?q=${encodeURIComponent(q)}`}>Limpar filtros</a> : <a href="/">Explorar o catálogo</a>}>Nenhum link encontrado</EmptyState> : null}
      {displayState === 'ready' && ageRequired ? <AgePrompt onYes={() => answer('yes')} onNo={() => answer('no')} /> : null}
      {displayState === 'ready' && sponsored.length > 0 ? (
        <section className={`search-list ${styles.section}`} aria-labelledby="search-patrocinados">
          <h2 id="search-patrocinados">Patrocinados</h2>
          <CatalogGrid>
            {sponsored.map((row) => (
              <LinkRow cornerAction={<FavoriteButton linkId={row.id} />} key={row.id} id={row.id} name={row.name} description={row.description} iconUrl={row.iconUrl} imageUrl={row.imageUrl} imageAlt={row.imageAlt} href={rowHref(row, queryId)} placement="sponsored" niche={row.niche} network={row.network} discovery={row.discovery} impressions={row.impressions} showImpressions={showImpressions} />
            ))}
          </CatalogGrid>
        </section>
      ) : null}
      {displayState === 'ready' && organic.length > 0 ? (
        <section className={`search-list ${styles.section}`} aria-labelledby="search-organicos">
          <h2 id="search-organicos">Links encontrados</h2>
          <CatalogGrid>
            {organic.map((row) => (
              <LinkRow cornerAction={<FavoriteButton linkId={row.id} />} key={row.id} id={row.id} name={row.name} description={row.description} iconUrl={row.iconUrl} imageUrl={row.imageUrl} imageAlt={row.imageAlt} href={rowHref(row, queryId)} placement="organic" niche={row.niche} network={row.network} discovery={row.discovery} impressions={row.impressions} showImpressions={showImpressions} />
            ))}
          </CatalogGrid>
        </section>
      ) : null}
      {displayState === 'ready' ? <SearchContext facets={facets} filters={discovery.value} /> : null}
    </main>
  )
}

export default function Page() {
  return <Suspense fallback={<SearchSkeleton />}><SearchResults /></Suspense>
}
