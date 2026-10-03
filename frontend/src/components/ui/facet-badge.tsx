import { contrast, markFor, paint } from '@/domain/marks'

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
  const mark = markFor(kind, slug)
  const content = (
    <>
      {mark ? <Glyph d={mark.icon} color={kind === 'network' ? iconColor(mark.color) : undefined} /> : null}
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
  const mark = markFor(kind, slug)
  if (!mark) return null
  return <Glyph d={mark.icon} size={28} color={kind === 'network' ? iconColor(mark.color) : undefined} />
}

export function AdMark() {
  return (
    <span className="ad-mark">
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <circle cx="4" cy="4" r="2" fill="currentColor" />
      </svg>
      Patrocinado
    </span>
  )
}
