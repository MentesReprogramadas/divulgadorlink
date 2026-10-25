'use client'
import Link from 'next/link'
import { useRef, useState, type PointerEvent, type CSSProperties } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { networkLogo } from '@/domain/network-logos'
import { networkLabels, type PreviewLink } from './preview-data'
import styles from './glass-link-card.module.css'

export function PreviewPhoto({ link, priority = false, className }: { link: PreviewLink; priority?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? <div className={[styles.photoFallback, className].filter(Boolean).join(' ')} role="img" aria-label={`Imagem indisponível para ${link.title}`}><ActionIcon name="image" width="40" height="40" /><span>{link.niche}</span></div> : <img src={`/dev/home-preview/photo/${link.photo}`} ref={image => { if (image?.currentSrc && image.complete && !image.naturalWidth) setFailed(true) }} className={className} alt={link.imageAlt} width="1400" height="930" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailed(true)} />
}

export function PreviewNetworkBadge({ link }: { link: PreviewLink }) {
  const logo = networkLogo(link.network)
  return <span className={styles.network}>{logo ? <img src={logo} width="17" height="17" alt="" /> : null}{networkLabels[link.network]}</span>
}
export function PreviewViews({ value }: { value: number }) {
  return <span className={styles.views} role="img" aria-label={`${value.toLocaleString('pt-BR')} visualizações ilustrativas`} title="Número fictício desta demonstração"><ActionIcon name="eye" width="16" height="16" /><span aria-hidden="true">{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}</span></span>
}

export type GlassLinkCardProps = { link: PreviewLink; saved: boolean; onFavorite: () => void; featured?: boolean; priority?: boolean }
export function GlassLinkCard({ link, saved, onFavorite, featured = false, priority = false }: GlassLinkCardProps) {
  const ref = useRef<HTMLElement>(null)
  function reset() { const el = ref.current; el?.style.removeProperty('--card-x'); el?.style.removeProperty('--card-y'); el?.style.removeProperty('--light-x'); el?.style.removeProperty('--light-y') }
  function move(event: PointerEvent<HTMLElement>) {
    const element = ref.current
    if (!element || event.pointerType === 'touch' || element.closest('[data-motion="paused"]') || window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)').matches) return
    const rect = element.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height
    element.style.setProperty('--card-x', `${(x - .5) * (featured ? 3 : 1.5)}deg`); element.style.setProperty('--card-y', `${(y - .5) * -2}deg`)
    element.style.setProperty('--light-x', `${x * 100}%`); element.style.setProperty('--light-y', `${y * 100}%`)
  }
  return <article ref={ref} className={styles.card} data-featured={featured || undefined} data-sponsored={link.sponsored || undefined} style={{ '--card-accent': link.accent } as CSSProperties} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
    <div className={styles.rim} aria-hidden="true" /><div className={styles.lens} aria-hidden="true" />
    <div className={styles.photo}><Link href={`/dev/home-preview/link/${link.slug}`} tabIndex={-1}><PreviewPhoto link={link} priority={priority} /></Link><span className={styles.niche}>{link.niche}</span><button type="button" className={styles.favorite} aria-pressed={saved} aria-label={`${saved ? 'Remover' : 'Salvar'} ${link.title} ${saved ? 'dos' : 'nos'} favoritos`} onClick={onFavorite}><ActionIcon name="star" fill={saved ? 'currentColor' : 'none'} /></button>{link.sponsored ? <span className={styles.sponsored}><ActionIcon name="promotion" width="13" height="13" />Patrocinado</span> : null}</div>
    <div className={styles.content}><div className={styles.meta}><PreviewNetworkBadge link={link} /><span className={styles.category}>{link.category}</span></div><h3><Link href={`/dev/home-preview/link/${link.slug}`} title={link.title}>{link.title}</Link></h3><p className={styles.description}>{link.description}</p><div className={styles.bottom}><PreviewViews value={link.views} /><span className={styles.language}>PT-BR · Online</span><Link className={styles.open} href={`/dev/home-preview/link/${link.slug}`} aria-label={`Ver detalhes de ${link.title}`}><ActionIcon name="next" width="18" height="18" /></Link></div></div>
  </article>
}
