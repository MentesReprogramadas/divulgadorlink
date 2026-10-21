import { Skeleton, SkeletonRegion, SkeletonField, SkeletonButton } from '@/components/feedback/skeleton'
import styles from './discovery.module.css'
export function DiscoverySkeleton({resultsOnly=false}:{resultsOnly?:boolean}) {
  return <SkeletonRegion label="Carregando páginas"><div className={styles.page}>{!resultsOnly?<div className={styles.filters}><SkeletonField label="Buscar páginas"/><SkeletonField label="Nicho"/></div>:null}<div className={styles.grid}>{[1,2,3].map(id=><article key={id} className={styles.card}><div className={styles.heading}><Skeleton width={48} height={48} round/><Skeleton width="65%" height={25}/></div><Skeleton width="35%"/><Skeleton height={68}/><footer><SkeletonButton/><SkeletonButton/></footer></article>)}</div></div></SkeletonRegion>
}
