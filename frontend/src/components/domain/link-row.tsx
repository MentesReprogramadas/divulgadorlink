import type { ReactNode } from 'react'
import { LinkMeta, type LinkContext } from './link-meta'
import { AdMark } from '@/components/ui/facet-badge'
import { CatalogImage } from './catalog-image'
import { LiquidLens } from '@/components/ui/liquid-lens'
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
  iconUrl?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
} & LinkContext

export type LinkRowProps = Omit<CatalogRow, 'href'> & { showImpressions?: boolean } & (
  | { preview: true; href?: never }
  | { preview?: false; href: string }
)

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
  discovery,
  impressions = 0,
  showImpressions = true,
  actions,
  cornerAction,
  iconUrl,
  imageUrl,
  imageAlt,
  preview = false,
}: LinkRowProps) {
  const show = showImpressions !== false
  return (
    <article className={`link-row ${styles.card}`} data-preview={preview || undefined} data-placement={placement} data-featured={placement === 'sponsored' || undefined} data-link-id={id}>
      <CatalogImage src={imageUrl} alt={imageAlt} className={styles.image} sizes="(max-width: 600px) calc(100vw - 36px), (max-width: 850px) calc((100vw - 64px) / 2), (max-width: 1100px) calc((100vw - 104px) / 3), (max-width: 1352px) calc((100vw - 118px) / 3), 412px" />
      <div className={styles.body} data-card-content>
        <LiquidLens radius={20} />
        <div className={styles.labels}>
          {placement === 'sponsored' ? <SponsoredKicker icon="diamond" /> : null}
          <LinkMeta niche={niche} />
        </div>
        <div className={styles.metadata}><LinkMeta network={network} discovery={discovery} /></div>
        <h3 className={styles.heading}><span className={`link-name ${styles.name}`}><CatalogImage src={iconUrl} className={styles.icon} kind="icon" sizes="32px" /><span className={styles.title} title={name}>{name}</span></span></h3>
        <p className={`link-row-description ${styles.description}`}>{description}</p>
        <div className={styles.footer}>
          {show ? <ImpressionMark value={impressions} /> : null}
          <span className={styles.action} aria-hidden="true">
            Conhecer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
      {!preview ? <a className={styles.hitArea} href={href}><span className={styles.srOnly}>{name}</span></a> : null}
      {cornerAction ? <div className={styles.cornerAction}>{cornerAction}</div> : null}
      {actions ? <div className={styles.cardActions}>{actions}</div> : null}
    </article>
  )
}
