import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'
import styles from './profile-history.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function ProfileHistorySkeleton() {
  return <SkeletonRegion label="Carregando histórico"><div className={styles.page}><div className={styles.actions}><SkeletonButton /><Skeleton width={44} height={44} /></div><Skeleton width="75%" height={20} /><div className={styles.list}>{[0, 1, 2].map(index => <div className={styles.card} key={index}><div className={styles.heading}><Skeleton width={110} height={28} /><Skeleton width={100} height={24} /></div><Skeleton width="50%" height={24} /><div className={styles.meta}><Skeleton width={140} height={20} /><Skeleton width={150} height={20} /></div><div className={styles.actions}><SkeletonButton /></div><LiquidLens radius={16} /></div>)}</div></div></SkeletonRegion>
}
