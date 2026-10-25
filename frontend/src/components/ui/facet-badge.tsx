import styles from './facet-badge.module.css'
import { markFor } from '@/domain/marks'
import { networkLogo } from '@/domain/network-logos'

export function Glyph({ d, color, size = 14 }: { d: string; color?: string; size?: number }) {
  return (
    <svg className="facet-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={color ? { color } : undefined}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function FacetIcon({ kind, slug, size }: { kind: 'niche' | 'network'; slug: string; size?: number }) {
  const logo = kind === 'network' ? networkLogo(slug) : null
  if (logo) return <span className={`facet-icon ${styles.logo}`} aria-hidden="true" style={{ width: size ?? 18, height: size ?? 18, maskImage: `url("${logo}")`, WebkitMaskImage: `url("${logo}")` }} />
  const mark = markFor(kind, slug)
  return mark ? <Glyph d={mark.icon} size={size} /> : null
}

export function FacetBadge({
  kind,
  slug,
  name,
  href,
  current = false,
  onSelect,
}: {
  kind: 'niche' | 'network'
  slug: string
  name: string
  href?: string
  current?: boolean
  onSelect?: () => void
}) {
  const content = (
    <>
      <FacetIcon kind={kind} slug={slug} />
      <span>{name}</span>
    </>
  )
  if (onSelect) return <button type="button" className={`facet ${styles.choice}`} aria-pressed={current} onClick={onSelect}>{content}</button>
  if (href) {
    return (
      <a className="facet" href={href} aria-current={current ? 'true' : undefined}>
        {content}
      </a>
    )
  }
  return <span className="facet">{content}</span>
}

export function TitleMark({ kind, slug }: { kind: 'niche' | 'network'; slug: string }) {
  return <FacetIcon kind={kind} slug={slug} size={28} />
}

export function AdMark({ icon = 'diamond' }: { icon?: 'dot' | 'diamond' }) {
  return (
    <span className="ad-mark">
      {icon === 'diamond' ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m2 6 3-4h6l3 4-6 8-6-8Zm0 0h12M5 2l3 12 3-12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <circle cx="4" cy="4" r="2" fill="currentColor" />
        </svg>
      )}
      Patrocinado
    </span>
  )
}
