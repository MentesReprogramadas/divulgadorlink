import { ActionIcon } from '@/components/ui/action-icon'
import { EmptyState } from '@/components/feedback/empty-state'
import type { Collection } from '../favorites-contract'
import styles from './favorites.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

type CollectionGridProps = {
  collections: Collection[]
  pending: boolean
  onOpen: (collection: Collection) => void
}

export function CollectionGrid({ collections, pending, onOpen }: CollectionGridProps) {
  if (!collections.length) return <EmptyState>Você ainda não tem coleções. Crie uma para organizar seus favoritos.</EmptyState>
  return <section aria-label="Suas coleções"><ul className={styles.collectionGrid}>
    {collections.map(collection => <li key={collection.id}><button type="button" className={styles.collectionCard} disabled={pending} data-collection-id={collection.id} onClick={() => onOpen(collection)}>
      <span className={styles.collectionFolder}><ActionIcon name="folder" width={36} height={36} /></span>
      <strong>{collection.name}</strong>
      <span className={styles.openCollection}>Abrir coleção <ActionIcon name="next" /></span>
    <LiquidLens radius={16} /></button></li>)}
  </ul></section>
}
