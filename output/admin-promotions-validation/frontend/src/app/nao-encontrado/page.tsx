import type { Metadata } from 'next'
import { privateMetadata } from '@/domain/crawler-policy'
import { NotFoundPage } from '@/components/feedback/not-found-page'

export const metadata: Metadata = privateMetadata

export default function Page() {
  return <NotFoundPage />
}
