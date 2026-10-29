import { AffiliatesScreen } from '@/features/affiliates/affiliates-screen'

export default async function AffiliateSegmentPage({ params }: { params: Promise<{ segmentId: string }> }) {
  const { segmentId } = await params
  return <AffiliatesScreen initialArea="segments" initialSegmentId={segmentId} />
}
