import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { previewAvailable } from '@/features/home-preview/preview-data'
import { findHomeDirection } from '@/features/home-directions/directions'
import { DirectionHome } from '@/features/home-directions/direction-home'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ style: string }> }): Promise<Metadata> {
  const direction = findHomeDirection((await params).style)
  return { title: `${direction?.name ?? 'Home'} · Tem Link Aqui`, robots: { index: false, follow: false } }
}
export default async function Page({ params }: { params: Promise<{ style: string }> }) {
  if (!previewAvailable(process.env.NODE_ENV)) notFound()
  const direction = findHomeDirection((await params).style)
  if (!direction) notFound()
  return <DirectionHome key={direction.id} direction={direction} />
}
