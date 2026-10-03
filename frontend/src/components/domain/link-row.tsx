import { LinkMeta, type LinkContext } from './link-meta'
import { AdMark } from '@/components/ui/facet-badge'

export type CatalogRow = {
  id: string
  name: string
  description: string
  href: string
  placement: 'sponsored' | 'organic'
  impressions?: number
} & LinkContext

export function ImpressionMark({ value }: { value: number }) {
  const amount = Number.isFinite(value) ? value : 0
  const shown = amount.toLocaleString('pt-BR')
  const label = amount === 1 ? '1 impressão' : `${shown} impressões`
  return (
    <span className="impression-mark" aria-label={label}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M1.4 8S3.8 3.6 8 3.6 14.6 8 14.6 8 12.2 12.4 8 12.4 1.4 8 1.4 8zM8 10.1a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}

export function SponsoredKicker({ impressions, show }: { impressions: number; show: boolean }) {
  return (
    <div className="sponsored-kicker">
      <AdMark />
      {show ? <ImpressionMark value={impressions} /> : null}
    </div>
  )
}

export function LinkRow({
  id,
  name,
  description,
  href,
  placement,
  niche,
  network,
  impressions = 0,
  showImpressions = true,
}: CatalogRow & { showImpressions?: boolean }) {
  const show = showImpressions !== false
  return (
    <article className="link-row lift" data-placement={placement} data-link-id={id}>
      {placement === 'sponsored' ? <SponsoredKicker impressions={impressions} show={show} /> : null}
      <a className="link-name" href={href}>{name}</a>
      {description ? <p className="link-row-description">{description}</p> : null}
      <LinkMeta niche={niche} network={network} />
      {placement === 'organic' && show ? <ImpressionMark value={impressions} /> : null}
    </article>
  )
}
