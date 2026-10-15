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
  counts: Record<AdminLinkStatus, number>
  filter: AdminLinkFilter
  onFilterChange: (filter: AdminLinkFilter) => void
  onWithdraw: (link: AdminLinkRow) => void
  loading: boolean
  query: string
}

export function AdminLinksBoard({ links, counts, filter, onFilterChange, onWithdraw, loading, query }: AdminLinksBoardProps) {
  const total = LINK_STATUSES.reduce((sum, status) => sum + counts[status.value], 0)
  const matching = filter === 'ALL' ? total : counts[filter]
  return (
    <section className={styles.board} aria-label="Links">
      <div className={styles.heading}><h2>Links</h2><p>{query ? `Resultados para “${query}”` : 'Acompanhe a publicação e gerencie cada link.'}</p></div>
      <div className={styles.filters} role="group" aria-label="Filtrar links por status">
        <button type="button" aria-pressed={filter === 'ALL'} onClick={() => onFilterChange('ALL')}>Todos <span>{total.toLocaleString('pt-BR')}</span></button>
        {LINK_STATUSES.map(status => <button type="button" key={status.value} aria-pressed={filter === status.value} onClick={() => onFilterChange(status.value)}>{status.filter} <span>{counts[status.value].toLocaleString('pt-BR')}</span></button>)}
      </div>
      <p className={styles.result} role="status">{loading ? 'Carregando links…' : `Mostrando ${links.length.toLocaleString('pt-BR')} de ${matching.toLocaleString('pt-BR')} links${filter === 'ALL' ? '' : ` · ${LINK_STATUSES.find(status => status.value === filter)?.filter}`}.`}{!loading && matching > links.length ? ' Refine a busca para encontrar os demais.' : ''}</p>
      <div className={styles.grid} aria-busy={loading}>
        {loading ? null : links.map(row => {
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
                {canWithdraw ? <Button type="button" variant="danger" onClick={() => onWithdraw(row)}>{row.status === 'PUBLISHED' ? 'Tirar do ar' : 'Retirar envio'}</Button> : null}
              </div>
            </article>
          )
        })}
        {!loading && links.length === 0 ? <p className={styles.empty}>Nenhum link encontrado neste status{query ? ' para esta busca' : ''}.</p> : null}
      </div>
    </section>
  )
}
