import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import type { Collection, CollectionPage, SavedFavorite } from '../favorites-contract'
import styles from './favorites.module.css'

type CollectionPickerProps = {
  item: SavedFavorite
  collections: CollectionPage
  pending: boolean
  error: string
  onChoose: (collection: Collection) => void
  onCreate: () => void
  onMore: () => void
}

export function CollectionPicker({ item, collections, pending, error, onChoose, onCreate, onMore }: CollectionPickerProps) {
  return <div className={styles.picker}>
    <p>Escolha onde salvar <strong>{item.available ? item.name : 'este link indisponível'}</strong>.</p>
    {error ? <p role="alert">{error}</p> : null}
    {collections.items.length ? <ul className={styles.collectionChoices}>{collections.items.map(collection => {
      const included = item.collectionIds?.includes(collection.id)
      return <li key={collection.id}><Button variant="secondary" disabled={pending || included} onClick={() => onChoose(collection)}>
        <ActionIcon name={included ? 'check' : 'folder'} /><span>{collection.name}</span>{included ? <small>Já está nesta coleção</small> : null}
      </Button></li>
    })}</ul> : <p className={styles.note}>Você ainda não tem coleções. Crie a primeira para organizar seus favoritos.</p>}
    {collections.nextCursor ? <Button variant="secondary" disabled={pending} onClick={onMore}><ActionIcon name="loadMore" />Mais coleções</Button> : null}
    <Button variant="secondary" disabled={pending} onClick={onCreate}><ActionIcon name="plus" />Criar coleção</Button>
  </div>
}
