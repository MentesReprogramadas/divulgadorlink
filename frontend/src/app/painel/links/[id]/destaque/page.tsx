'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { CheckoutSkeleton } from '@/features/promotions/components/plans-skeleton'
import { PromotionPurchase } from '@/features/promotions/promotion-purchase'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <Suspense fallback={<CheckoutSkeleton />}><PromotionPurchase linkId={id} /></Suspense>
}
