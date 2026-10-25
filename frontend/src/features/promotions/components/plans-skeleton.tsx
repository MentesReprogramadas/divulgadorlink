import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import {LiquidLens} from '@/components/ui/liquid-lens'
import glass from '@/features/promotions/components/checkout-surfaces.module.css'

export function PlanCardsSkeleton({ count = 3 }: { count?: number }) {
  return <SkeletonRegion label="Carregando planos"><div className="plan-grid">{Array.from({ length: count }, (_, i) => <div className={`plan-card ${glass.choice}`} key={i}><LiquidLens radius={16}/><Skeleton width={20} height={20} round /><span className="plan-mark"><Skeleton width={85} height={20} /></span><span className="plan-name"><Skeleton width={120} height={26} /></span><span className="plan-price"><Skeleton width={100} height={40} /></span></div>)}</div></SkeletonRegion>
}
export function CheckoutSkeleton() {
  return <div className="checkout"><h2 className="panel-section-title">Destaque</h2><SkeletonRegion><div className="duration-tabs">{[7, 14, 28].map(days => <span className={`duration-tab ${glass.choice}`} key={days}><LiquidLens radius={16}/>{days} dias</span>)}</div></SkeletonRegion><PlanCardsSkeleton /></div>
}
export function PlanPageSkeleton() {
  return <div className="plan-admin"><p className="pay-quiet">Os cards são os do checkout. Arraste ou use as setas para cima e para baixo no botão Arrastar para mudar a ordem. Editar abre o preço e o destaque.</p><SkeletonRegion><div className="duration-tabs">{[7, 14, 28].map(days => <span className={`duration-tab ${glass.choice}`} key={days}><LiquidLens radius={16}/>{days} dias</span>)}</div></SkeletonRegion><PlanCardsSkeleton /></div>
}
