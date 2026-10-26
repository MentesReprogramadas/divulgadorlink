'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { AdMark, FacetBadge } from '@/components/ui/facet-badge'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
import { ImpressionMark } from '@/components/domain/link-row'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import styles from './search-box.module.css'

type Facet = { name?: string; slug?: string } | null
export type SuggestItem = {
  id: string
  name: string
  surfaceToken?: string
  impressions?: number
  niche?: Facet
  network?: Facet
  sponsored?: boolean
}
type SuggestBody = {
  items?: SuggestItem[]
  showImpressions?: boolean
  ageRequired?: boolean
  facet?: SuggestFacet | null
  facets?: SuggestFacet[]
}
type SuggestFacet = { kind:'niche'|'network';slug:string;name?:string|null;requiresAge?:boolean }

type Choice =
  | { key: string; kind: 'facet'; href: string; name: string; label: string; requiresAge?:boolean }
  | { key: string; kind: 'link'; href: string; item: SuggestItem }

export function SearchBox({
  id,
  label,
  initial = '',
  className,
  discoveryQuery = "",
}: {
  id: string
  label: string
  initial?: string
  className?: string
  discoveryQuery?: string
}) {
  const router = useRouter()
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)
  const latestRequest = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controller = useRef<AbortController | null>(null)
  const composing = useRef(false)
  const previousContext = useRef({ initial, discoveryQuery })
  const [value, setValue] = useState(initial)
  const [choices, setChoices] = useState<Choice[]>([])
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [contextPending, setContextPending] = useState(false)
  const [active, setActive] = useState(-1)
  const [none, setNone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [showImpressions, setShowImpressions] = useState(true)
  const [askAge, setAskAge] = useState(false)

  useEffect(() => {
    if (previousContext.current.initial === initial && previousContext.current.discoveryQuery === discoveryQuery) return
    previousContext.current = { initial, discoveryQuery }
    setValue(initial); dismiss(); setChoices([]); setNone(false); setFailed(false); setAskAge(false)
  }, [initial, discoveryQuery])

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) dismiss()
    }
    document.addEventListener('mousedown', close)
    return () => { document.removeEventListener('mousedown', close); cancelRequest() }
  }, [])

  function cancelRequest() {
    latestRequest.current++
    if (timer.current) clearTimeout(timer.current)
    controller.current?.abort()
  }

  function dismiss() {
    cancelRequest()
    setPending(false)
    setContextPending(false)
    setOpen(false)
    setActive(-1)
  }

  function suggest(next: string) {
    cancelRequest()
    const requestId = latestRequest.current
    setValue(next)
    setActive(-1)
    setChoices([])
    setNone(false)
    setFailed(false)
    setContextPending(false)
    setAskAge(false)
    if (next.trim().length === 0) {
      setPending(false)
      setChoices([])
      setNone(false)
      setOpen(false)
      return
    }
    setPending(true)
    setOpen(true)
    timer.current = setTimeout(() => void loadSuggestions(next, requestId), 150)
  }

  async function loadSuggestions(next: string, requestId: number, quick=true) {
    controller.current = new AbortController()
    const result = await api<SuggestBody>(`/v1/search/suggest?q=${encodeURIComponent(next)}${discoveryQuery ? `&${discoveryQuery}` : ""}${quick?'&quick=1':''}`, { signal: controller.current.signal }).catch(() => ({ status: 503, body: {} as SuggestBody }))
    if (requestId !== latestRequest.current) return
    setPending(false)
    setContextPending(false)
    if (result.status !== 200) { setFailed(true); return }
    const body = result.body
    const items = body.items ?? []
    const rows: Choice[] = []
    for (const item of items) {
      const href = item.surfaceToken
        ? `/link/${item.id}?surfaceToken=${encodeURIComponent(item.surfaceToken)}`
        : `/link/${item.id}`
      rows.push({ key: item.id, kind: 'link', href, item })
    }
    for(const facet of body.facets??(body.facet?[body.facet]:[])) {
      if(!facet.slug)continue
      const name = facet.name?.trim() || facet.slug
      rows.push({
        key: `facet-${facet.kind}-${facet.slug}`,
        kind: 'facet',
        href: (facet.kind === 'niche'
          ? `/nicho/${encodeURIComponent(facet.slug)}`
          : `/rede/${encodeURIComponent(facet.slug)}`) + (discoveryQuery ? `?${discoveryQuery}` : ""),
        name,
        label: facet.kind === 'niche' ? 'Nicho' : 'Rede',
        requiresAge:facet.requiresAge,
      })
    }
    const enrich=quick&&items.length===0&&!body.ageRequired&&next.trim().length>=3
    setChoices(rows)
    setActive(-1)
    setNone(rows.length === 0&&!enrich)
    setShowImpressions(body.showImpressions !== false)
    setAskAge(body.ageRequired === true)
    setOpen(true)
    if(enrich){
      setContextPending(true)
      timer.current=setTimeout(()=>void loadSuggestions(next,requestId,false),350)
    }
  }

  async function answerAge(choice: 'yes' | 'no') {
    if (!(await confirmAge(choice))) return
    setAskAge(false)
    await suggest(value)
  }

  function go(choice: Choice) {
    dismiss()
    router.push(choice.href)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || composing.current) return
    if (event.key === 'Escape') { dismiss(); return }
    if (pending) return
    if (!open || choices.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % choices.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current <= 0 ? choices.length - 1 : current - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      go(choices[active])
    }
  }

  const hasOptions = open && !pending && choices.length > 0
  const activeId = hasOptions && active >= 0 ? `${listId}-${active}` : undefined
  const groups = [
    { label: 'Links sugeridos', rows: choices.filter((choice) => choice.kind === 'link') },
    { label: 'Nichos e redes', rows: choices.filter((choice) => choice.kind === 'facet') },
  ].filter((group) => group.rows.length > 0)

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  return (
    <div className={`suggest ${styles.search} ${className ?? ''}`} ref={box} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) dismiss() }}>
      <LiquidLens radius={20} />
      <label className="search-label" htmlFor={id}>{label}</label>
      <span className="search-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="7.5" cy="7.5" r="4.75" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11.2 11.2 15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id={id}
        name="q"
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={hasOptions}
        aria-controls={hasOptions ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        value={value}
        placeholder="Busque por nome, assunto ou comunidade"
        onChange={(event) => { if (composing.current) setValue(event.target.value); else suggest(event.target.value) }}
        onCompositionStart={() => { composing.current = true; dismiss() }}
        onCompositionEnd={(event) => { composing.current = false; suggest(event.currentTarget.value) }}
        onFocus={() => { if (choices.length > 0 || none || failed) setOpen(true) }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <div className={styles.popup}>
          <LiquidLens radius={18} />
          {pending ? <SkeletonRegion label="Carregando sugestões">{Array.from({ length: Math.max(choices.length, 3) }, (_, i) => <div className={styles.option} key={i}><Skeleton width="75%" height={26} /></div>)}</SkeletonRegion> : null}
          {!pending && choices.length > 0 ? (
            <div id={listId} className={styles.list} role="listbox" aria-label="Sugestões">
              {groups.map((group) => (
                <div key={group.label} className={styles.group} role="group" aria-label={group.label}>
                  <div className={styles.groupTitle} aria-hidden="true">{group.label}</div>
                  {group.rows.map((choice) => {
                    const index = choices.indexOf(choice)
                    return (
                      <a
                        key={choice.key}
                        id={`${listId}-${index}`}
                        className={styles.option}
                        role="option"
                        aria-selected={index === active}
                        href={choice.href}
                        onMouseEnter={() => setActive(index)}
                        onClick={(event) => {
                          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
                          event.preventDefault()
                          go(choice)
                        }}
                      >
                        <SuggestionContent choice={choice} showImpressions={showImpressions} />
                        <svg className={styles.arrow} width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : null}
          {!pending && failed ? <div><p role="alert">Não foi possível carregar as sugestões.</p><Button type="button" variant="secondary" readOnlyAllowed onClick={() => { box.current?.querySelector('input')?.focus(); suggest(value) }}>Tentar novamente</Button></div> : null}
          {!pending && none ? <p className="search-none" role="status">Nenhuma sugestão</p> : null}
          {contextPending ? <p className={styles.metadata} role="status">Buscando links relacionados…</p> : null}
          <span className={styles.srOnly} role="status">{hasOptions ? `${choices.length} sugestões disponíveis. Use as setas para navegar.` : ''}</span>
          <a className={styles.allResults} href={`/busca?q=${encodeURIComponent(value)}${discoveryQuery ? `&${discoveryQuery}` : ""}`}>
            Ver todos os resultados <span aria-hidden="true">→</span>
          </a>
        </div>
      ) : null}
      {!pending && askAge ? <AgePrompt onYes={() => answerAge('yes')} onNo={() => answerAge('no')} /> : null}
    </div>
  )
}

function SuggestionContent({ choice, showImpressions }: { choice: Choice; showImpressions: boolean }) {
  if (choice.kind === 'facet') {
    return (
      <span className={styles.content}>
        <span className={styles.title}>{choice.name}</span>
        <span className={styles.metadata}>Explorar {choice.label === 'Rede' ? 'rede' : 'nicho'}{choice.requiresAge?' · +18':null}</span>
      </span>
    )
  }
  return (
    <span className={styles.content}>
      <span className={styles.title}>{choice.item.name}</span>
      <span className={styles.metadata}>
        {choice.item.sponsored ? <AdMark /> : null}
        {choice.item.niche?.name && choice.item.niche.slug ? (
          <FacetBadge kind="niche" slug={choice.item.niche.slug} name={choice.item.niche.name} />
        ) : null}
        {choice.item.network?.name && choice.item.network.slug ? (
          <FacetBadge kind="network" slug={choice.item.network.slug} name={choice.item.network.name} />
        ) : null}
        {showImpressions ? <ImpressionMark value={choice.item.impressions ?? 0} /> : null}
      </span>
    </span>
  )
}
