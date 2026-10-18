import type { Prisma } from '@prisma/client'
import { profileCapabilities, type PaidSubscription, type ProfileCapability } from '@/domain/billing/profile-plans'

type Coverage = Omit<PaidSubscription, 'capabilities'> & { entitlements: Array<{ capability: string; validFrom: Date; validUntil: Date; revokedAt: Date | null }> }
export function coveredProfileCapabilities(subscription: Coverage | null, hasIdentifiers: boolean, delivered: ReadonlySet<ProfileCapability>, now: Date) {
  const keys = hasIdentifiers ? subscription?.entitlements.filter(row => !row.revokedAt && row.validFrom <= now && row.validUntil > now).map(row => row.capability).filter((key): key is ProfileCapability => delivered.has(key as ProfileCapability)) ?? [] : []
  return profileCapabilities(subscription ? { ...subscription, capabilities: keys } : null, delivered, now)
}
export async function profilePaidCapabilityCoverage(db: Prisma.TransactionClient, actor: { tenantId: string; ownerId: string }, delivered: ReadonlySet<ProfileCapability>, now: Date, capability: 'profile.scheduling'|'profile.analytics'|'profile.richBlocks'|'profile.subdomain') {
  const user = await db.user.findFirst({ where: { id: actor.ownerId, tenantId: actor.tenantId, status: 'ACTIVE' }, include: { identifiers: true } })
  const subscription = await db.profileSubscription.findFirst({ where: { tenantId: actor.tenantId, ownerId: actor.ownerId, status: { in: ['ACTIVE','PAST_DUE'] } }, include: { entitlements: true } })
  const enabled = Boolean(user && coveredProfileCapabilities(subscription, user.identifiers.length > 0, delivered, now).includes(capability))
  const entitlement = subscription?.entitlements.find(row => row.capability === capability && !row.revokedAt && row.validFrom <= now && row.validUntil > now)
  const until = enabled && subscription?.paidThrough && subscription.periodEnd && entitlement ? new Date(Math.min(subscription.paidThrough.getTime(), subscription.periodEnd.getTime(), entitlement.validUntil.getTime())) : null
  return { enabled, until }
}
export function profileSchedulingCoverage(db:Prisma.TransactionClient,actor:{tenantId:string;ownerId:string},delivered:ReadonlySet<ProfileCapability>,now:Date){return profilePaidCapabilityCoverage(db,actor,delivered,now,'profile.scheduling')}
