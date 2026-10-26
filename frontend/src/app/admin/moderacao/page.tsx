import { ModerationQueue } from './queue'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ModerationWorkspace } from '@/features/content-review/moderation-workspace'
import { LinkSeoEditor } from '@/features/administration/components/catalog-seo-editor'

export default async function Page({ searchParams }: { searchParams: Promise<{ link?: string | string[]; tab?: string | string[] }> }) {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN' && !(await cookies()).get('workspaceOwner')?.value) notFound()
  const params = await searchParams
  const linkId = typeof params.link === 'string' ? params.link : undefined
  return <><ModerationWorkspace initialTab={params.tab === 'attachments' ? 'attachments' : 'links'} linkId={linkId} links={<ModerationQueue linkId={linkId} />} />{linkId ? <LinkSeoEditor linkId={linkId} /> : null}</>
}
