'use client'

import { useEffect, useRef, useState, type Ref } from 'react'
import { FacetBadge } from '@/components/ui/facet-badge'
import { exploreNetworks, exploreNiches, leadFirst, NETWORK_LEAD, NICHE_LEAD } from '@/domain/facets'

export function FacetFilters({
  label,
  kind,
  items,
  active,
  hrefFor,
}: {
  label?: string
  kind: 'niche' | 'network'
  items: Array<{ slug: string; name: string; requiresAge?: boolean }>
  active: string | null
  hrefFor: (slug: string | null) => string
}) {
  const row = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const ordered = leadFirst(items, kind === 'network' ? NETWORK_LEAD : NICHE_LEAD, active)

  useEffect(() => {
    const element = row.current
    if (!element) return
    const measure = () => setOverflow(element.scrollWidth > element.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ordered, open])

  if (items.length === 0) return null
  const headingId = `facets-${kind}`
  return (
    <section className="page-facets" aria-labelledby={label ? headingId : undefined}>
      {label ? <h2 id={headingId}>{label}</h2> : null}
      <div ref={row} className={open ? 'facet-line is-open' : 'facet-line'}>
        {ordered.map((item) => {
          const selected = item.slug === active
          return (
            <FacetBadge
              key={item.slug}
              kind={kind}
              slug={item.slug}
              name={item.requiresAge ? `${item.name} 18+` : item.name}
              href={hrefFor(selected ? null : item.slug)}
              current={selected}
            />
          )
        })}
      </div>
      {overflow || open ? (
        <button type="button" className="facet-more" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          {open ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </section>
  )
}

type FacetItem = { slug: string; name: string; requiresAge?: boolean }

function FacetChips({
  kind,
  items,
  hrefFor,
  open = false,
  lineRef,
}: {
  kind: 'niche' | 'network'
  items: FacetItem[]
  hrefFor: (slug: string) => string
  open?: boolean
  lineRef?: Ref<HTMLDivElement>
}) {
  return (
    <div ref={lineRef} className={open ? 'facet-line is-open' : 'facet-line'}>
      {items.map((item) => (
        <FacetBadge
          key={item.slug}
          kind={kind}
          slug={item.slug}
          name={item.requiresAge ? `${item.name} 18+` : item.name}
          href={hrefFor(item.slug)}
        />
      ))}
    </div>
  )
}

const MOBILE_PREVIEW = 4

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(max-width: 719px)')
    const apply = () => setNarrow(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])
  return narrow
}

export function HomeExplore({
  niches,
  networks,
}: {
  niches: FacetItem[]
  networks: FacetItem[]
}) {
  const narrow = useNarrow()
  const [open, setOpen] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const nicheLead = useRef<HTMLDivElement>(null)
  const nicheSecond = useRef<HTMLDivElement>(null)
  const networkLead = useRef<HTMLDivElement>(null)
  const networkSecond = useRef<HTMLDivElement>(null)
  const niche = exploreNiches(niches)
  const network = exploreNetworks(networks)
  const nicheCount = niche.lead.length + niche.mild.length
  const networkCount = network.lead.length + network.second.length
  const hasMore = nicheCount > MOBILE_PREVIEW || networkCount > MOBILE_PREVIEW
  const key = [niche.lead, niche.mild, network.lead, network.second].map((row) => row.map((item) => item.slug).join()).join('|')

  useEffect(() => {
    if (open) return
    const elements = [nicheLead, nicheSecond, networkLead, networkSecond]
      .map((ref) => ref.current)
      .filter((element): element is HTMLDivElement => element !== null)
    if (elements.length === 0) return
    const measure = () => setOverflow(elements.some((element) => element.scrollWidth > element.clientWidth + 1))
    measure()
    const observer = new ResizeObserver(measure)
    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [key, open])

  return (
    <>
      <div className={open ? 'home-explore-columns is-open' : 'home-explore-columns'}>
        <section>
          <h3>Nichos</h3>
          <ExploreLines
            kind="niche"
            base="/nicho"
            lead={niche.lead}
            second={niche.mild}
            open={open}
            leadRef={nicheLead}
            secondRef={nicheSecond}
          />
        </section>
        <section>
          <h3>Redes</h3>
          <ExploreLines
            kind="network"
            base="/rede"
            lead={network.lead}
            second={network.second}
            open={open}
            leadRef={networkLead}
            secondRef={networkSecond}
          />
        </section>
      </div>
      {(narrow ? hasMore || open : overflow || open) ? (
        <button type="button" className="facet-more" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          {open ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </>
  )
}

function ExploreLines({
  kind,
  base,
  lead,
  second,
  open,
  leadRef,
  secondRef,
}: {
  kind: 'niche' | 'network'
  base: string
  lead: FacetItem[]
  second: FacetItem[]
  open: boolean
  leadRef: Ref<HTMLDivElement>
  secondRef: Ref<HTMLDivElement>
}) {
  const hrefFor = (slug: string) => `${base}/${slug}`
  if (lead.length === 0 && second.length === 0) return null
  if (open) return <FacetChips kind={kind} items={[...lead, ...second]} hrefFor={hrefFor} open />
  return (
    <div className="facet-stack">
      <FacetChips kind={kind} items={lead} hrefFor={hrefFor} lineRef={leadRef} />
      {second.length > 0 ? <FacetChips kind={kind} items={second} hrefFor={hrefFor} lineRef={secondRef} /> : null}
    </div>
  )
}
