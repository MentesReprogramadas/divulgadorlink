import { FacetBadge } from '@/components/ui/facet-badge'

export type LinkContext = {
  niche?: { name?: string; slug?: string } | null
  network?: { name?: string; slug?: string } | null
}

function facet(value: { name?: string; slug?: string } | null | undefined): { name: string; slug: string } | null {
  const name = value?.name?.trim() ?? ''
  const slug = value?.slug?.trim() ?? ''
  if (!name) return null
  return { name, slug }
}

export function LinkMeta({
  niche,
  network,
  status,
}: LinkContext & { status?: React.ReactNode }) {
  const nicheFacet = facet(niche)
  const networkFacet = facet(network)
  if (!nicheFacet && !networkFacet && !status) return null
  return (
    <p className="link-meta">
      {nicheFacet ? (
        <FacetBadge
          kind="niche"
          slug={nicheFacet.slug}
          name={nicheFacet.name}
          href={nicheFacet.slug ? `/nicho/${encodeURIComponent(nicheFacet.slug)}` : undefined}
        />
      ) : null}
      {networkFacet ? (
        <FacetBadge
          kind="network"
          slug={networkFacet.slug}
          name={networkFacet.name}
          href={networkFacet.slug ? `/rede/${encodeURIComponent(networkFacet.slug)}` : undefined}
        />
      ) : null}
      {status}
    </p>
  )
}
