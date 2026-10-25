'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import type { DiscoveredProfile } from './discovery-api'
import styles from '@/components/domain/search-box.module.css'

export function DirectorySearch({ value, onChange, profiles, pending, error, nicheId }: {
  value: string
  onChange: (value: string) => void
  profiles: DiscoveredProfile[]
  pending: boolean
  error: string
  nicheId: string
}) {
  const id = useId(), listId = useId()
  const box = useRef<HTMLDivElement>(null)
  const composing = useRef(false)
  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const choices = profiles.filter(profile => profile.slug && profile.available !== false).slice(0, 5)
  const expanded = open && !pending && !error && choices.length > 0
  const activeId = expanded && active >= 0 && active < choices.length ? `${listId}-${active}` : undefined
  const params = new URLSearchParams({ q: value })
  if (nicheId) params.set('nicheId', nicheId)

  useEffect(() => { if (!composing.current) setDraft(value) }, [value])
  useEffect(() => { setActive(-1) }, [value, nicheId])
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])
  useEffect(() => {
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function change(next: string) {
    setDraft(next)
    setActive(-1)
    setOpen(next.trim().length > 0)
    if (!composing.current) onChange(next)
  }
  return <form role="search" aria-label="Busca de páginas" onSubmit={event => { event.preventDefault(); setOpen(false) }}>
    <div className={styles.search} ref={box} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <LiquidLens radius={20}/>
      <label className="search-label" htmlFor={id}>Buscar páginas</label>
      <span className="search-icon" aria-hidden="true"><ActionIcon name="search"/></span>
      <input id={id} name="q" type="search" role="combobox" autoComplete="off" maxLength={100}
        value={draft} placeholder="Nome ou descrição da página" aria-autocomplete="list"
        aria-expanded={expanded} aria-controls={expanded ? listId : undefined} aria-activedescendant={activeId}
        onChange={event => change(event.target.value)}
        onFocus={() => { if (value.trim()) setOpen(true) }}
        onCompositionStart={() => { composing.current = true; setOpen(false) }}
        onCompositionEnd={event => { composing.current = false; change(event.currentTarget.value) }}
        onKeyDown={event => {
          if (composing.current || event.nativeEvent.isComposing) return
          if (event.key === 'Escape') { setOpen(false); setActive(-1); return }
          if (!expanded) return
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive(current => (current + 1) % choices.length) }
          else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(current => current <= 0 ? choices.length - 1 : current - 1) }
          else if (event.key === 'Enter' && activeId) { event.preventDefault(); document.getElementById(activeId)?.click() }
        }}/>
      {open && draft.trim() && !composing.current ? <div className={styles.popup}>
        <LiquidLens radius={18}/>
        {pending ? <SkeletonRegion label="Carregando sugestões de páginas">{[0, 1, 2].map(index => <div className={styles.option} key={index}><Skeleton width="75%" height={26}/></div>)}</SkeletonRegion> : error ? <p role="status">Não foi possível carregar as sugestões. Tente buscar novamente.</p> : choices.length ? <div id={listId} className={styles.list} role="listbox" aria-label="Sugestões de páginas">
          <div className={styles.groupTitle} aria-hidden="true">Páginas sugeridas</div>
          {choices.map((profile, index) => <a key={profile.id} id={`${listId}-${index}`} className={styles.option} role="option" aria-selected={index === active}
            href={'/p/' + profile.slug} onMouseEnter={() => setActive(index)}>
            <span className={styles.content}><span className={styles.title}>{profile.name}</span><span className={styles.metadata}>{profile.sponsored ? <span>Patrocinado</span> : null}{profile.niche?.name}</span></span>
            <span aria-hidden="true">→</span>
          </a>)}
        </div> : <p role="status">Nenhuma sugestão de página</p>}
        <span className={styles.srOnly} role="status">{expanded ? `${choices.length} sugestões disponíveis. Use as setas para navegar.` : ''}</span>
        <a className={styles.allResults} href={'/paginas?' + params}>Ver todas as páginas <span aria-hidden="true">→</span></a>
      </div> : null}
    </div>
  </form>
}
