'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LinkRow } from '@/components/domain/link-row'
import { CatalogGrid } from '@/components/domain/catalog-grid'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { RelatedPage } from '../related-contract'
import styles from './related-links.module.css'
import { CatalogCardsSkeleton } from './catalog-skeleton'

type RelatedLinksProps = { linkId: string; initial: RelatedPage | null; deferLoad?: boolean }
export function RelatedLinks({ linkId, initial, deferLoad = false }: RelatedLinksProps) {
  const [page, setPage] = useState<RelatedPage>(initial ?? { items: [], nextCursor: null, showImpressions: false })
  const [error, setError] = useState(initial === null && !deferLoad), [loading, setLoading] = useState(false), [notice, setNotice] = useState('')
  const [resetRequired, setResetRequired] = useState(false)
  const pending = useRef(false)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const load = useCallback(async (cursor: string | null, focusResult = false) => {
    if (pending.current) return
    pending.current = true; setLoading(true); setError(false)
    try {
      const result = await api<RelatedPage>('/v1/links/' + encodeURIComponent(linkId) + '/related' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''))
      if ([401, 403, 404].includes(result.status)) { setPage({ items: [], nextCursor: null, showImpressions: false }); return }
      if (result.status === 400) { setResetRequired(true); throw new Error('cursor') }
      if (result.status !== 200) throw new Error('related')
      setResetRequired(false)
      setPage(previous => {
        const existing = cursor ? previous.items : [], seen = new Set(existing.map(row => row.id))
        const added = result.body.items.filter(row => { if (seen.has(row.id)) return false; seen.add(row.id); return true })
        return { ...result.body, items: [...existing, ...added] }
      })
      setNotice('Sugestões atualizadas.')
      if (focusResult) requestAnimationFrame(() => statusRef.current?.focus())
    } catch { setError(true) }
    finally { pending.current = false; setLoading(false) }
  }, [linkId])
  // Only mounted after AgeWall opens. The server never embeds restricted suggestions before acceptance.
  useEffect(() => {
    if (!deferLoad) return
    void load(null)
  }, [deferLoad, load])
  if (!page.items.length && !error && !loading) return null
  return <section className={styles.section} aria-labelledby="related-links-title">
    <header className={styles.header}><h2 id="related-links-title">Links relacionados</h2><p>Explore outros links do mesmo tema ou rede.</p></header>
    <CatalogGrid>{page.items.map(item => <LinkRow key={item.id} id={item.id} name={item.name} description={item.description} niche={item.niche} network={item.network} discovery={item.discovery} impressions={item.impressions} placement={item.sponsored ? 'sponsored' : 'organic'} href={'/link/' + encodeURIComponent(item.id) + '?surfaceToken=' + encodeURIComponent(item.surfaceToken)} showImpressions={page.showImpressions} />)}</CatalogGrid>
    {loading && !page.items.length ? <CatalogCardsSkeleton count={3} withFavorite={false} /> : null}
    {error ? <p role="alert">{resetRequired ? 'As sugestões mudaram. Atualize para continuar.' : 'Não foi possível carregar as sugestões.'} {page.items.length ? 'Os links anteriores foram mantidos.' : 'Tente novamente.'}</p> : null}
    {loading || resetRequired || page.nextCursor || (error && !page.items.length) ? <Button variant="secondary" loading={loading} aria-label={loading ? 'Carregando…' : undefined} onClick={() => void load(resetRequired ? null : page.nextCursor, true)}>{resetRequired ? 'Atualizar sugestões' : page.items.length ? 'Ver mais relacionados' : 'Tentar de novo'}</Button> : null}
    <p ref={statusRef} role="status" tabIndex={-1} className={styles.status}>{notice}</p>
  </section>
}
