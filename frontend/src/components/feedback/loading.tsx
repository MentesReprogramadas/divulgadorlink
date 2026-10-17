import { Skeleton, SkeletonRegion } from './skeleton'

export function Loading() {
  return <SkeletonRegion><Skeleton height={24} /></SkeletonRegion>
}
