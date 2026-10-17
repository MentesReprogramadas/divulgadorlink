import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { WorkspaceSection } from '@/components/layout/workspace-section'
import { FiltersSkeleton } from '@/components/layout/workspace-skeleton'
import styles from './facet-summaries.module.css'

export function FacetSummariesSkeleton() {
  return <SkeletonRegion><FiltersSkeleton /><div className={styles.list}>{[0, 1, 2, 3].map(i => <div key={i} className={styles.item}><Skeleton width="65%" height={24} /><Skeleton width="40%" height={24} /></div>)}</div></SkeletonRegion>
}
export function SettingsSkeleton() {
  return <><WorkspaceSection title="Exibição do catálogo"><div className="setting-row"><div><p className="setting-title">Impressões no catálogo</p><p className="setting-copy">Mostra o olho e o total de impressões nos links públicos. O painel do dono continua com as métricas.</p></div><Skeleton width={44} height={24} round /></div></WorkspaceSection><FacetSummariesSkeleton /></>
}
