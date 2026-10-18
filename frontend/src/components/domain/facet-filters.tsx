'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { FacetBadge } from '@/components/ui/facet-badge'
import { exploreNetworks, exploreNiches, leadFirst, NETWORK_LEAD, NICHE_LEAD } from '@/domain/facets'
import styles from './home-explore.module.css'

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

const HOME_PREVIEW = 6

export function HomeExplore({
  niches,
  networks,
  discoveryQuery = '',
}: {
  niches: FacetItem[]
  networks: FacetItem[]
  discoveryQuery?: string
}) {
  const [open, setOpen] = useState(false)
  const groupId = useId()
  const niche = exploreNiches(niches)
  const network = exploreNetworks(networks)
  const groups = [
    { kind: 'niche' as const, name: 'Nichos', base: '/nicho', items: [...niche.lead, ...niche.mild] },
    { kind: 'network' as const, name: 'Redes', base: '/rede', items: [...network.lead, ...network.second] },
  ]
  const hasMore = groups.some((group) => group.items.length > HOME_PREVIEW)

  return (
    <>
      <div className={open ? 'home-explore-columns is-open' : 'home-explore-columns'}>
        {groups.map((group) => (
          <section key={group.kind} aria-labelledby={`${groupId}-${group.kind}-title`}>
            <h3 id={`${groupId}-${group.kind}-title`}>{group.name}</h3>
            <div id={`${groupId}-${group.kind}`} className={styles.grid}>
              {(open ? group.items : group.items.slice(0, HOME_PREVIEW)).map((item) => (
                <FacetBadge
                  key={item.slug}
                  kind={group.kind}
                  slug={item.slug}
                  name={item.requiresAge ? `${item.name} 18+` : item.name}
                  href={`${group.base}/${encodeURIComponent(item.slug)}${discoveryQuery ? `?${discoveryQuery}` : ''}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {hasMore ? (
        <button type="button" className="facet-more" aria-expanded={open} aria-controls={groups.map((group) => `${groupId}-${group.kind}`).join(' ')} onClick={() => setOpen((current) => !current)}>
          {open ? 'Ver menos' : 'Ver mais'}
        </button>
      ) : null}
    </>
  )
}
