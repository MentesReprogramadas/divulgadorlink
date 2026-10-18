import { createHash, randomUUID } from 'node:crypto'
import type { PrismaClient, ProfileSubscription } from '@prisma/client'
import { BILLING_OPEN_STATES, requireBillingActor, type BillingActor, type BillingRuntime } from '@/repositories/profile-billing-repository'
import { BILLING_CHECKOUT_WINDOW_MS } from './process-billing-operation'
import { BillingProviderError } from '@/domain/billing/billing-gateway'

export async function queueSubscriptionReconciliation(db: PrismaClient, row: ProfileSubscription, now: Date) {
  return db.$transaction(async tx => {
    const account = await tx.profileBillingAccount.findUniqueOrThrow({ where: { id: row.accountId } })
    if (!account.providerCustomerId || (!row.providerSubscriptionId && !row.providerCheckoutId)) return { queued: false }
    await tx.$queryRawUnsafe('SELECT id FROM profile_billing_accounts WHERE id=$1 FOR UPDATE', account.id)
    const existing = await tx.profileBillingEvent.findFirst({ where: { subscriptionId: row.id, kind: 'INTERNAL_RECONCILE', receivedAt: { gte: new Date(now.getTime() - 60000) } }, orderBy: { receivedAt: 'desc' } })
    if (existing) return { queued: existing.state === 'PENDING' || existing.state === 'PROCESSING' }
    const settings = await tx.profileBillingSettings.findUnique({ where: { tenantId: row.tenantId } })
    if (!settings) return { queued: false }
    await tx.profileBillingEvent.create({ data: { id: 'sync_' + randomUUID(), tenantId: row.tenantId, ownerId: row.ownerId, accountId: account.id, subscriptionId: row.id,
      kind: 'INTERNAL_RECONCILE', objectId: row.providerSubscriptionId ?? row.providerCheckoutId!, objectType: row.providerSubscriptionId ? 'subscription' : 'checkout',
      livemode: settings.livemode, occurredAt: now, receivedAt: now, nextAttemptAt: now,
    } })
    return { queued: true }
  })
}
export async function requestBillingReconciliation(db: PrismaClient, actor: BillingActor, now = new Date()) {
  await requireBillingActor(db, actor)
  const row = await db.profileSubscription.findFirst({ where: { ...actor, status: { in: BILLING_OPEN_STATES } } })
    ?? await db.profileSubscription.findFirst({ where: actor, orderBy: { createdAt: 'desc' } })
  return row ? queueSubscriptionReconciliation(db, row, now) : { queued: false }
}
/** Recover missing webhooks without relying on a user opening the panel. No new charge is created. */
export async function queueStaleBillingReconciliations(db: PrismaClient, now = new Date()) {
  const since = new Date(now.getTime()-300000)
  const rows = await db.profileSubscription.findMany({where:{
    status:{in:BILLING_OPEN_STATES},updatedAt:{lte:since},account:{providerCustomerId:{not:null}},
    OR:[{providerSubscriptionId:{not:null}},{providerCheckoutId:{not:null}}],
    AND:[{events:{none:{state:{in:['PENDING','PROCESSING']}}}},{events:{none:{kind:'INTERNAL_RECONCILE',receivedAt:{gt:since}}}}],
  },orderBy:{updatedAt:'asc'},take:20})
  for(const row of rows)await queueSubscriptionReconciliation(db,row,now)
  return rows.length
}
/** Suspension or the existing anonymization's empty identities durably stops renewals. */
export async function queueSuspendedBillingCancellations(db: PrismaClient, now = new Date()) {
  const rows = await db.profileSubscription.findMany({ where: {
    status: { in: BILLING_OPEN_STATES }, cancelAtPeriodEnd: false, account: { owner: { OR: [{status:'BANNED'},{identifiers:{none:{}}}] } },
    operations: { none: { kind: 'CANCEL', state: { in: ['PENDING','PROCESSING'] } } },
  }, take: 20, orderBy: { createdAt: 'asc' } })
  for (const row of rows) {
    const requestKey = 'suspension-' + row.id + '-' + row.version
    const fingerprint = createHash('sha256').update(requestKey).digest('hex')
    await db.profileBillingOperation.createMany({ data: [{ tenantId: row.tenantId, ownerId: row.ownerId, subscriptionId: row.id, kind: 'CANCEL', requestKey, fingerprint, expectedVersion: row.version, referencePeriodEnd: row.periodEnd, createdAt: now, nextAttemptAt: now }], skipDuplicates: true })
  }
}
export async function reconcileExpiredCheckouts(db: PrismaClient, runtime: BillingRuntime, now = new Date()) {
  const gateway = runtime.gateway
  if (!gateway) return
  const rows = await db.profileSubscription.findMany({ where: { status: { in: ['PENDING','INCOMPLETE'] }, providerCheckoutId: { not: null }, checkoutExpiresAt: { lte: now } },
    include: { account: true }, orderBy: { checkoutExpiresAt: 'asc' }, take: 2,
  })
  for (const row of rows) {
    try {
      let session = await gateway.checkout(row.providerCheckoutId!)
      if (session.customerId !== row.account.providerCustomerId) continue
      if (session.status === 'OPEN') { await gateway.expireCheckout(session.id, 'profile-expire-' + row.id); session = await gateway.checkout(session.id) }
      if (session.status === 'EXPIRED' && !row.providerSubscriptionId) {
        await db.profileSubscription.updateMany({ where: { id: row.id, providerSubscriptionId: null, status: { in: ['PENDING','INCOMPLETE'] } }, data: { status: 'EXPIRED', checkoutUrl: null, version: { increment: 1 } } })
      } else await queueSubscriptionReconciliation(db, row, now)
    } catch (error) {
      // An outage cannot assert expiration or free another chargeable slot.
      await db.profileSubscription.updateMany({ where: { id: row.id, status: { in: ['PENDING','INCOMPLETE'] } },
        data: { reviewReason: error instanceof BillingProviderError ? error.code : 'RECONCILIATION_UNAVAILABLE' } })
    }
  }
  await db.profileSubscription.updateMany({ where: { status: 'PENDING', providerCheckoutId: null, providerSubscriptionId: null,
    createdAt: { lt: new Date(now.getTime() - BILLING_CHECKOUT_WINDOW_MS) }, operations: { none: { state: { in: ['PENDING','PROCESSING'] } } },
  }, data: { status: 'EXPIRED', checkoutUrl: null, version: { increment: 1 } } })
}
