'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdMark, FacetBadge } from '@/components/ui/facet-badge'
import { AgePrompt, confirmAge } from '@/components/domain/age-gate'
import { ImpressionMark } from '@/components/domain/link-row'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

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
  facet?: { kind: 'niche' | 'network'; slug: string; name?: string | null } | null
}

type Choice =
  | { key: string; kind: 'facet'; href: string; name: string; label: string }
  | { key: string; kind: 'link'; href: string; item: SuggestItem }

export function SearchBox({
  id,
  label,
  initial = '',
  className,
}: {
  id: string
  label: string
  initial?: string
  className?: string
}) {
  const router = useRouter()
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(initial)
  const [choices, setChoices] = useState<Choice[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [none, setNone] = useState(false)
  const [showImpressions, setShowImpressions] = useState(true)
  const [askAge, setAskAge] = useState(false)

  useEffect(() => { setValue(initial) }, [initial])

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function suggest(next: string) {
    setValue(next)
    setActive(-1)
    if (next.trim().length === 0) {
      setChoices([])
      setNone(false)
      setOpen(false)
      return
    }
    const result = await api<SuggestBody>(`/v1/search/suggest?q=${encodeURIComponent(next)}`)
    const body = result.status === 200 ? result.body : {}
    const items = body.items ?? []
    const rows: Choice[] = []
    if (body.facet?.slug) {
      const name = body.facet.name?.trim() || body.facet.slug
      rows.push({
        key: `facet-${body.facet.kind}-${body.facet.slug}`,
        kind: 'facet',
        href: body.facet.kind === 'niche'
          ? `/nicho/${encodeURIComponent(body.facet.slug)}`
          : `/rede/${encodeURIComponent(body.facet.slug)}`,
        name,
        label: body.facet.kind === 'niche' ? 'Nicho' : 'Rede',
      })
    }
    for (const item of items) {
      const href = item.surfaceToken
        ? `/link/${item.id}?surfaceToken=${encodeURIComponent(item.surfaceToken)}`
        : `/link/${item.id}`
      rows.push({ key: item.id, kind: 'link', href, item })
    }
    setChoices(rows)
    setNone(rows.length === 0)
    setShowImpressions(body.showImpressions !== false)
    setAskAge(body.ageRequired === true)
    setOpen(true)
  }

  async function answerAge(choice: 'yes' | 'no') {
    if (!(await confirmAge(choice))) return
    setAskAge(false)
    await suggest(value)
  }

  function go(choice: Choice) {
    setOpen(false)
    router.push(choice.href)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || choices.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % choices.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current <= 0 ? choices.length - 1 : current - 1))
    } else if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      go(choices[active])
    }
  }

  const activeId = active >= 0 ? `${listId}-${active}` : undefined

  return (
    <div className={className ? `suggest ${className}` : 'suggest'} ref={box}>
      <label className="search-label" htmlFor={id}>{label}</label>
      <span className="search-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="7.5" cy="7.5" r="4.75" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11.2 11.2 15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <Input
        id={id}
        name="q"
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        value={value}
        placeholder="Buscar links, temas ou comunidades..."
        onChange={(event) => void suggest(event.target.value)}
        onFocus={() => { if (choices.length > 0 || none) setOpen(true) }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <div className="suggest-pop">
          {choices.length > 0 ? (
            <ul id={listId} className="search-suggestions" role="listbox" aria-label="Sugestões">
              {choices.map((choice, index) => (
                <li key={choice.key} role="presentation">
                  <a
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    href={choice.href}
                    onMouseEnter={() => setActive(index)}
                    onClick={(event) => {
                      event.preventDefault()
                      go(choice)
                    }}
                  >
                    {choice.kind === 'facet' ? (
                      <FacetBadge
                        kind={choice.label === 'Rede' ? 'network' : 'niche'}
                        slug={decodeURIComponent(choice.href.split('/').filter(Boolean).at(-1) ?? '')}
                        name={choice.name}
                      />
                    ) : (
                      <>
                        <span>{choice.item.name}</span>
                        {choice.item.sponsored ? <AdMark /> : null}
                        <span className="suggest-tags">
                          {choice.item.niche?.name && choice.item.niche.slug ? (
                            <FacetBadge kind="niche" slug={choice.item.niche.slug} name={choice.item.niche.name} />
                          ) : null}
                          {choice.item.network?.name && choice.item.network.slug ? (
                            <FacetBadge kind="network" slug={choice.item.network.slug} name={choice.item.network.name} />
                          ) : null}
                        </span>
                        {showImpressions ? <ImpressionMark value={choice.item.impressions ?? 0} /> : null}
                      </>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {none ? <p className="search-none">Nenhuma sugestão</p> : null}
        </div>
      ) : null}
      {askAge ? <AgePrompt onYes={() => void answerAge('yes')} onNo={() => void answerAge('no')} /> : null}
    </div>
  )
}
