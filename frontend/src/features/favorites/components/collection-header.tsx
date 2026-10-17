import { ActionIcon } from '@/components/ui/action-icon'
import { Button } from '@/components/ui/button'
import type { Ref } from 'react'
import styles from './favorites.module.css'

type CollectionHeaderProps = {
  name: string
  pending: boolean
  canEdit: boolean
  headingRef: Ref<HTMLHeadingElement>
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

export function CollectionHeader({ name, pending, canEdit, headingRef, onBack, onEdit, onDelete }: CollectionHeaderProps) {
  return <header className={styles.collectionHeader}>
    <div className={styles.collectionHeading}><Button variant="secondary" disabled={pending} onClick={onBack}><ActionIcon name="back" />Voltar</Button><h2 ref={headingRef} tabIndex={-1}>{name}</h2></div>
    <div className={styles.collectionHeaderActions} role="group" aria-label="Ações da coleção"><Button variant="secondary" disabled={pending || !canEdit} onClick={onEdit}><ActionIcon name="edit" />Editar</Button><Button variant="danger" disabled={pending || !canEdit} onClick={onDelete}><ActionIcon name="trash" />Excluir</Button></div>
  </header>
}
