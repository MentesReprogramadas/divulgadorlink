import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { previewAvailable } from '@/features/home-preview/preview-data'
import { HomeDirectionGallery } from '@/features/home-directions/home-direction-gallery'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Escolha uma direção · Tem Link Aqui', robots: { index: false, follow: false } }
export default function Page() {
  if (!previewAvailable(process.env.NODE_ENV)) notFound()
  return <HomeDirectionGallery />
}
