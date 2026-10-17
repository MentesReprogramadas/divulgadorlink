import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { PerformanceFiltersForm } from './performance-report'
import type { PerformanceFilters } from '../performance-contract'
import styles from './performance-report.module.css'

export function PerformanceSkeleton({ filters = {} }: { filters?: PerformanceFilters }) {
  return <SkeletonRegion><div className={styles.report}><header><p className={styles.eyebrow}>Resultado do destaque</p><h2><Skeleton width="65%" height={29} /></h2><p><Skeleton width="55%" height={26} /></p></header><PerformanceFiltersForm filters={filters} /><p className={styles.note}><Skeleton height={22} /></p><dl className={styles.metrics}>{[0, 1, 2, 3, 4].map(i => <div key={i}><dt><Skeleton height={22} /></dt><dd><Skeleton width="65%" height={32} /></dd><p><Skeleton height={21} /></p></div>)}</dl><p className={styles.note}><Skeleton height={44} /></p>{[0, 1].map(i => <section className={styles.section} key={i}><h3><Skeleton width="45%" height={28} /></h3><Skeleton height={180} /></section>)}</div></SkeletonRegion>
}
