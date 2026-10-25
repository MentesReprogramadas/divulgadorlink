import { Skeleton, SkeletonRegion, SkeletonField } from '@/components/feedback/skeleton'
import styles from './discovery.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function DiscoverySkeleton({resultsOnly=false}:{resultsOnly?:boolean}) {
  return <SkeletonRegion label="Carregando páginas"><div className={styles.page}>{!resultsOnly?<div className={styles.filters}><SkeletonField label="Buscar páginas"/><div><Skeleton width={90} height={18}/><div className={styles.filterSummary}>{[1,2,3].map(id=><Skeleton width={110} height={38} key={id}/>)}</div></div></div>:null}<div className={styles.grid}>{[1,2,3].map(id=><article key={id} className={styles.card}><div className={styles.heading}><Skeleton width={48} height={48} round/><Skeleton width="65%" height={25}/></div><Skeleton width="35%"/><Skeleton height={48}/><footer><span className="button"><Skeleton width={60} height={20}/></span><span className="button"><Skeleton width={85} height={20}/></span></footer><LiquidLens radius={16} /></article>)}</div></div></SkeletonRegion>
}
