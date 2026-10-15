import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ModerationQueue } from './queue'

export default async function Page({ searchParams }: { searchParams: Promise<{ link?: string | string[] }> }) {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN') notFound()
  const params = await searchParams
  const linkId = typeof params.link === 'string' ? params.link : undefined
  return <><h2 className="panel-section-title">Moderação</h2><p className="panel-section-description">Revise os envios e acompanhe as decisões de publicação.</p><ModerationQueue linkId={linkId} /></>
}
