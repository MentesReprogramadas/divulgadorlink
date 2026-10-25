import { Skeleton, SkeletonButton, SkeletonField, SkeletonRegion } from '@/components/feedback/skeleton'
import {LiquidLens} from '@/components/ui/liquid-lens'
import styles from '@/components/forms/public-account.module.css'
export function AccountSkeleton() {
  return <SkeletonRegion><div className="account-grid">{[0, 1].map(i => <div key={i} className={`auth-form ${styles.form}`}><LiquidLens radius={16}/><SkeletonField /><SkeletonButton /></div>)}</div><div className={`auth-form ${styles.form}`}><LiquidLens radius={16}/><h3>Excluir conta</h3><p className="page-header-note"><Skeleton height={26} /></p><SkeletonField /><SkeletonButton /></div></SkeletonRegion>
}
