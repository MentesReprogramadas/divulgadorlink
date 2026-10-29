import { SegmentJoin, type PublicAffiliateInvite } from '@/features/affiliates/segment-join'
import { inviteMetadata } from '@/features/affiliates/server/invite-metadata'
import { loadCatalog } from '@/lib/catalog-page'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return inviteMetadata((await params).slug)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let initialSegment:PublicAffiliateInvite|undefined
  try {
    const result=await loadCatalog('/api/v1/public/affiliates/'+encodeURIComponent(slug))
    const body=result.body as Partial<PublicAffiliateInvite>|null
    if(result.status===200&&typeof body?.name==='string'&&typeof body.description==='string'&&typeof body.available==='boolean')initialSegment={name:body.name,description:body.description,available:body.available,imageUrl:body.imageUrl,joinMode:body.joinMode}
  } catch {/* Keep the existing client retry if the initial upstream request fails. */}
  return <SegmentJoin key={slug} slug={slug} initialSegment={initialSegment} />
}
