import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import styles from './redirects.module.css'
export function RedirectListSkeleton() {
  return <SkeletonRegion><div className={styles.grid}>{[0, 1, 2].map(i => <div key={i} className={styles.card}><Skeleton width="56px" height="56px" /><Skeleton width="75%" height="24px" /><Skeleton width="45%" height="16px" /></div>)}</div></SkeletonRegion>
}
