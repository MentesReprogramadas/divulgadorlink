import { PerformanceScreen } from '@/features/promotions/performance-screen'

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params
  const query = await searchParams
  const value = (key: string) => typeof query[key] === 'string' ? query[key] as string : undefined
  return <PerformanceScreen linkId={id} filters={{ from: value('from'), to: value('to'), promotionId: value('promotionId') }} />
}
