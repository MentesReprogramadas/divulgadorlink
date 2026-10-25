import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'
import {LiquidLens} from '@/components/ui/liquid-lens'
import styles from '@/components/forms/public-account.module.css'
import code from '@/components/domain/code-boxes.module.css'

export function VerificationSkeleton() {
  return <SkeletonRegion><div className={`auth-form ${styles.form}`}><LiquidLens radius={16}/><div className="verify-target"><Skeleton width="70%" height={24} /><Skeleton width={120} height={24} /></div><div className={code.boxes}>{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={48}/>)}</div><SkeletonButton /><SkeletonButton /></div></SkeletonRegion>
}

export function VerificationPageSkeleton() {
  return <main className="auth-page"><h1 className="entry-title">Confirme o e-mail</h1><p className="auth-lead">O código chega no e-mail da conta. Depois disso o formulário de publicar abre direto.</p><VerificationSkeleton /></main>
}
