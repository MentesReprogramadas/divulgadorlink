'use client'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HomeCatalogGrid } from './home-catalog-grid'
import { HomeMore } from '@/components/domain/home-more'
import { type LinkContext } from '@/components/domain/link-meta'
import { LinkRow } from '@/components/domain/link-row'
import { EmptyState } from '@/components/feedback/empty-state'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { api } from '@/lib/api'
import { discoveryParams, emptyDiscovery, type DiscoveryValues } from '@/features/catalog/discovery/discovery-contract'
import styles from './home-catalog.module.css'
import wave from './ondas-catalog.module.css'
import { readCatalogHistory, saveCatalogHistory } from './catalog-history'

type HomeCard = {
  id: string
  name: string
  description: string
  surfaceToken: string
  iconUrl?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  impressions?: number
  showImpressions?: boolean
} & LinkContext

type HomePage = {
  sponsored: HomeCard[]
  organic: HomeCard[]
  nextCursor?: string | null
  showImpressions?: boolean
}

function rowHref(row: HomeCard): string {
  return `/link/${row.id}?surfaceToken=${encodeURIComponent(row.surfaceToken)}`
}

function appendPage(catalog: HomePage, page: HomePage): HomePage {
  const seen = new Set([...catalog.sponsored, ...catalog.organic].map(row => row.id))
  const append = (rows: HomeCard[]) => rows.filter(row => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  }).map(row => ({ ...row, showImpressions: page.showImpressions !== false }))
  return { ...catalog, sponsored: [...catalog.sponsored, ...append(page.sponsored ?? [])], organic: [...catalog.organic, ...append(page.organic ?? [])], nextCursor: page.nextCursor ?? null }
}

