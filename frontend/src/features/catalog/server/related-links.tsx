import { cookies, headers } from 'next/headers'
import { forward, tenantHost } from '@/lib/upstream'
import { RelatedLinks } from '../components/related-links'
import type { RelatedPage } from '../related-contract'

export async function RelatedLinksSection({ linkId, requiresAge }: { linkId: string; requiresAge: boolean }) {
  const age = (await cookies()).get('age')?.value
  if (requiresAge && age !== 'yes') return <RelatedLinks key={linkId} linkId={linkId} initial={{ items: [], nextCursor: null, showImpressions: false }} deferLoad />
  let initial: RelatedPage | null = null
  try {
    const host = (await headers()).get('host') ?? 'localhost'
    const result = await forward({ method: 'GET', path: '/api/v1/links/' + encodeURIComponent(linkId) + '/related', host: tenantHost(host.split(':')[0]!), cookie: age === 'yes' || age === 'no' ? 'age=' + age : undefined, timeoutMs: 5000 })
    if (result.status === 200) initial = JSON.parse(result.body.toString()) as RelatedPage
    if (result.status === 404) initial = { items: [], nextCursor: null, showImpressions: false }
  } catch { /* Optional discovery must not prevent opening the original link. */ }
  return <RelatedLinks key={linkId} linkId={linkId} initial={initial} />
}
