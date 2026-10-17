'use client'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import type { ProfileContent } from '../profile-contract'
import { useProfileSort } from './use-profile-sort'
import styles from './profile-groups.module.css'

type ProfileLinkListProps = {
  items: ProfileContent['items']; primaryId: string | null
  onReorder: (source: string, target: string) => void
  onEdit: (id: string) => void; onRemove: (id: string) => void; onTransfer: (id: string) => void
  canTransfer: boolean
}
export function ProfileLinkList({ items, primaryId, onReorder, onEdit, onRemove, onTransfer, canTransfer }: ProfileLinkListProps) {
  const sort = useProfileSort(items.map(item => item.id), onReorder), hintId = useId()
  return <><p id={hintId} className={styles.srOnly}>Arraste pela alça para ordenar. No teclado, use as setas na alça ou os botões em Mover e remover.</p><ul className={styles.links} ref={sort.root}>
    {items.map((item, index) => <li key={item.id} data-profile-link data-sort-id={item.id} data-over={sort.over === item.id || undefined} data-dragging={sort.dragging === item.id || undefined} className={styles.link}>
      <div className={styles.linkHeading}><button type="button" className={styles.handle} aria-label={'Arrastar link ' + item.label} aria-describedby={hintId} {...sort.handle(item.id)}><ActionIcon name="grip" /></button><div className={styles.linkTitle}><strong>{item.label}</strong><p>{item.destination}</p><div className={styles.labels}>{primaryId === item.id ? <Badge>Botão principal</Badge> : null}{!item.visible ? <Badge tone="muted">Oculto</Badge> : null}</div></div></div>
      <div className={`${styles.actions} ${styles.linkActions}`}><Button type="button" variant="secondary" onClick={() => onEdit(item.id)}><ActionIcon name="edit" />Editar link</Button><details className={styles.order}><summary>Mover e remover</summary><div><Button type="button" variant="secondary" disabled={index === 0} onClick={() => onReorder(item.id, items[index - 1].id)}><ActionIcon name="moveUp" />Subir link</Button><Button type="button" variant="secondary" disabled={index === items.length - 1} onClick={() => onReorder(item.id, items[index + 1].id)}><ActionIcon name="moveDown" />Descer link</Button>{canTransfer ? <Button type="button" variant="secondary" onClick={() => onTransfer(item.id)}>Mover para outro grupo</Button> : null}<Button type="button" variant="danger" onClick={() => onRemove(item.id)}><ActionIcon name="trash" />Remover link</Button></div></details></div>
    </li>)}
  </ul></>
}
