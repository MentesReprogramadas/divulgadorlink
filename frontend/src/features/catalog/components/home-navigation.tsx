'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ActionIcon } from '@/components/ui/action-icon'
import { FacetIcon, Glyph } from '@/components/ui/facet-badge'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { Select } from '@/components/ui/select'
import { exploreNiches } from '@/domain/facets'
import styles from './ondas-catalog.module.css'

export type HomeFacet = { slug: string; name: string; requiresAge?: boolean }
export type HomeNavigationProps = { niches?: HomeFacet[]; networks?: HomeFacet[]; discoveryQuery: string }

const HERO_NETWORKS = ['whatsapp', 'telegram', 'discord'] as const
const INITIAL_TOPICS = 7

export function HomeTopics({ niches = [], discoveryQuery }: HomeNavigationProps) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const { lead, mild } = exploreNiches(niches)
  const topics = [...lead, ...mild]
  const query = discoveryQuery ? `?${discoveryQuery}` : ''
  return <nav id={id} className={styles.topics} aria-label="Explorar por nicho">
    <Link href={'/' + query} className={styles.topicAll} aria-current="page"><LiquidLens radius={999} /><Glyph d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M11.5 4.5 9.2 9.2 4.5 11.5 6.8 6.8Z" size={16} />Para descobrir</Link>
    {(expanded ? topics : topics.slice(0, INITIAL_TOPICS)).map(topic => <Link key={topic.slug} href={`/nicho/${encodeURIComponent(topic.slug)}${query}`}><LiquidLens radius={999} /><FacetIcon kind="niche" slug={topic.slug} size={16} />{topic.name}{topic.requiresAge ? ' 18+' : ''}</Link>)}
    {topics.length > INITIAL_TOPICS ? <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(current => !current)}><LiquidLens radius={999} />{expanded ? 'Ver menos' : 'Ver mais'}</button> : null}
  </nav>
}

export function HomeNetworkLinks({ networks = [], discoveryQuery }: HomeNavigationProps) {
  const available = HERO_NETWORKS.flatMap(slug => networks.filter(network => network.slug === slug && !network.requiresAge))
  if (!available.length) return null
  const query = discoveryQuery ? `?${discoveryQuery}` : ''
  return <div className={styles.heroNetworks}><span>Explore no</span>{available.map(network => <Link key={network.slug} href={`/rede/${encodeURIComponent(network.slug)}${query}`}><LiquidLens radius={999} />{network.name}<ActionIcon name="next" width="13" height="13" /></Link>)}</div>
}

export function HomeNetworkSelect({ networks = [], discoveryQuery }: HomeNavigationProps) {
  const router = useRouter()
  const query = discoveryQuery ? `?${discoveryQuery}` : ''
  return <Select aria-label="Filtrar por rede" defaultValue="" className={styles.select} popupClassName={styles.selectPopup} onChange={event => router.push((event.target.value ? `/rede/${encodeURIComponent(event.target.value)}` : '/') + query)}><option value="">Todas as redes</option>{networks.map(network => <option key={network.slug} value={network.slug}>{network.name}{network.requiresAge ? ' 18+' : ''}</option>)}</Select>
}
