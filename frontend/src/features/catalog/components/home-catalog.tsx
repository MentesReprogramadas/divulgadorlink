'use client'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'

import { useRef, useState } from 'react'
import { CatalogGrid } from '@/components/domain/catalog-grid'
import { HomeMore } from '@/components/domain/home-more'
import { type LinkContext } from '@/components/domain/link-meta'
import { LinkRow } from '@/components/domain/link-row'
import { EmptyState } from '@/components/feedback/empty-state'
import { api } from '@/lib/api'
import styles from './home-catalog.module.css'

type HomeCard = {
  id: string
  name: string
  description: string
  surfaceToken: string
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

export function HomeCatalog({ initial }: { initial: HomePage }) {
  const [catalog, setCatalog] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const pending = useRef(false)

  async function loadMore() {
    if (pending.current || !catalog.nextCursor) return
    pending.current = true
    setLoading(true)
    setError(false)
    try {
      const result = await api<HomePage>(`/v1/home?cursor=${encodeURIComponent(catalog.nextCursor)}`)
      if (result.status !== 200) throw new Error('Não foi possível carregar os links.')
      const seen = new Set([...catalog.sponsored, ...catalog.organic].map((row) => row.id))
      const append = (rows: HomeCard[]) => rows.filter((row) => {
        if (seen.has(row.id)) return false
        seen.add(row.id)
        return true
      }).map((row) => ({ ...row, showImpressions: result.body.showImpressions !== false }))
      const sponsored = append(result.body.sponsored ?? [])
      const organic = append(result.body.organic ?? [])
      setCatalog({
        ...catalog,
        sponsored: [...catalog.sponsored, ...sponsored],
        organic: [...catalog.organic, ...organic],
        nextCursor: result.body.nextCursor ?? null,
      })
      const count = sponsored.length + organic.length
      setNotice(count === 1 ? '1 novo link carregado.' : `${count} novos links carregados.`)
    } catch {
      setError(true)
    } finally {
      pending.current = false
      setLoading(false)
    }
  }

  return (
    <div id="home-catalog-results" className={styles.catalogArea}>
      {catalog.sponsored.length > 0 ? (
        <section className={styles.sponsored} aria-labelledby="patrocinados">
          <header className={styles.sectionHeader}>
            <h2 id="patrocinados" className={styles.sectionTitle}>Patrocinados</h2>
            <p>Links promovidos por quem publica.</p>
          </header>
          <CatalogGrid>
            {catalog.sponsored.map((row) => (
              <LinkRow actions={<FavoriteButton linkId={row.id} />} key={row.id} {...row} href={rowHref(row)} placement="sponsored" showImpressions={row.showImpressions ?? (initial.showImpressions !== false)} />
            ))}
          </CatalogGrid>
        </section>
      ) : null}
      {catalog.organic.length > 0 || catalog.sponsored.length === 0 ? (
        <div className={`home-catalog ${styles.catalog}`}>
          {catalog.organic.length > 0 ? (
            <section className="home-list" aria-labelledby="organicos">
              <h2 id="organicos" className={styles.sectionTitle}>Orgânicos</h2>
              <CatalogGrid>
                {catalog.organic.map((row) => (
                  <LinkRow actions={<FavoriteButton linkId={row.id} />} key={row.id} {...row} href={rowHref(row)} placement="organic" showImpressions={row.showImpressions ?? (initial.showImpressions !== false)} />
                ))}
              </CatalogGrid>
            </section>
          ) : <div className="home-empty"><EmptyState>Nenhum link publicado</EmptyState></div>}
        </div>
      ) : null}
      {error ? <p className={styles.feedback} role="alert">Não foi possível carregar mais links. Os anteriores continuam aqui. Tente novamente.</p> : null}
      <p className={styles.status} role="status" aria-live="polite">{notice}</p>
      {catalog.nextCursor ? (
        <div className={styles.pagination}>
          <HomeMore cursor={catalog.nextCursor} loading={loading} onLoad={() => void loadMore()} />
        </div>
      ) : null}
    </div>
  )
}
