import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { previewAvailable } from '@/features/home-preview/preview-data'
import { WaveHome } from '@/features/ondas-preview/wave-home'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ondas · Tem Link Aqui', robots: { index: false, follow: false } }
export default function Page() {
  if (!previewAvailable(process.env.NODE_ENV)) notFound()
  return <WaveHome />
}
