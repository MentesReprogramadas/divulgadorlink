import type { Prisma } from '@prisma/client'
import type { ProfileContent } from '@/domain/profiles/profile'
import { retainedProfileRevisions, PROFILE_HISTORY_DAYS } from '@/domain/profiles/profile-history'
import {recordChannelRevision} from './profile-channels-storage'

export async function availableProfileRevisions(db: Prisma.TransactionClient, profile: { id: string; publishedVersion: number | null }, now: Date) {
  const rows = await db.profileRevision.findMany({ where: { profileId: profile.id, OR: [{ createdAt: { gte: new Date(now.getTime() - PROFILE_HISTORY_DAYS * 86400000) } }, ...(profile.publishedVersion !== null ? [{ version: profile.publishedVersion }] : [])] }, orderBy: { version: 'desc' }, take: 50 })
  if (profile.publishedVersion !== null && !rows.some(row => row.version === profile.publishedVersion)) {
    const active = await db.profileRevision.findUnique({ where: { profileId_version: { profileId: profile.id, version: profile.publishedVersion } } })
    if (active) rows.push(active)
  }
  const keep = new Set(retainedProfileRevisions(rows, profile.publishedVersion, now))
  return rows.filter(row => keep.has(row.id)).sort((a, b) => b.version - a.version)
}
export async function pruneProfileRevisions(db: Prisma.TransactionClient, profile: { id: string; publishedVersion: number | null }, now = new Date()) {
  const keep = await availableProfileRevisions(db, profile, now)
  await db.profileRevision.deleteMany({ where: { profileId: profile.id, id: { notIn: keep.map(row => row.id) } } })
}
/** Called in the publication transaction, including human approval from either channel. */
export async function recordProfileRevision(db: Prisma.TransactionClient, profile: { id: string; tenantId: string; ownerId: string; version: number }, snapshot: ProfileContent) {
  await db.profileRevision.createMany({ data: [{ profileId: profile.id, tenantId: profile.tenantId, ownerId: profile.ownerId, version: profile.version, snapshot, avatarAssetId: snapshot.avatarAssetId }], skipDuplicates: true })
  await recordChannelRevision(db,profile,snapshot)
  await pruneProfileRevisions(db, { id: profile.id, publishedVersion: profile.version })
}
