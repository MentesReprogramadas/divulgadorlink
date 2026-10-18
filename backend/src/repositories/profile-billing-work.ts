import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient, ProfileSubscription } from '@prisma/client'
import { BillingProviderError, type BillingEventReference, type BillingSubscriptionSnapshot } from '@/domain/billing/billing-gateway'
import { BASE_PROFILE_CAPABILITIES } from '@/domain/billing/profile-plans'
import { knownProfileCapabilities } from './profile-billing-repository'

export const BILLING_LEASE_MS = 180000
export const BILLING_MAX_ATTEMPTS = 10
export type BillingWork = { kind: 'OPERATION' | 'EVENT'; id: string; leaseToken: string }
type Reservation = { subscriptionId: string; version: number; work: BillingWork }
export async function recoverBillingLeases(db: PrismaClient, now: Date) {
  const where = { state: 'PROCESSING', attempts: { gte: BILLING_MAX_ATTEMPTS }, lockedAt: { lt: new Date(now.getTime() - BILLING_LEASE_MS) } }
  const data = { state: 'FAILED', leaseToken: null, lockedAt: null, lastError: 'LEASE_EXPIRED' }
  await db.profileBillingOperation.updateMany({ where, data })
  await db.profileBillingEvent.updateMany({ where, data })
}

