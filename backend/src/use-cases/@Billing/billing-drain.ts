import { profileBillingDb, profileBillingRuntime } from '@/lib/profile-billing'
import { logDomainEvent } from '@/observability/logger'
import { recoverBillingLeases } from '@/repositories/profile-billing-work'
import { queueStaleBillingReconciliations, queueSuspendedBillingCancellations, reconcileExpiredCheckouts } from './billing-lifecycle'
import { processBillingEvent } from './process-billing-event'
import { processBillingOperation } from './process-billing-operation'

/** Separate, bounded drain: provider latency never occupies a payment/moderation consumer. */
export function startProfileBillingDrain() {
  let busy = false
  const tick = async () => {
    if (busy) return
    const runtime = profileBillingRuntime()
    // The sales switch stops purchases, never reconciliation or cancellation.
    if (!runtime.gateway) return
    busy = true
    try {
      const db = profileBillingDb()
      await recoverBillingLeases(db, new Date())
      await queueSuspendedBillingCancellations(db)
      await queueStaleBillingReconciliations(db)
      const started = Date.now()
      for (let index = 0; index < 5; index++) {
        const operation = await processBillingOperation(db, runtime)
        const event = await processBillingEvent(db, runtime)
        if (!operation && !event || Date.now() - started >= 10000) break
      }
      await reconcileExpiredCheckouts(db, runtime)
    } catch {
      logDomainEvent('profile.billing.drain_failed', { result: 'RECONCILIATION_UNAVAILABLE' })
    } finally { busy = false }
  }
  void tick()
  const timer = setInterval(() => { void tick() }, 2000)
  timer.unref()
  return () => clearInterval(timer)
}
