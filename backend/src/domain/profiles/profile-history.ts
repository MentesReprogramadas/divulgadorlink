import { profileInput } from './profile-input'
import type { ProfileContent } from './profile'

export const PROFILE_HISTORY_LIMIT = 50
export const PROFILE_HISTORY_DAYS = 180
type Revision = { id: string; version: number; createdAt: Date }
/** Active publication is exempt from age expiry, but still counts toward the cap. */
export function retainedProfileRevisions(rows: Revision[], publishedVersion: number | null, now: Date): string[] {
  const cutoff = now.getTime() - PROFILE_HISTORY_DAYS * 86400000
  const sorted = [...rows].sort((a, b) => b.version - a.version || b.id.localeCompare(a.id))
  const current = sorted.find(row => row.version === publishedVersion)
  const historical = sorted.filter(row => row !== current && row.createdAt.getTime() >= cutoff)
  return [...(current ? [current] : []), ...historical.slice(0, PROFILE_HISTORY_LIMIT - (current ? 1 : 0))].map(row => row.id)
}
/** Identity and permissions belong to the current resource, never the historical snapshot. */
export function restoreProfileContent(snapshot: unknown, currentSlug: string): ProfileContent {
  return { ...profileInput.parse(snapshot), slug: currentSlug }
}
