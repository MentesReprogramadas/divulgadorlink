import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/feedback/empty-state'
import { revisionStatus, type RedirectSummary } from '../redirect-contract'
import styles from './redirects.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function RedirectGrid({ items, pending, onOpen }: { items: RedirectSummary[]; pending: boolean; onOpen: (id: string) => void }) {
  if (!items.length) return <EmptyState>Crie seu primeiro link permanente para compartilhar um endereço fixo.</EmptyState>
  return <section aria-label="Seus endereços"><ul className={styles.grid}>
    {items.map(item => {
      const state = item.disabled ? 'Desativado' : item.latest?.review?.status === 'PENDING' ? 'Em revisão humana' : item.latest?.review?.status === 'REJECTED' ? 'Recusado' : item.activeRevisionId ? 'Publicado' : item.latest ? revisionStatus[item.latest.status] : 'Sem destino'
      return <li key={item.id}><button type="button" className={styles.card} data-redirect-id={item.id} disabled={pending} onClick={() => onOpen(item.id)}>
        <span className={styles.cardTop}><span className={styles.inviteIcon}><ActionIcon name="permanentLink" width={32} height={32} /></span><Badge tone={item.disabled ? 'muted' : item.latest?.review?.status === 'PENDING' ? 'wait' : item.latest?.review?.status === 'REJECTED' ? 'warn' : item.activeRevisionId ? 'ok' : 'wait'}>{state}</Badge></span>
        <strong>{item.latest?.label ?? 'Link permanente sem histórico'}</strong>
        <span className={styles.openCard} aria-hidden="true">Abrir link permanente <ActionIcon name="next" /></span>
      <LiquidLens radius={16} /></button></li>
    })}
  </ul></section>
}
