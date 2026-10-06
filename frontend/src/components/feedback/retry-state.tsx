'use client'

import { useRouter } from 'next/navigation'
import { ErrorState } from '@/components/feedback/error-state'

export function RetryState() {
  const router = useRouter()
  return <ErrorState onRetry={() => router.refresh()} />
}
