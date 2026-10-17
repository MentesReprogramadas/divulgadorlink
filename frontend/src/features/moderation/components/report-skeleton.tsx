import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import styles from './reports.module.css'

export function ReportSubmissionSkeleton() {
  return <SkeletonRegion><section className={styles.page}><header><h2>Denunciar um link</h2><Skeleton width="60%" height={26} /></header><div className={styles.form}><div className={styles.fields}><SkeletonField /><SkeletonField multiline /><SkeletonButton /></div></div></section></SkeletonRegion>
}
export function ReportQueueSkeleton() {
  return <SkeletonRegion><div className={styles.queue}>{[0, 1].map(i => <article className={styles.card} key={i}><header><Skeleton width="60%" height={28} /><p className={styles.meta}><Skeleton height={22} /></p></header><div className={styles.context}><Skeleton width={90} height={24} /><Skeleton width={100} height={24} /></div><blockquote className={styles.comment}><Skeleton height={26} /></blockquote><div className={styles.decision}><div className={styles.fields}><SkeletonField /><SkeletonField multiline /><SkeletonButton /></div></div></article>)}</div></SkeletonRegion>
}
export function AppealSkeleton() {
  return <SkeletonRegion><h2 className="panel-section-title">Contestar</h2><p className="panel-section-description">Explique o motivo da revisão. O envio de uma contestação não altera a publicação automaticamente.</p><div className="auth-form"><SkeletonField label="Explique o que aconteceu" multiline required /><SkeletonButton /></div></SkeletonRegion>
}
