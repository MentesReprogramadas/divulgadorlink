import { ActionIcon } from '@/components/ui/action-icon'
import { EmptyState } from '@/components/feedback/empty-state'
import type { Collection } from '../favorites-contract'
import styles from './favorites.module.css'

type CollectionGridProps = {
  collections: Collection[]
  pending: boolean
  onOpen: (collection: Collection) => void
}

export function CollectionGrid({ collections, pending, onOpen }: CollectionGridProps) {
  if (!collections.length) return <EmptyState>Você ainda não tem coleções. Crie uma para organizar seus favoritos.</EmptyState>
  return <section aria-label="Suas coleções"><ul className={styles.collectionGrid}>
    {collections.map(collection => <li key={collection.id}><button type="button" className={styles.collectionCard} disabled={pending} aria-label={collection.name} data-collection-id={collection.id} onClick={() => onOpen(collection)}>
      <span className={styles.collectionFolder}><ActionIcon name="folder" width={36} height={36} /></span>
      <strong>{collection.name}</strong>
      <span className={styles.openCollection} aria-hidden="true">Abrir coleção <ActionIcon name="next" /></span>
    </button></li>)}
  </ul></section>
}
