import {CatalogCardSkeleton} from '@/features/catalog/components/catalog-skeleton'
import {Skeleton,SkeletonRegion} from '@/components/feedback/skeleton'
import styles from '@/features/favorites/components/favorites.module.css'
import {LiquidLens} from '@/components/ui/liquid-lens'
export default function Loading(){return <main className={'container '+styles.publicPage}><SkeletonRegion label="Carregando coleção"><div className={styles.page}><header className={styles.collection}><LiquidLens radius={16}/><Skeleton height={38} width="60%"/><Skeleton height={24} width="80%"/><Skeleton height={24} width="40%"/></header><ul className={styles.list}>{[0,1,2].map(index=><li key={index} className={styles.item}><CatalogCardSkeleton withFavorite={false} withImpressions={false}/><Skeleton height={17} width="65%"/></li>)}</ul></div></SkeletonRegion></main>}
