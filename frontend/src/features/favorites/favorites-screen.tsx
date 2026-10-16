'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { CollectionNameForm } from './components/collection-name-form'
import { FavoriteList } from './components/favorite-list'
import type { CollectionPage, CollectionDetail, FavoritePage } from './favorites-contract'
import styles from './components/favorites.module.css'

export function FavoritesScreen() {
  const [favorites, setFavorites] = useState<FavoritePage>({ items: [], nextCursor: null })
  const [collections, setCollections] = useState<CollectionPage>({ items: [], nextCursor: null })
  const [selected, setSelected] = useState(''), [target, setTarget] = useState(''), [detail, setDetail] = useState<CollectionDetail | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading'), [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmDelete, setConfirmDelete] = useState(false)
  const busy = useRef(false), status = useRef<HTMLParagraphElement>(null), revision = useRef(0)
  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const result = await api<T & { message?: string }>('/v1/me/' + path, init).catch(() => { throw new Error('Sem conexão. Seus dados foram mantidos; tente novamente.') })
    if ([401, 403].includes(result.status)) { setPhase('denied'); setFavorites({ items: [], nextCursor: null }); setCollections({ items: [], nextCursor: null }); setDetail(null) }
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
      if (method === 'DELETE' && path === 'collections/' + selected + '?expectedVersion=' + detail?.collection.version) { setSelected(''); setConfirmDelete(false) }
      else await refresh()
      setNotice('Alteração salva.'); requestAnimationFrame(() => status.current?.focus())
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
  const current = detail?.collection
  const shown = selected ? detail : favorites
  return <section className={styles.page} aria-label="Favoritos e coleções">
    <header><h2>Favoritos e coleções</h2><p className={styles.note}>Guarde suas descobertas em listas privadas. Só você pode vê-las.</p></header>
    <div className={styles.toolbar}><a href="/">Explorar catálogo</a><Button variant="secondary" disabled={pending} onClick={() => { setError(''); void refresh().catch(e => setError(e.message)) }}>Atualizar dados</Button></div>
    {error ? <p role="alert">{error}</p> : null}
    <p ref={status} tabIndex={-1} role="status" className={styles.status}>{notice}</p>
    {phase === 'loading' ? <p role="status">Carregando favoritos…</p> : phase === 'denied' ? <p role="alert">Favoritos indisponíveis para esta conta.</p> : phase === 'error' ? <p>Atualize os dados para tentar novamente.</p> : <>
      <section aria-label="Suas coleções" className={styles.collection}>
        <h3>Suas coleções</h3>
        <div className={styles.actions}><Button variant="secondary" aria-pressed={!selected} disabled={pending} onClick={() => setSelected('')}>Todos os favoritos</Button>{collections.items.map(c => <Button key={c.id} variant="secondary" disabled={pending} aria-pressed={selected === c.id} onClick={() => setSelected(c.id)}>{c.name}</Button>)}</div>
        {collections.nextCursor ? <Button variant="secondary" disabled={pending} onClick={() => void more('collections')}>Mais coleções</Button> : null}
        <CollectionNameForm onSave={input => mutate('collections', 'POST', input)} />
      </section>
      {current ? <section aria-label="Editar coleção" className={styles.collection}>
        <h3>{current.name}</h3><CollectionNameForm key={current.id + ':' + current.version} initialName={current.name} onSave={input => mutate('collections/' + current.id, 'PATCH', { name: input.name, expectedVersion: current.version })} />
        {confirmDelete ? <div role="group" aria-label="Confirmar exclusão"><p>Excluir esta coleção? Os favoritos e os links continuam salvos.</p><div className={styles.actions}><Button disabled={pending} onClick={() => click('collections/' + current.id + '?expectedVersion=' + current.version, 'DELETE')}>Confirmar exclusão</Button><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancelar</Button></div></div> : <Button variant="secondary" onClick={() => setConfirmDelete(true)}>Excluir coleção</Button>}
      </section> : null}
      {!selected && collections.items.length ? <label className={styles.select}>Organizar na coleção<Select value={target} onChange={e => setTarget(e.target.value)}><option value="">Escolha uma coleção</option>{collections.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label> : null}
      {selected && !detail ? <p role="status">Carregando coleção…</p> : shown ? <section aria-label={current ? 'Itens da coleção' : 'Links salvos'}><FavoriteList items={shown.items} actions={(item, index) => <>
        {current ? <><Button variant="secondary" disabled={pending} onClick={() => click('collections/' + current.id + '/items/' + item.id, 'DELETE', { expectedVersion: current.version })}>Retirar da coleção</Button><Button variant="secondary" disabled={pending || index === 0} onClick={() => click('collections/' + current.id + '/items/' + item.id, 'PATCH', { expectedVersion: current.version, move: 'up' })}>Subir</Button><Button variant="secondary" disabled={pending || (index === shown.items.length - 1 && !shown.nextCursor)} onClick={() => click('collections/' + current.id + '/items/' + item.id, 'PATCH', { expectedVersion: current.version, move: 'down' })}>Descer</Button></> : target ? <Button variant="secondary" disabled={pending || item.collectionIds?.includes(target)} onClick={() => click('collections/' + target + '/items/' + item.id, 'PUT', { expectedVersion: collections.items.find(c => c.id === target)?.version })}>{item.collectionIds?.includes(target) ? 'Já está na coleção' : 'Adicionar à coleção'}</Button> : null}
        <Button variant="secondary" disabled={pending} onClick={() => click('favorites/' + item.linkId, 'DELETE')}>Remover favorito</Button>
      </>} />{shown.nextCursor ? <Button variant="secondary" disabled={pending} onClick={() => void more('favorites')}>Mais favoritos</Button> : null}</section> : null}
    </>}
  </section>
}
