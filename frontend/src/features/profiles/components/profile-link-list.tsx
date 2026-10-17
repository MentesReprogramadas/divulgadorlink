'use client'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import type { ProfileContent } from '../profile-contract'
import { useProfileSort } from './use-profile-sort'
import styles from './profile-groups.module.css'
import { useProfileChanges } from './profile-changes'

type ProfileLinkListProps = {
  content: ProfileContent; items: ProfileContent['items']; primaryId: string | null
  onReorder: (source: string, target: string) => void
  onEdit: (id: string) => void; onRemove: (id: string) => void
}
export function ProfileLinkList({ content, items, primaryId, onReorder, onEdit, onRemove }: ProfileLinkListProps) {
  const changes = useProfileChanges()
  const sort = useProfileSort(items.map(item => item.id), onReorder), hintId = useId()
  return <><p id={hintId} className={styles.srOnly}>Arraste pela alça para ordenar. No teclado, use as setas na alça.</p><ul className={styles.links} ref={sort.root}>
    {items.map(item => <li key={item.id} data-profile-link data-unpublished={changes.item(item.id, content) || undefined} data-sort-id={item.id} data-over={sort.over === item.id || undefined} data-dragging={sort.dragging === item.id || undefined} className={styles.link}>
      <div className={styles.linkHeading}><div className={styles.labels}>{primaryId === item.id ? <Badge>Botão principal</Badge> : null}{!item.visible ? <Badge tone="muted">Oculto</Badge> : null}</div><button type="button" className={styles.handle} aria-label={'Arrastar link ' + item.label} aria-describedby={hintId} {...sort.handle(item.id)}><ActionIcon name="grip" /></button></div>
      <div className={styles.linkTitle}><strong>{item.label}</strong><p>{item.destination}</p></div>
      <div className={`${styles.actions} ${styles.linkActions}`}><Button type="button" variant="secondary" aria-label="Editar link" onClick={() => onEdit(item.id)}><ActionIcon name="edit" />Editar</Button><Button type="button" variant="danger" aria-label="Remover link" onClick={() => onRemove(item.id)}><ActionIcon name="trash" />Remover</Button></div>
    </li>)}
  </ul></>
}
