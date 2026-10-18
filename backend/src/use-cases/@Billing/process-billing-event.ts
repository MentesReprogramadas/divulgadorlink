import type { PrismaClient } from '@prisma/client'
import { BillingProviderError, type BillingEventReference } from '@/domain/billing/billing-gateway'
import type { BillingRuntime } from '@/repositories/profile-billing-repository'
import { applyBillingSnapshot, claimBillingEvent, failBillingWork, finishBillingWork, reserveBillingReconciliation, type BillingWork } from '@/repositories/profile-billing-work'

/** A verified event is a durable wake-up signal; the provider's current objects decide access. */
export async function processBillingEvent(db: PrismaClient, runtime: BillingRuntime, clock = () => new Date()) {
  const event = await claimBillingEvent(db, clock())
  if (!event || !event.leaseToken) return false
  const work: BillingWork = { kind: 'EVENT', id: event.id, leaseToken: event.leaseToken }
  try {
    const gateway = runtime.gateway
    if (!gateway) throw new BillingProviderError('UNAVAILABLE')
    const account = await db.profileBillingAccount.findUniqueOrThrow({ where: { id: event.accountId } })
    if (!account.providerCustomerId || gateway.livemode !== event.livemode) throw new BillingProviderError('UNSUPPORTED')
    const objectType = event.objectType
    if (objectType !== 'checkout' && objectType !== 'invoice' && objectType !== 'subscription') throw new BillingProviderError('UNSUPPORTED')
    const reference: BillingEventReference = { id: event.id, customerId: account.providerCustomerId, kind: event.kind, objectId: event.objectId, objectType, livemode: event.livemode, createdAt: event.occurredAt }
    const providerId = await gateway.resolveEventSubscription(reference)
    if (!providerId) {
      if (objectType === 'checkout') {
        const session = await gateway.checkout(event.objectId)
        if (session.customerId !== account.providerCustomerId) throw new BillingProviderError('UNSUPPORTED')
        if (session.status === 'EXPIRED') await db.profileSubscription.updateMany({
          where: { accountId: account.id, providerCheckoutId: session.id, status: 'PENDING', providerSubscriptionId: null },
          data: { status: 'EXPIRED', checkoutUrl: null, version: { increment: 1 } },
        })
      }
      await finishBillingWork(db, work, 'IGNORED', clock())
      return true
    }
    let subscription = await db.profileSubscription.findFirst({ where: { accountId: account.id, providerSubscriptionId: providerId } })
    if (!subscription) {
      const session = await gateway.checkoutForSubscription(providerId)
      if (!session || session.customerId !== account.providerCustomerId) throw new BillingProviderError('UNSUPPORTED')
      subscription = await db.profileSubscription.findFirst({ where: { accountId: account.id, providerCheckoutId: session.id } })
    }
    if (!subscription) {
      await finishBillingWork(db, work, 'IGNORED', clock())
      return true
    }
    const reservation = await reserveBillingReconciliation(db, subscription.id, work)
    if (!reservation) return true
    const snapshot = await gateway.subscription(providerId)
    const applied = await applyBillingSnapshot(db, reservation, snapshot, clock())
    await finishBillingWork(db, work, applied ? 'PROCESSED' : 'SUPERSEDED', clock())
  } catch (error) {
    const provider = error instanceof BillingProviderError
    await failBillingWork(db, work, event.attempts, provider ? error.code : 'STORAGE_FAILURE', !provider || error.code === 'UNAVAILABLE', clock())
  }
  return true
}
