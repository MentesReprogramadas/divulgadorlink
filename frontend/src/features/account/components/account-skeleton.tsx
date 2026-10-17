import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
export function AccountSkeleton() {
  return <SkeletonRegion><div className="account-grid">{[0, 1].map(i => <div key={i}><SkeletonField /><SkeletonButton /></div>)}</div><div className="auth-form"><h3>Excluir conta</h3><p className="page-header-note"><Skeleton height={26} /></p><SkeletonField /><SkeletonButton /></div></SkeletonRegion>
}
