import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { WorkspaceSection } from '@/components/layout/workspace-section'
import { ActionSkeleton } from '@/components/layout/workspace-skeleton'
import styles from './evolution-integration.module.css'

export function EvolutionIntegrationSkeleton() {
  return <SkeletonRegion><section className={styles.page}><ActionSkeleton count={3} /><WorkspaceSection title="Avisos e moderação pelo WhatsApp"><dl className={styles.details}>{['Configuração', 'Instância', 'Grupo', 'Integração', 'Comandos', 'Entregas pendentes ou com falha'].map(label => <div key={label} style={{ display: 'contents' }}><dt>{label}</dt><dd><Skeleton height={26} /></dd></div>)}</dl></WorkspaceSection><WorkspaceSection title="Operadores autorizados"><Skeleton height={52} /><ul className={styles.operators}>{[0, 1].map(i => <li key={i}><Skeleton width={120} height={26} /><Skeleton width={150} height={48} /></li>)}</ul></WorkspaceSection></section></SkeletonRegion>
}
