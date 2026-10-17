import { ReportQueue } from '@/features/moderation/report-queue'
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams
  const value = (key: string) => typeof query[key] === 'string' ? query[key] as string : undefined
  return <ReportQueue filters={{ kind: value('kind'), status: value('status'), cursor: value('cursor') }} />
}