export async function claimBillingOperation(db: PrismaClient, now: Date) {
  return db.$transaction(async tx => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM profile_billing_operations WHERE attempts < $1 AND ((state=$2 AND "nextAttemptAt"<=$3) OR (state=$4 AND "lockedAt"<$5)) ORDER BY "nextAttemptAt",id FOR UPDATE SKIP LOCKED LIMIT 1',
      BILLING_MAX_ATTEMPTS, 'PENDING', now, 'PROCESSING', new Date(now.getTime() - BILLING_LEASE_MS),
    )
    if (!rows[0]) return null
    return tx.profileBillingOperation.update({ where: { id: rows[0].id }, data: { state: 'PROCESSING', attempts: { increment: 1 }, lockedAt: now, leaseToken: randomUUID() } })
  })
}
export async function claimBillingEvent(db: PrismaClient, now: Date) {
  return db.$transaction(async tx => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM profile_billing_events WHERE attempts < $1 AND ((state=$2 AND "nextAttemptAt"<=$3) OR (state=$4 AND "lockedAt"<$5)) ORDER BY "nextAttemptAt",id FOR UPDATE SKIP LOCKED LIMIT 1',
      BILLING_MAX_ATTEMPTS, 'PENDING', now, 'PROCESSING', new Date(now.getTime() - BILLING_LEASE_MS),
    )
    if (!rows[0]) return null
    return tx.profileBillingEvent.update({ where: { id: rows[0].id }, data: { state: 'PROCESSING', attempts: { increment: 1 }, lockedAt: now, leaseToken: randomUUID() } })
  })
}
async function holdsLease(tx: Prisma.TransactionClient, work: BillingWork, subscription: ProfileSubscription) {
  return work.kind === 'OPERATION'
    ? Boolean(await tx.profileBillingOperation.count({ where: { id: work.id, leaseToken: work.leaseToken, state: 'PROCESSING', subscriptionId: subscription.id } }))
    : Boolean(await tx.profileBillingEvent.count({ where: { id: work.id, leaseToken: work.leaseToken, state: 'PROCESSING', accountId: subscription.accountId, OR: [{ subscriptionId: null }, { subscriptionId: subscription.id }] } }))
}
async function lockSubscription(tx: Prisma.TransactionClient, subscriptionId: string) {
  const initial = await tx.profileSubscription.findUnique({ where: { id: subscriptionId } })
  if (!initial) return null
  await tx.$queryRawUnsafe('SELECT id FROM profile_billing_accounts WHERE id=$1 FOR UPDATE', initial.accountId)
  await tx.$queryRawUnsafe('SELECT id FROM profile_subscriptions WHERE id=$1 FOR UPDATE', initial.id)
  return tx.profileSubscription.findUnique({ where: { id: subscriptionId } })
}
/** Reserve before reading the canonical subscription. A late response cannot overwrite a later read. */
export async function reserveBillingReconciliation(db: PrismaClient, subscriptionId: string, work: BillingWork): Promise<Reservation | null> {
  return db.$transaction(async tx => {
    const current = await lockSubscription(tx, subscriptionId)
    if (!current || !await holdsLease(tx, work, current)) return null
    const row = await tx.profileSubscription.update({ where: { id: current.id }, data: { reconcileVersion: { increment: 1 } } })
    if (work.kind === 'EVENT') await tx.profileBillingEvent.update({ where: { id: work.id }, data: { subscriptionId, reconcileVersion: row.reconcileVersion } })
    return { subscriptionId, version: row.reconcileVersion, work }
  })
}
export async function applyBillingSnapshot(db: PrismaClient, reservation: Reservation, snapshot: BillingSubscriptionSnapshot, now: Date) {
  return db.$transaction(async tx => {
    const current = await lockSubscription(tx, reservation.subscriptionId)
    if (!current || current.reconcileVersion !== reservation.version || !await holdsLease(tx, reservation.work, current)) return false
    const account = await tx.profileBillingAccount.findUniqueOrThrow({ where: { id: current.accountId } })
    if (snapshot.customerId !== account.providerCustomerId || (current.providerSubscriptionId && current.providerSubscriptionId !== snapshot.id)) throw new BillingProviderError('UNSUPPORTED')
    const version = await tx.profilePlanVersion.findFirst({ where: { tenantId: current.tenantId, providerPriceId: snapshot.priceId, livemode: snapshot.livemode } })
    const next = snapshot.nextPriceId ? await tx.profilePlanVersion.findFirst({ where: { tenantId: current.tenantId, providerPriceId: snapshot.nextPriceId, livemode: snapshot.livemode } }) : null
    const owner = await tx.user.findUniqueOrThrow({ where: { id: current.ownerId }, include: {identifiers:true} })
    const reason = !version ? 'UNKNOWN_PRICE' : snapshot.nextPriceId && !next ? 'UNKNOWN_NEXT_PRICE' : snapshot.status === 'CANCELED' && snapshot.paidThrough && snapshot.paidThrough > now ? 'CANCELED_PAID_BALANCE' : null
    const data = {
      providerSubscriptionId: snapshot.id, providerScheduleId: snapshot.scheduleId,
      planVersionId: version?.id ?? current.planVersionId, scheduledVersionId: next?.id ?? null,
      status: !version ? 'REVIEW' : snapshot.status, periodStart: snapshot.periodStart, periodEnd: snapshot.periodEnd,
      paidThrough: snapshot.paidThrough, cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd, reviewReason: reason,
      checkoutUrl: snapshot.status === 'INCOMPLETE' ? current.checkoutUrl : null,
    }
    const changed = Object.entries(data).some(([key, value]) => {
      const previous = current[key as keyof typeof current]
      return (previous instanceof Date ? previous.getTime() : previous) !== (value instanceof Date ? value.getTime() : value)
    })
    await tx.profileSubscription.update({ where: { id: current.id }, data: { ...data, ...(changed ? { version: { increment: 1 } } : {}) } })
    const through = snapshot.periodEnd && snapshot.paidThrough ? new Date(Math.min(snapshot.periodEnd.getTime(), snapshot.paidThrough.getTime())) : null
    const valid = Boolean(version && owner.status === 'ACTIVE' && owner.identifiers.length > 0 && ['ACTIVE','PAST_DUE'].includes(snapshot.status) && snapshot.periodStart && snapshot.periodStart <= now && through && through > now)
    const keys = valid && version ? knownProfileCapabilities(version.capabilities).filter(key => !BASE_PROFILE_CAPABILITIES.some(base => base === key)) : []
    await tx.profileEntitlement.updateMany({ where: { subscriptionId: current.id, capability: { notIn: keys }, revokedAt: null }, data: { revokedAt: now } })
    for (const capability of keys) await tx.profileEntitlement.upsert({ where: { subscriptionId_capability: { subscriptionId: current.id, capability } },
      create: { tenantId: current.tenantId, ownerId: current.ownerId, subscriptionId: current.id, capability, validFrom: snapshot.periodStart!, validUntil: through! },
      update: { validFrom: snapshot.periodStart!, validUntil: through!, revokedAt: null },
    })
    if (changed) await tx.auditLog.create({ data: { tenantId: current.tenantId, actorId: null, action: 'profile.subscription.reconciled', entityType: 'ProfileSubscription', entityId: current.id, after: { status: data.status, planVersionId: data.planVersionId, periodEnd: snapshot.periodEnd?.toISOString() ?? null, reviewReason: reason } } })
    return true
  })
}
export async function storeBillingEvent(db: PrismaClient, reference: BillingEventReference, now = new Date()) {
  const account = await db.profileBillingAccount.findUnique({ where: { providerCustomerId: reference.customerId } })
  if (!account) return { received: true, ignored: true }
  const settings = await db.profileBillingSettings.findUnique({ where: { tenantId: account.tenantId } })
  if (!settings || settings.livemode !== reference.livemode) return { received: true, ignored: true }
  await db.profileBillingEvent.createMany({ data: [{ id: reference.id, tenantId: account.tenantId, ownerId: account.ownerId, accountId: account.id, kind: reference.kind, objectId: reference.objectId, objectType: reference.objectType, livemode: reference.livemode, occurredAt: reference.createdAt, receivedAt: now, nextAttemptAt: now }], skipDuplicates: true })
  return { received: true, ignored: false }
}
export async function finishBillingWork(db: PrismaClient, work: BillingWork, state: 'DONE' | 'PROCESSED' | 'IGNORED' | 'SUPERSEDED', now: Date) {
  if (work.kind === 'OPERATION') return db.profileBillingOperation.updateMany({ where: { id: work.id, leaseToken: work.leaseToken, state: 'PROCESSING' }, data: { state: 'DONE', lockedAt: null, leaseToken: null, lastError: null } })
  return db.profileBillingEvent.updateMany({ where: { id: work.id, leaseToken: work.leaseToken, state: 'PROCESSING' }, data: { state: state === 'DONE' ? 'PROCESSED' : state, lockedAt: null, leaseToken: null, processedAt: now, lastError: null } })
}
export async function failBillingWork(db: PrismaClient, work: BillingWork, attempts: number, code: string, retry: boolean, now: Date) {
  const data = { state: retry && attempts < BILLING_MAX_ATTEMPTS ? 'PENDING' : 'FAILED', lockedAt: null, leaseToken: null, lastError: code, nextAttemptAt: new Date(now.getTime() + Math.min(60000, 1000 * 2 ** Math.min(attempts, 6))) }
  return work.kind === 'OPERATION'
    ? db.profileBillingOperation.updateMany({ where: { id: work.id, leaseToken: work.leaseToken, state: 'PROCESSING' }, data })
    : db.profileBillingEvent.updateMany({ where: { id: work.id, leaseToken: work.leaseToken, state: 'PROCESSING' }, data })
}
