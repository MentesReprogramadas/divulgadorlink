import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'
import styles from './renewal-reminders.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function ReminderSkeleton() {
  return <SkeletonRegion><ul className={styles.list}>{[0, 1, 2].map(i => <li key={i}><article className={styles.card}><div><Skeleton width="70%" height={28} /><Skeleton width="45%" height={24} /></div><Skeleton height={52} /><Skeleton height={52} /><div className={styles.actions}><SkeletonButton /><SkeletonButton /></div><LiquidLens radius={16} /></article></li>)}</ul></SkeletonRegion>
}
