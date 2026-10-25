import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PreviewLinkDetail } from '@/features/home-preview/preview-link-detail'
import { previewAvailable, previewLinks } from '@/features/home-preview/preview-data'
import { directionHref, findHomeDirection } from '@/features/home-directions/directions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Detalhes do link · Tem Link Aqui', robots: { index: false, follow: false } }
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ home?: string | string[] }> }) {
  if (!previewAvailable(process.env.NODE_ENV)) notFound()
  const { slug } = await params
  const link = previewLinks.find(item => item.slug === slug)
  if (!link) notFound()
  const home = (await searchParams).home
  const direction = typeof home === 'string' ? findHomeDirection(home) : undefined
  return <PreviewLinkDetail link={link} backHref={direction ? directionHref(direction.id) : undefined} />
}
