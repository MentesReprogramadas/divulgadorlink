import type { ReactNode } from 'react'
import { LinkMeta, type LinkContext } from './link-meta'
import { AdMark } from '@/components/ui/facet-badge'
import { CardDescription } from './card-description'
import { CardTitle } from './card-title'
import styles from './link-row.module.css'

export type CatalogRow = {
  actions?: ReactNode
  cornerAction?: ReactNode
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
    <span className="impression-mark" role="img" aria-label={label}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M1.4 8S3.8 3.6 8 3.6 14.6 8 14.6 8 12.2 12.4 8 12.4 1.4 8 1.4 8zM8 10.1a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}

export function SponsoredKicker({ icon }: { icon?: 'dot' | 'diamond' }) {
  return (
    <div className="sponsored-kicker">
      <AdMark icon={icon} />
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
  actions,
  cornerAction,
}: CatalogRow & { showImpressions?: boolean }) {
  const show = showImpressions !== false
  return (
    <article className={`link-row ${styles.card}`} data-placement={placement} data-link-id={id}>
      {cornerAction ? <div className={styles.cornerAction}>{cornerAction}</div> : null}
      {placement === 'sponsored' ? <SponsoredKicker icon="diamond" /> : null}
      <a className={`link-name ${styles.name} ${cornerAction ? styles.withCorner : ''}`} href={href}><CardTitle text={name} /></a>
      <CardDescription text={description} className={`link-row-description ${styles.description}`} />
      <LinkMeta niche={niche} network={network} />
      {actions ? <div className={styles.cardActions}>{actions}</div> : null}
      <div className={styles.footer}>
        {show ? <ImpressionMark value={impressions} /> : null}
        <span className={styles.action} aria-hidden="true">
          Ver link
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
      </div>
    </article>
  )
}
