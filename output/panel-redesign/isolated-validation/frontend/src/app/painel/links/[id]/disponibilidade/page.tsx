import { AvailabilityScreen } from '@/features/availability/availability-screen'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AvailabilityScreen linkId={(await params).id} />
}
