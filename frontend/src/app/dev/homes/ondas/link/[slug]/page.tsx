import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { previewAvailable, previewLinks } from '@/features/home-preview/preview-data'
import { WaveLinkDetail } from '@/features/ondas-preview/wave-link-detail'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const link = previewLinks.find(item => item.slug === slug)
  return { title: `${link?.title ?? 'Link'} · Ondas · Tem Link Aqui`, robots: { index: false, follow: false } }
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!previewAvailable(process.env.NODE_ENV)) notFound()
  const { slug } = await params
  const link = previewLinks.find(item => item.slug === slug)
  if (!link) notFound()
  return <WaveLinkDetail link={link} />
}
