import { ModerationQueue } from './queue'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ModerationWorkspace } from '@/features/content-review/moderation-workspace'

export default async function Page({ searchParams }: { searchParams: Promise<{ link?: string | string[] }> }) {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN') notFound()
  const params = await searchParams
  const linkId = typeof params.link === 'string' ? params.link : undefined
  return <><ModerationWorkspace links={<ModerationQueue linkId={linkId} />} /></>
}
