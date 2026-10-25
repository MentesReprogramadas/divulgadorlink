import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomePreview } from '@/features/home-preview/home-preview'
import { previewAvailable } from '@/features/home-preview/preview-data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Home reimaginada · Tem Link Aqui', robots: { index: false, follow: false } }
export default function Page() {
  if (!previewAvailable(process.env.NODE_ENV)) notFound()
  return <HomePreview />
}
