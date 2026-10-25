'use client'

import {CollectionPublication} from './components/collection-publication'
import { FavoriteCardsSkeleton, CollectionCardsSkeleton } from './components/favorites-skeleton'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Button, ButtonLink } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { ActionIcon } from '@/components/ui/action-icon'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { Field, Input } from '@/components/ui/input'
import { CollectionNameForm } from './components/collection-name-form'
import { CollectionGrid } from './components/collection-grid'
import { CollectionHeader } from './components/collection-header'
import { CollectionPicker } from './components/collection-picker'
import { FavoriteList } from './components/favorite-list'
import type { CollectionPage, CollectionDetail, FavoritePage, SavedFavorite, Collection } from './favorites-contract'
import styles from './components/favorites.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function FavoritesScreen() {
  const [favorites, setFavorites] = useState<FavoritePage>({ items: [], nextCursor: null })
  const [tab, setTab] = useState('favorites'), [query, setQuery] = useState('')
  const [editing, setEditing] = useState<'create' | 'rename' | null>(null)
  const [collections, setCollections] = useState<CollectionPage>({ items: [], nextCursor: null })
  const [selected, setSelected] = useState(''), [detail, setDetail] = useState<CollectionDetail | null>(null)
  const [collectionItem, setCollectionItem] = useState<SavedFavorite | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading'), [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmDelete, setConfirmDelete] = useState(false)
  const pageRef = useRef<HTMLElement>(null), collectionHeading = useRef<HTMLHeadingElement>(null), returnCollection = useRef<string | null>(null)
  const busy = useRef(false), status = useRef<HTMLParagraphElement>(null), revision = useRef(0)
  useLayoutEffect(() => { if (notice && !collectionItem && !editing) status.current?.focus() }, [notice, collectionItem, editing])
  useLayoutEffect(() => {
    if (selected) collectionHeading.current?.focus()
    else if (returnCollection.current) {
      const cards = pageRef.current?.querySelectorAll<HTMLButtonElement>('[data-collection-id]')
      const target = Array.from(cards ?? []).find(card => card.dataset.collectionId === returnCollection.current)
      const control = target ?? pageRef.current?.querySelector<HTMLButtonElement>('[data-new-collection]')
      control?.focus()
    }
  }, [selected])
  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const result = await api<T & { message?: string }>('/v1/me/' + path, init).catch(() => { throw new Error('Sem conexão. Seus dados foram mantidos; tente novamente.') })
    if ([401, 403].includes(result.status)) { setPhase('denied'); setSelected(''); setCollectionItem(null); setEditing(null); setFavorites({ items: [], nextCursor: null }); setCollections({ items: [], nextCursor: null }); setDetail(null) }
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível carregar. Atualize os dados.')
    return result.body
  }, [])
  const refresh = useCallback(async () => {
    const current = ++revision.current
    const [f, c, d] = await Promise.all([request<FavoritePage>('favorites'), request<CollectionPage>('collections'), selected ? request<CollectionDetail>('collections/' + selected) : Promise.resolve(null)])
    if (current !== revision.current) return
    setFavorites(f); setCollections(c); setDetail(d); setPhase('ready')
  }, [request, selected])
  useEffect(() => { setError(''); setDetail(null); setConfirmDelete(false); void refresh().catch(e => { setError(e.message); setPhase(p => p === 'loading' ? 'error' : p) }); return () => { revision.current++ } }, [refresh])
  async function mutate(path: string, method: string, body?: unknown) {
    if (busy.current) throw new Error('Aguarde a operação atual.')
    busy.current = true; setPending(true); setError(''); setNotice('')
    try {
      await request(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) })
      if (method === 'DELETE' && path === 'collections/' + selected + '?expectedVersion=' + detail?.collection.version) { setCollections(previous => ({ ...previous, items: previous.items.filter(collection => collection.id !== selected) })); setDetail(null); setSelected(''); setConfirmDelete(false) }
      else await refresh()
      setNotice(method === 'DELETE' && path.startsWith('collections/') && path.includes('/items/') ? 'Removido da coleção. O link continua nos favoritos.' : 'Alteração salva.')
    } catch (e) { const message = e instanceof Error ? e.message : 'Não foi possível salvar.'; setError(message); throw new Error(message) }
    finally { busy.current = false; setPending(false) }
  }
  async function more(kind: 'collections' | 'favorites') {
    if (busy.current) return
    busy.current = true; setPending(true); setError('')
    const ticket = revision.current
    try {
      if (kind === 'collections') {
        const next = await request<CollectionPage>('collections?cursor=' + collections.nextCursor)
        if (ticket === revision.current) setCollections(previous => ({ ...next, items: [...previous.items, ...next.items.filter(c => !previous.items.some(p => p.id === c.id))] }))
      } else {
        const next = await request<FavoritePage>(selected ? 'collections/' + selected + '?cursor=' + detail?.nextCursor : 'favorites?cursor=' + favorites.nextCursor)
        if (ticket === revision.current) {
          if (selected) setDetail(previous => previous ? { ...previous, ...next, items: [...previous.items, ...next.items.filter(i => !previous.items.some(p => p.id === i.id))] } : null)
          else setFavorites(previous => ({ ...next, items: [...previous.items, ...next.items.filter(i => !previous.items.some(p => p.id === i.id))] }))
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar.') }
    finally { busy.current = false; setPending(false) }
  }
  const click = (path: string, method: string, body?: unknown) => { void mutate(path, method, body).catch(() => {}) }
  async function addToCollection(collection: Collection) {
    if (!collectionItem) return
    try {
      await mutate('collections/' + collection.id + '/items/' + collectionItem.id, 'PUT', { expectedVersion: collection.version })
      setCollectionItem(null)
    } catch { /* Preserve the selected link and show the request error in the dialog. */ }
  }
  const current = detail?.collection
  const shown = selected ? detail : favorites
  const visibleItems = shown?.items.filter(item => (item.available ? `${item.name} ${item.description}` : 'Link indisponível').toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))) ?? []
  const savedList = <>
    <WorkspaceFilters label="Filtrar favoritos">
      <Field label="Buscar favoritos"><Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Título ou descrição" /></Field>
    </WorkspaceFilters>
    {selected && !detail ? error ? null : <FavoriteCardsSkeleton /> : shown ? <section aria-label={current ? 'Itens da coleção' : 'Links salvos'}><FavoriteList items={visibleItems} actions={(item) => {
      const index = shown.items.findIndex(row => row.id === item.id)
      return <>
        {current ? <details className={styles.orderActions}>
          <summary><ActionIcon name="grip" />Mover</summary>
          <div><Button variant="secondary" disabled={pending || index === 0} onClick={() => click('collections/' + current.id + '/items/' + item.id, 'PATCH', { expectedVersion: current.version, move: 'up' })}><ActionIcon name="moveUp" />Subir</Button><Button variant="secondary" disabled={pending || (index === shown.items.length - 1 && !shown.nextCursor)} onClick={() => click('collections/' + current.id + '/items/' + item.id, 'PATCH', { expectedVersion: current.version, move: 'down' })}><ActionIcon name="moveDown" />Descer</Button></div>
        </details> : <Button variant="secondary" disabled={pending} onClick={() => { setError(''); setNotice(''); setCollectionItem(item) }}><ActionIcon name="folder" />Adicionar à coleção</Button>}
        <Button variant="danger" disabled={pending} title={current ? 'Remover apenas desta coleção' : 'Remover dos favoritos'} onClick={() => current ? click('collections/' + current.id + '/items/' + item.id, 'DELETE', { expectedVersion: current.version }) : click('favorites/' + item.linkId, 'DELETE')}>Remover</Button>
      </>
    }} />{shown.nextCursor ? <Button variant="secondary" disabled={pending} onClick={() => void more('favorites')}><ActionIcon name="loadMore" />Mais favoritos</Button> : null}</section> : null}
  </>
  const collectionList = <>
    <CollectionGrid collections={collections.items} pending={pending} onOpen={collection => { returnCollection.current = collection.id; setNotice(''); setError(''); setSelected(collection.id); setQuery('') }} />
    {collections.nextCursor ? <Button variant="secondary" disabled={pending} onClick={() => void more('collections')}><ActionIcon name="loadMore" />Mais coleções</Button> : null}
  </>
  const collectionContent = <>
    <CollectionHeader name={current?.name ?? collections.items.find(collection => collection.id === selected)?.name ?? 'Coleção'} pending={pending} canEdit={Boolean(current)} headingRef={collectionHeading} onBack={() => { setSelected(''); setQuery(''); setNotice(''); setError('') }} onEdit={() => setEditing('rename')} onDelete={() => setConfirmDelete(true)} />
    {current?<CollectionPublication key={current.id} collection={current} pending={pending} onSave={mutate}/>:null}
    {confirmDelete && current ? <section role="group" aria-label="Confirmar exclusão" className={styles.collection}><p>Excluir esta coleção? Os favoritos e os links continuam salvos.</p><div className={styles.actions}><Button disabled={pending} onClick={() => click('collections/' + current.id + '?expectedVersion=' + current.version, 'DELETE')}><ActionIcon name="trash" />Confirmar exclusão</Button><Button variant="secondary" onClick={() => setConfirmDelete(false)}><ActionIcon name="close" />Cancelar</Button></div><LiquidLens radius={16} /></section> : null}
    {error ? <Button variant="secondary" disabled={pending} onClick={() => { setError(''); void refresh().catch(e => setError(e.message)) }}>Tentar novamente</Button> : null}
    {savedList}
  </>
  const actions = <WorkspaceActions>{tab === 'collections' ? <Button data-new-collection disabled={pending || phase !== 'ready'} onClick={() => setEditing('create')}><ActionIcon name="plus" />Nova coleção</Button> : <ButtonLink href="/"><ActionIcon name="catalog" />Explorar catálogo</ButtonLink>}<RefreshButton disabled={pending} onClick={() => { setError(''); void refresh().catch(e => setError(e.message)) }} /></WorkspaceActions>
  return <section ref={pageRef} className={styles.page} aria-label="Favoritos e coleções">

    {error ? <p role="alert">{error}</p> : null}<p ref={status} tabIndex={-1} role="status" className={styles.status}>{notice}</p>
    {phase === 'denied' ? <p role="alert">Favoritos indisponíveis para esta conta.</p> : null}
    {selected ? collectionContent : <Tabs label="Favoritos e coleções" value={tab} actions={actions} onChange={value => { setTab(value); setQuery(''); if (value === 'favorites') setSelected('') }} items={[{ id: 'favorites', label: 'Favoritos', icon: 'star', content: phase === 'loading' ? <><WorkspaceFilters label="Filtrar favoritos"><Field label="Buscar favoritos"><Input type="search" value={query} disabled /></Field></WorkspaceFilters><FavoriteCardsSkeleton /></> : phase === 'ready' ? savedList : null }, { id: 'collections', label: 'Coleções', icon: 'folder', content: phase === 'loading' ? <CollectionCardsSkeleton /> : phase === 'ready' ? collectionList : null }]} />}
    <OverlayDialog open={collectionItem !== null && editing === null} title="Adicionar à coleção" onClose={() => { if (!pending) setCollectionItem(null) }}>
      {collectionItem ? <CollectionPicker item={collectionItem} collections={collections} pending={pending} error={error} onChoose={collection => { void addToCollection(collection) }} onCreate={() => { setError(''); setEditing('create') }} onMore={() => { void more('collections') }} /> : null}
    </OverlayDialog>
    <OverlayDialog open={editing !== null} title={editing === 'rename' ? 'Editar coleção' : 'Nova coleção'} onClose={() => { if (!pending) setEditing(null) }}>
      {editing ? <CollectionNameForm key={editing + ':' + current?.id + ':' + current?.version} initialName={editing === 'rename' ? current?.name : undefined} onSave={async input => { await (editing === 'rename' && current ? mutate('collections/' + current.id, 'PATCH', { name: input.name, expectedVersion: current.version }) : mutate('collections', 'POST', input)); setEditing(null) }} /> : null}
    </OverlayDialog>
  </section>
}