export function HomeCatalog({ initial, filters = emptyDiscovery(), children }: { initial: HomePage; filters?: DiscoveryValues; children?: ReactNode }) {
  const [catalog, setCatalog] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const pending = useRef(false)
  const alive = useRef(true)
  const loadedPages = useRef(0)
  const historyPath = useRef('')
  const generation = useRef(0)
  const filterKey = discoveryParams(filters).toString()
  const [restoreScroll, setRestoreScroll] = useState<number | null>(null)

  async function fetchPage(cursor: string, signal?: AbortSignal): Promise<HomePage> {
    const filterQuery = discoveryParams(filters).toString()
    const path = `/v1/home?cursor=${encodeURIComponent(cursor)}${filterQuery ? `&${filterQuery}` : ''}`
    const result = signal ? await api<HomePage>(path, { signal }) : await api<HomePage>(path)
    if (result.status !== 200) throw new Error('Não foi possível carregar os links.')
    return result.body
  }

  useEffect(() => {
    generation.current++
    loadedPages.current = 0
    pending.current = false
    setCatalog(initial)
    setLoading(false)
    setError(false)
    setNotice('')
    setRestoreScroll(null)
    alive.current = true
    const path = window.location.pathname + window.location.search
    historyPath.current = path
    const saved = readCatalogHistory(path)
    const controller = new AbortController()
    let scrollTimer: ReturnType<typeof setTimeout> | undefined
    const persist = () => {
      clearTimeout(scrollTimer)
      scrollTimer = undefined
      if (loadedPages.current > 0) saveCatalogHistory(path, loadedPages.current, window.scrollY)
    }
    const scheduleScroll = () => {
      if (!loadedPages.current || scrollTimer !== undefined) return
      scrollTimer = setTimeout(persist, 500)
    }
    const flushNavigation = (event: MouseEvent | KeyboardEvent) => {
      if ('key' in event && event.key !== 'Enter' && !(event.key === ' ' && event.target instanceof Element && event.target.closest('button, [role="button"]'))) return
      if (scrollTimer !== undefined) persist()
    }
    window.addEventListener('pagehide', persist)
    window.addEventListener('scroll', scheduleScroll, { passive: true })
    document.addEventListener('click', flushNavigation, true)
    document.addEventListener('keydown', flushNavigation, true)
    if (saved) {
      pending.current = true
      setLoading(true)
      void (async () => {
        let restored = initial
        try {
          for (let index = 0; index < saved.pages && restored.nextCursor; index++) {
            const page = await fetchPage(restored.nextCursor, controller.signal)
            if (controller.signal.aborted) return
            restored = appendPage(restored, page)
            loadedPages.current++
            setCatalog(restored)
          }
          saveCatalogHistory(path, loadedPages.current, saved.scrollY)
          setRestoreScroll(saved.scrollY)
          setNotice('Catálogo restaurado.')
        } catch { if (!controller.signal.aborted) setError(true) }
        finally { if (!controller.signal.aborted) { pending.current = false; setLoading(false) } }
      })()
    }
    return () => {
      alive.current = false
      controller.abort()
      clearTimeout(scrollTimer)
      window.removeEventListener('pagehide', persist)
      window.removeEventListener('scroll', scheduleScroll)
      document.removeEventListener('click', flushNavigation, true)
      document.removeEventListener('keydown', flushNavigation, true)
    }
  }, [filterKey])

  useEffect(() => { if (restoreScroll !== null) { window.scrollTo(0, restoreScroll); setRestoreScroll(null) } }, [restoreScroll])

  async function loadMore() {
    if (pending.current || !catalog.nextCursor) return
    const requestGeneration = generation.current
    pending.current = true
    setLoading(true)
    setError(false)
    try {
      const result = await fetchPage(catalog.nextCursor)
      if (!alive.current || requestGeneration !== generation.current) return
      const merged = appendPage(catalog, result)
      setCatalog(merged)
      loadedPages.current++
      saveCatalogHistory(historyPath.current, loadedPages.current, window.scrollY)
      const count = merged.sponsored.length + merged.organic.length - catalog.sponsored.length - catalog.organic.length
      setNotice(count === 1 ? '1 novo link carregado.' : `${count} novos links carregados.`)
    } catch {
      if (alive.current && requestGeneration === generation.current) setError(true)
    } finally {
      if (requestGeneration === generation.current) {
        pending.current = false
        if (alive.current) setLoading(false)
      }
    }
  }

  return (
    <div id="home-catalog-results" className={styles.catalogArea}>
      {catalog.sponsored.length > 0 ? (
        <section className={wave.featuredSection} aria-labelledby="patrocinados">
          <header className={wave.sectionHeading}>
            <div><h2 id="patrocinados">Links em destaque</h2><p>Links em destaque para você conhecer.</p></div>
            <span className={wave.sponsorNote}><ActionIcon name="promotion" width={16} height={16} />Espaços patrocinados</span>
          </header>
          <HomeCatalogGrid>
            {catalog.sponsored.map((row) => (
              <LinkRow cornerAction={<FavoriteButton linkId={row.id} />} key={row.id} {...row} href={rowHref(row)} placement="sponsored" showImpressions={row.showImpressions ?? (initial.showImpressions !== false)} />
            ))}
          </HomeCatalogGrid>
        </section>
      ) : null}
        <section className={wave.catalogSection} aria-labelledby="organicos">
              <header className={wave.sectionHeading}><div><h2 id="organicos">Catálogo de links</h2><p>{catalog.sponsored.length + catalog.organic.length} links nesta seleção</p></div><a className={wave.favoriteFilter} href="/painel/favoritos"><LiquidLens radius={12} /><ActionIcon name="star" width={18} height={18} />Favoritos</a></header>
              {children ? <div className={wave.catalogFilters}>{children}</div> : null}
          {catalog.organic.length > 0 ? (
            <>
              <HomeCatalogGrid>
                {catalog.organic.map((row) => (
                  <LinkRow cornerAction={<FavoriteButton linkId={row.id} />} key={row.id} {...row} href={rowHref(row)} placement="organic" showImpressions={row.showImpressions ?? (initial.showImpressions !== false)} />
                ))}
              </HomeCatalogGrid>
            </>
          ) : catalog.sponsored.length ? <p className={wave.onlyFeatured}>Os links desta seleção estão nos destaques acima.</p> : <div className="home-empty"><EmptyState action={Object.values(filters).some(Boolean) ? <a href="/">Limpar filtros</a> : <a href="/divulgar">Publicar um link</a>}>{Object.values(filters).some(Boolean) ? 'Nenhum link encontrado com estes filtros' : 'Nenhum link publicado'}</EmptyState></div>}
        </section>
      {error ? <p className={styles.feedback} role="alert">Não foi possível carregar mais links. Os anteriores continuam aqui. Tente novamente.</p> : null}
      <p className={styles.status} role="status" aria-live="polite">{notice}</p>
      {catalog.nextCursor ? (
        <div className={styles.pagination}>
          <HomeMore cursor={catalog.nextCursor} loading={loading} onLoad={() => void loadMore()} href={`/?${new URLSearchParams({ ...Object.fromEntries(discoveryParams(filters)), cursor: catalog.nextCursor }).toString()}`} />
        </div>
      ) : null}
    </div>
  )
}
