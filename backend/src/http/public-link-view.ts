import { getLinksRepository } from '@/repositories/links-repository'
import { openPublicLink } from '@/use-cases/@Links/open-public-link'

export async function publicLinkView(link: {
  ownerHidden?: boolean
  status: string
  tenantId: string
  ownerId: string | null
}) {
  const ownerStatus = link.ownerId
    ? (await getLinksRepository().findSubmitter(link.tenantId, link.ownerId))?.status ?? null
    : null
  return openPublicLink({ status: link.status, ownerHidden: link.ownerHidden, ownerStatus })
}
