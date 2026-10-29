import { notFound } from 'next/navigation'
import { AffiliatesScreen } from '@/features/affiliates/affiliates-screen'
import { affiliateAreas } from '@/features/affiliates/affiliate-navigation'

export default async function Page({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params
  const selected = affiliateAreas.find(item => item.path === area)
  if (!selected) notFound()
  return <AffiliatesScreen initialArea={selected.id} />
}
