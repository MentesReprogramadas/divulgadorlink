import { ActionIcon } from '@/components/ui/action-icon'
import { EmptyState } from '@/components/feedback/empty-state'
import { AdminLinksSkeleton } from './admin-links-skeleton'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LinkPromotionEditor } from './link-promotion-editor'
import styles from './admin-links-board.module.css'

export const LINK_STATUSES = [
  { value: 'PUBLISHED', label: 'Publicado', filter: 'Publicados', hint: 'Disponível no catálogo.', tone: 'published' },
  { value: 'PENDING_MODERATION', label: 'Aguardando revisão', filter: 'Aguardando revisão', hint: 'Envio na fila de moderação.', tone: 'pending' },
  { value: 'PRE_REJECTED', label: 'Pré-rejeitado', filter: 'Pré-rejeitados', hint: 'Aguardando ajustes ou contestação de quem enviou.', tone: 'rejected' },
  { value: 'DRAFT', label: 'Rascunho', filter: 'Rascunhos', hint: 'O envio ainda não foi concluído.', tone: 'draft' },
  { value: 'UNAVAILABLE', label: 'Fora do ar', filter: 'Fora do ar', hint: 'Retirado do catálogo. Este link não pode ser republicado.', tone: 'unavailable' },
] as const
export type AdminLinkStatus = (typeof LINK_STATUSES)[number]['value']
export type AdminLinkRow = { id: string; name: string; status: AdminLinkStatus; url: string; ownerName: string; ownerEmail: string }
export type AdminLinkFilter = AdminLinkStatus | 'ALL'
type AdminLinksBoardProps = {
  links: AdminLinkRow[]
  onWithdraw: (link: AdminLinkRow) => void
  loading: boolean
}

export function AdminLinksBoard({ links, onWithdraw, loading }: AdminLinksBoardProps) {
  return (
    <section className={styles.board} aria-label="Links">
      {loading && !links.length ? <AdminLinksSkeleton /> : null}
      <div className={styles.grid} aria-busy={loading}>
        {links.map(row => {
          const status = LINK_STATUSES.find(item => item.value === row.status)!
          const canWithdraw = row.status === 'PUBLISHED' || row.status === 'PENDING_MODERATION' || row.status === 'PRE_REJECTED'
          return (
            <article key={row.id} className={`${styles.card} ${styles[status.tone]}`} aria-labelledby={`admin-link-${row.id}`}>
              <span className={styles.badge} aria-label={`Status: ${status.label}`}><span aria-hidden="true" />{status.label}</span>
              <h3 id={`admin-link-${row.id}`}>{row.name || 'Link sem nome'}</h3>
              <p className={styles.destination}><a href={row.url} target="_blank" rel="noreferrer">{row.url}</a></p>
              <p className={styles.owner}>{row.ownerName || 'Sem dono'}{row.ownerEmail ? ` · ${row.ownerEmail}` : ''}</p>
              <p className={styles.hint}>{status.hint}</p>
              <div className={styles.actions}>
                {row.status === 'PUBLISHED' ? <><Link className="button button-secondary" href={`/link/${row.id}`}>Ver no catálogo</Link><LinkPromotionEditor linkId={row.id} linkName={row.name} /></> : null}
                {row.status === 'PENDING_MODERATION' ? <Link className="button button-secondary" href={`/admin/moderacao?link=${encodeURIComponent(row.id)}`}>Revisar envio</Link> : null}
                {canWithdraw ? <Button type="button" variant="danger" disabled={loading} onClick={() => onWithdraw(row)}><ActionIcon name="trash" />{row.status === 'PUBLISHED' ? 'Tirar do ar' : 'Retirar envio'}</Button> : null}
              </div>
            </article>
          )
        })}
        {!loading && links.length === 0 ? <EmptyState /> : null}
      </div>
    </section>
  )
}
