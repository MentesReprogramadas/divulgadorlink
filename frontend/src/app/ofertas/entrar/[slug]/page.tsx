import { SegmentJoin } from '@/features/affiliates/segment-join'
import { inviteMetadata } from '@/features/affiliates/server/invite-metadata'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return inviteMetadata((await params).slug)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <SegmentJoin key={slug} slug={slug} />
}
