import { Suspense } from 'react'
import { HomeContent, generateHomeMetadata } from '@/features/catalog/server/home-page'
import { HomeSkeleton } from '@/features/catalog/components/catalog-skeleton'

export const dynamic = 'force-dynamic'
export const generateMetadata = generateHomeMetadata

export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const query=await searchParams
  return <Suspense fallback={<HomeSkeleton />}><HomeContent searchParams={Promise.resolve(query)} /></Suspense>
}
