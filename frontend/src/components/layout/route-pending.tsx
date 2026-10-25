import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { LiquidLens } from '@/components/ui/liquid-lens'
import styles from './route-pending.module.css'

export function RoutePending({variant='page'}:{variant?:'page'|'detail'}) {
  return <main className="panel-page" aria-busy="true" data-route-pending><SkeletonRegion label="Carregando conteúdo"><div className={styles.layout} data-variant={variant}>{variant==='detail'?<Skeleton height={380}/>:null}<section className={styles.panel}><LiquidLens radius={20}/><Skeleton width="45%" height={36}/><Skeleton height={48}/><Skeleton width="80%" height={24}/><Skeleton height={180}/></section></div></SkeletonRegion></main>
}
