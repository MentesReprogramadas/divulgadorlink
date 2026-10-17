import { Skeleton, SkeletonButton, SkeletonRegion } from '@/components/feedback/skeleton'

export function VerificationSkeleton() {
  return <SkeletonRegion><div className="auth-form"><div className="verify-target"><Skeleton width="70%" height={24} /><Skeleton width={120} height={24} /></div><div className="code-boxes">{[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="code-box"><Skeleton height="100%" /></span>)}</div><SkeletonButton /><SkeletonButton /></div></SkeletonRegion>
}

export function VerificationPageSkeleton() {
  return <main className="auth-page"><h1 className="entry-title">Confirme o e-mail</h1><p className="auth-lead">O código chega no e-mail da conta. Depois disso o formulário de publicar abre direto.</p><VerificationSkeleton /></main>
}
