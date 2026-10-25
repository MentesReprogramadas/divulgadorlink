import { getLinksRepository, PrismaLinksRepository } from '@/repositories/links-repository'
import { readApprovedLinkMedia } from '@/repositories/link-media'

/** Enrich the selected page only; media never changes ordering or pagination. */
export async function approvedMediaForCards(tenantId: string, rows: { id: string }[]) {
  const repo = getLinksRepository()
  return repo instanceof PrismaLinksRepository ? readApprovedLinkMedia(repo.client, tenantId, rows.map(row => row.id)) : new Map<string, { iconUrl?: string; imageUrl?: string; imageAlt?: string | null }>()
}
