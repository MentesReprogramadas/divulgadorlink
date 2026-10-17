'use client'
import { CatalogCardSkeleton } from '@/features/catalog/components/catalog-skeleton'
import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'
import { Tabs } from '@/components/ui/tabs'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { Field, Input } from '@/components/ui/input'
import styles from './favorites.module.css'

export function FavoriteCardsSkeleton() {
  return <SkeletonRegion><ul className={styles.list}>{[0, 1, 2].map(i => <li key={i} className={styles.item}><CatalogCardSkeleton withFavorite={false} actions={<div className={styles.actions}><SkeletonButton /></div>} /></li>)}</ul></SkeletonRegion>
}
export function CollectionCardsSkeleton() {
  return <SkeletonRegion><ul className={styles.collectionGrid}>{[0, 1, 2].map(index => <li key={index}><div className={styles.collectionCard}><Skeleton width={56} height={56} /><Skeleton width="70%" height={26} /><Skeleton width={120} height={20} /></div></li>)}</ul></SkeletonRegion>
}
export function FavoritesPageSkeleton() {
  return <SkeletonRegion><Tabs label="Favoritos e coleções" value="favorites" onChange={() => {}} actions={<WorkspaceActions><SkeletonButton /></WorkspaceActions>} items={[{ id: 'favorites', label: 'Favoritos', icon: 'star', content: <><WorkspaceFilters label="Filtrar favoritos"><Field label="Buscar favoritos"><Input disabled /></Field></WorkspaceFilters><FavoriteCardsSkeleton /></> }, { id: 'collections', label: 'Coleções', icon: 'folder', content: null }]} /></SkeletonRegion>
}
