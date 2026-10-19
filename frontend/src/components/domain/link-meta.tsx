import { ActionIcon } from '@/components/ui/action-icon'
import { FacetBadge } from '@/components/ui/facet-badge'

export type LinkDiscovery = {
  city?: { name: string; state: string } | null
  languageTag?: string | null
  modality?: 'ONLINE' | 'PRESENTIAL' | null
}

export type LinkContext = {
  discovery?: LinkDiscovery | null
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
  discovery,
}: LinkContext & { status?: React.ReactNode }) {
  const nicheFacet = facet(niche)
  const networkFacet = facet(network)
  const language = discovery?.languageTag ? new Intl.DisplayNames(['pt-BR'], { type: 'language' }).of(discovery.languageTag) : null
  if (!nicheFacet && !networkFacet && !status && !discovery?.city && !language && !discovery?.modality) return null
  return (
    <p className="link-meta">
      {nicheFacet ? (
        <FacetBadge
          kind="niche"
          slug={nicheFacet.slug}
          name={nicheFacet.name}
        />
      ) : null}
      {networkFacet ? (
        <FacetBadge
          kind="network"
          slug={networkFacet.slug}
          name={networkFacet.name}
        />
      ) : null}
      {discovery?.city ? <span className="facet"><ActionIcon name="city" /><span>{discovery.city.name} / {discovery.city.state}</span></span> : null}
      {language ? <span className="facet"><ActionIcon name="language" /><span>{language}</span></span> : null}
      {discovery?.modality ? <span className="facet"><ActionIcon name="modality" /><span>{discovery.modality === 'ONLINE' ? 'Online' : 'Presencial'}</span></span> : null}
      {status}
    </p>
  )
}
