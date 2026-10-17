import { contrast, markFor, paint } from '@/domain/marks'
import { networkLogo } from '@/domain/network-logos'
import { nicheIcon } from '@/domain/niche-icons'

const PAPER = '#f3f6f4'

function iconColor(color: string): string {
  return contrast(color, PAPER) >= 3 ? color : paint(color).ink
}

export function Glyph({ d, color, size = 14 }: { d: string; color?: string; size?: number }) {
  return (
    <svg className="facet-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={color ? { color } : undefined}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function ContextIcon({ kind, slug, size }: { kind: 'niche' | 'network'; slug: string; size?: number }) {
  const logo = kind === 'network' ? networkLogo(slug) : nicheIcon(slug)
  if (logo) return <img className="facet-icon" src={logo} alt="" width={size ?? 18} height={size ?? 18} decoding="async" style={{ objectFit: 'contain' }} />
  const mark = markFor(kind, slug)
  return mark ? <Glyph d={mark.icon} size={size} color={kind === 'network' ? iconColor(mark.color) : undefined} /> : null
}

export function FacetBadge({
  kind,
  slug,
  name,
  href,
  current = false,
}: {
  kind: 'niche' | 'network'
  slug: string
  name: string
  href?: string
  current?: boolean
}) {
  const content = (
    <>
      <ContextIcon kind={kind} slug={slug} />
      <span>{name}</span>
    </>
  )
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
  return <ContextIcon kind={kind} slug={slug} size={28} />
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
