import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'

export default function Loading() { return <SkeletonRegion label="Carregando central de afiliados"><Skeleton height={110} /><Skeleton height={360} /></SkeletonRegion> }
