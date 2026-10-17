import { Suspense } from 'react'
import { HomeContent, generateHomeMetadata } from '@/features/catalog/server/home-page'
import { HomeSkeleton } from '@/features/catalog/components/catalog-skeleton'

export const dynamic = 'force-dynamic'
export const generateMetadata = generateHomeMetadata

export default function Page({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  return <Suspense fallback={<HomeSkeleton />}><HomeContent searchParams={searchParams} /></Suspense>
}
