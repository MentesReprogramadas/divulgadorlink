import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'
import { MetricsSkeleton, RecordsSkeleton } from '@/components/layout/workspace-skeleton'
import { WorkspaceSection } from '@/components/layout/workspace-section'
import styles from '@/components/layout/workspace-dashboard.module.css'

export function InsightSkeleton({ kind }: { kind: 'traffic' | 'finance' | 'retention' }) {
  return <SkeletonRegion>{kind === 'retention' ? <section><h2>Retenção</h2><p><Skeleton height={52} /></p><p className="metric"><Skeleton width={90} height={32} /><Skeleton width={160} height={24} /></p><SkeletonButton /></section> : <section>
    {kind === 'traffic' ? <p className="office-note"><Skeleton height={52} /></p> : null}
    <div className="insight-tabs">{[0, 1, 2, 3].map(i => <Skeleton width={100} height={44} key={i} />)}</div>
    <dl className="insight-metrics">{[0, 1, 2, 3].map(i => <div key={i}><dt><Skeleton width="65%" height={24} /></dt><dd><Skeleton width="55%" height={32} /></dd></div>)}</dl><h2><Skeleton width="45%" height={28} /></h2><Skeleton height={220} />
  </section>}</SkeletonRegion>
}
export function OfficeSkeleton({ section }: { section: string }) {
  return <SkeletonRegion><div className={styles.dashboard}>{section === 'metricas' ? <><MetricsSkeleton /><div className={styles.columns}><WorkspaceSection title="Publicação no catálogo" description="Quantidade de links por situação."><div className={styles.tasks}>{[0, 1, 2, 3, 4].map(i => <Skeleton height={42} key={i} />)}</div></WorkspaceSection><WorkspaceSection title="Próximas ações"><ul className={styles.tasks}>{[0, 1, 2, 3].map(i => <li key={i}><Skeleton height={26} /><Skeleton width="80%" height={26} /></li>)}</ul></WorkspaceSection></div></> : <RecordsSkeleton kind={section === 'links' ? 'links' : 'orders'} />}</div></SkeletonRegion>
}
