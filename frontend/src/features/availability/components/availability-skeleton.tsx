import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import { WorkspaceSection } from '@/components/layout/workspace-section'
import styles from './availability.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function AvailabilitySkeleton() {
  return <SkeletonRegion><div className={styles.page}><WorkspaceSection title="Disponibilidade"><dl className={styles.context}>{['Checagem', 'Última verificação', 'URL atual'].map(label => <div key={label}><dt>{label}</dt><dd><Skeleton height={26} /></dd></div>)}</dl><p className={styles.note}>A checagem indica acesso ao destino; não confirma vagas ou conteúdo do grupo.</p></WorkspaceSection><WorkspaceSection title="Histórico de correções"><Skeleton height={64} /></WorkspaceSection></div></SkeletonRegion>
}
export function CorrectionsQueueSkeleton() {
  return <SkeletonRegion><div className={styles.page}>{[0, 1].map(i => <article className={styles.card} key={i}><Skeleton width="60%" height={28} /><Skeleton height={26} /><Skeleton width="75%" height={26} /><div className={styles.fields}><SkeletonField /><SkeletonField multiline /><SkeletonButton /></div><LiquidLens radius={16} /></article>)}</div></SkeletonRegion>
}
