import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'
import styles from './admin-links-board.module.css'

export function AdminLinksSkeleton() {
  return <SkeletonRegion><div className={styles.grid}>{[0, 1, 2, 3].map(i => <article className={styles.card} key={i}><Skeleton width={100} height={28} /><Skeleton width="75%" height={28} /><Skeleton height={26} /><Skeleton width="60%" height={26} /><Skeleton height={52} /><div className={styles.actions}><SkeletonButton /><SkeletonButton /></div></article>)}</div></SkeletonRegion>
}
