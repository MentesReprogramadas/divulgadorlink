import type { Metadata } from 'next'
import { SegmentJoin } from '@/features/affiliates/segment-join'

export const metadata: Metadata = { title: 'Entrar no grupo de ofertas | Tem Link Aqui', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <SegmentJoin slug={slug} />
}
