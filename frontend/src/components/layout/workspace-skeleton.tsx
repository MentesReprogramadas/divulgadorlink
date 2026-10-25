import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { WorkspaceSection } from '@/components/layout/workspace-section'
import dashboard from '@/components/layout/workspace-dashboard.module.css'
import styles from './workspace-skeleton.module.css'
import { DashboardShortcuts } from '@/features/account/components/dashboard-shortcuts'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function MetricsSkeleton({ count = 4 }: { count?: number }) {
  return <dl className={dashboard.metrics}>{Array.from({ length: count }, (_, i) => <div key={i}><dt><Skeleton width="75%" height="1lh" /></dt><dd><LiquidLens radius={16} /><Skeleton width="45%" height="1lh" /><small><Skeleton height={21} /></small></dd></div>)}</dl>
}
export function DashboardSummarySkeleton() {
  return <SkeletonRegion><div className={dashboard.dashboard}><MetricsSkeleton /><div className={dashboard.columns}>
    <WorkspaceSection title="Precisa de atenção"><Skeleton height={24} /><Skeleton width="70%" height={24} /></WorkspaceSection>
    <WorkspaceSection title="Links mais clicados"><Skeleton height={24} /><Skeleton width="80%" height={24} /></WorkspaceSection>
  </div></div></SkeletonRegion>
}
export function DashboardSkeleton() { return <div className={dashboard.dashboard}><DashboardSummarySkeleton /><DashboardShortcuts /></div> }
export function ActionSkeleton({ count = 1 }: { count?: number }) {
  return <WorkspaceActions>{Array.from({ length: count }, (_, i) => <SkeletonButton key={i} />)}</WorkspaceActions>
}
export function FiltersSkeleton({ count = 2 }: { count?: number }) {
  return <WorkspaceFilters label="Carregando filtros">{Array.from({ length: count }, (_, i) => <SkeletonField key={i} />)}</WorkspaceFilters>
}
export function RecordsSkeleton({ kind = 'links', count = 3 }: { kind?: 'links' | 'orders' | 'queue'; count?: number }) {
  if (kind === 'orders') return <div className="order-grid">{Array.from({ length: count }, (_, i) => <article className={`order-card ${dashboard.card}`} key={i}><LiquidLens radius={16} /><div className="order-card-top"><p className="panel-amount"><Skeleton width={120} height={32} /></p><Skeleton width={90} height={26} /></div><p className="panel-order-name"><Skeleton width="70%" height={26} /></p><p className="panel-meta"><Skeleton height={22} /></p></article>)}</div>
  return <div className={kind === 'links' ? 'panel-link-grid' : 'moderation-grid'}>{Array.from({ length: count }, (_, i) => <article key={i} className={`${kind === 'links' ? 'link-card' : 'order-card'} ${dashboard.card}`}><LiquidLens radius={16} />
    <div className={styles.record}><Skeleton width="30%" height={24} /><Skeleton width="68%" height={28} /><Skeleton height={24} /><Skeleton width="75%" height={24} /><div className="panel-stats">{[0, 1, 2].map(n => <div className={`metric ${dashboard.linkMetric}`} key={n}><LiquidLens radius={12} /><Skeleton width={48} height={24} /><Skeleton width={65} height={18} /></div>)}</div><div className="link-card-actions"><SkeletonButton /><SkeletonButton /></div></div>
  </article>)}</div>
}
export function ListSkeleton({ kind = 'links', filters = 2, actions = true }: { kind?: 'links' | 'orders' | 'queue'; filters?: number; actions?: boolean }) {
  return <SkeletonRegion><div className={dashboard.dashboard}>{actions ? <ActionSkeleton count={kind === 'links' ? 2 : 1} /> : null}{filters ? <FiltersSkeleton count={filters} /> : null}<RecordsSkeleton kind={kind} /></div></SkeletonRegion>
}
export function FormSkeleton({ fields = 2, multiline = false }: { fields?: number; multiline?: boolean }) {
  return <SkeletonRegion><div className={`form-grid ${styles.form}`}>
    <LiquidLens radius={16} />
    {Array.from({ length: fields }, (_, i) => <SkeletonField key={i} multiline={multiline && i === fields - 1} hint />)}<ActionSkeleton />
  </div></SkeletonRegion>
}
export function DetailSkeleton() {
  return <SkeletonRegion><div className={dashboard.dashboard}><div className={styles.section}><LiquidLens radius={16} /><Skeleton width="60%" height={28} /><div className={styles.record}>{[0, 1, 2].map(i => <SkeletonField key={i} />)}</div></div><div className={styles.section}><LiquidLens radius={16} /><Skeleton width="45%" height={28} /><Skeleton height={64} /></div></div></SkeletonRegion>
}
