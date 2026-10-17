import { UrlProposalQueue } from '@/features/availability/url-proposal-queue'
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cursor = (await searchParams).cursor
  return <UrlProposalQueue cursor={typeof cursor === 'string' ? cursor : undefined} />
}
