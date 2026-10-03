import type { ReactNode } from 'react'

type Tone = 'neutral' | 'ok' | 'wait' | 'warn' | 'muted'
type Kind = 'niche' | 'network' | 'status' | 'sponsored'

function Mark({ kind, tone }: { kind?: Kind; tone: Tone }) {
  const path = kind === 'niche'
    ? 'M4 3.5h6.2L14 7.3v7.2H4zM8.2 6.2h.1'
    : kind === 'network'
      ? 'M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8-1a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6.6 6.4l2.2 2.4M11.4 6.2 9.6 8.4'
      : kind === 'sponsored'
        ? 'M8 2.2 9.4 6H13.4L10.2 8.2 11.4 12 8 9.8 4.6 12 5.8 8.2 2.6 6H6.6z'
        : tone === 'ok'
          ? 'M3.2 8.2 6.4 11.4 12.8 4.6'
          : tone === 'warn'
            ? 'M8 3.2 13.2 13H2.8zM8 6.4v3.2M8 11.4h.1'
            : 'M8 4.2v4.2M8 11.2h.1'
  return (
    <svg className="badge-mark" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  kind,
  href,
}: {
  children: ReactNode
  tone?: Tone
  kind?: Kind
  href?: string
}) {
  const className = ['badge', kind ? `badge-${kind}` : '', tone !== 'neutral' ? `badge-${tone}` : ''].filter(Boolean).join(' ')
  const content = (
    <>
      {kind || tone !== 'neutral' ? <Mark kind={kind} tone={tone} /> : null}
      <span>{children}</span>
    </>
  )
  if (href) return <a className={className} href={href}>{content}</a>
  return <span className={className}>{content}</span>
}
