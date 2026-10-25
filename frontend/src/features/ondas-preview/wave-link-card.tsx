'use client'

import Link from 'next/link'
import { ActionIcon } from '@/components/ui/action-icon'
import { PreviewNetworkBadge, PreviewPhoto, PreviewViews } from '@/features/home-preview/glass-link-card'
import type { PreviewLink } from '@/features/home-preview/preview-data'
import { LiquidLens } from './liquid-lens'
import { WaveFacetIcon } from './wave-facet-icon'
import styles from '@/features/catalog/components/ondas-catalog.module.css'

export const waveHomeHref = '/dev/homes/ondas'
export function waveDetailHref(slug: string) { return `${waveHomeHref}/link/${slug}` }

export function WaveLinkCard({ link, saved, onFavorite, featured = false }: { link: PreviewLink; saved: boolean; onFavorite: () => void; featured?: boolean }) {
  const href = waveDetailHref(link.slug)
  return <article className={styles.card} data-featured={featured || undefined} data-link={link.slug}>
    <div className={styles.cardPhoto} data-card-photo><PreviewPhoto link={link} /></div>
    <div className={styles.cardCopy} data-card-content><LiquidLens radius={20} />
      <div className={styles.cardLabels}><div className={styles.photoLabels}>{link.sponsored ? <span className={styles.sponsored}><ActionIcon name="promotion" width="14" height="14" />Patrocinado</span> : null}<span className={styles.niche}><WaveFacetIcon value={link.niche} />{link.niche}</span></div></div>
      <div className={styles.cardMeta}><PreviewNetworkBadge link={link} /><span><WaveFacetIcon value={link.category} />{link.category}</span></div><h3 title={link.title}>{link.title}</h3><p>{link.description}</p><div className={styles.cardFoot}><PreviewViews value={link.views} /><span>Conhecer<ActionIcon name="next" width="18" height="18" /></span></div></div>
    <Link className={styles.cardHitArea} href={href} aria-label={`Ver detalhes de ${link.title}`} />
    <button type="button" className={styles.favorite} aria-label={`${saved ? 'Remover' : 'Salvar'} ${link.title} ${saved ? 'dos' : 'nos'} favoritos`} aria-pressed={saved} onClick={onFavorite}><LiquidLens radius={999} /><ActionIcon name="star" fill={saved ? 'currentColor' : 'none'} /></button>
  </article>
}
