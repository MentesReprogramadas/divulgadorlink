import { randomUUID } from 'node:crypto'
import { BillingProviderError, type BillingCheckoutSnapshot, type BillingEventReference, type BillingGateway, type BillingPrice, type BillingSubscriptionSnapshot } from '@/domain/billing/billing-gateway'

/** External-provider test double. It never changes application subscriptions or entitlements. */
export class MemoryBillingGateway implements BillingGateway {
  readonly livemode = false
  readonly prices = new Map<string, BillingPrice>()
  readonly subscriptions = new Map<string, BillingSubscriptionSnapshot>()
  readonly checkouts = new Map<string, BillingCheckoutSnapshot & { priceId: string }>()
  readonly invoices = new Map<string, { subscriptionId: string; customerId: string }>()
  readonly customers = new Map<string, string>()
  readonly checkoutKeys = new Map<string, { id: string; fingerprint: string }>()
  readonly calls: Array<{ method: string; id?: string; key?: string }> = []

  async price(id: string) {
    this.calls.push({ method: 'price', id })
    const row = this.prices.get(id)
    if (!row) throw new BillingProviderError('UNSUPPORTED')
    return structuredClone(row)
  }
  async createCustomer(key: string) {
    this.calls.push({ method: 'customer', key })
    if (!this.customers.has(key)) this.customers.set(key, 'cus_' + randomUUID().replaceAll('-',''))
    return this.customers.get(key)!
  }
  async createCheckout(input: Parameters<BillingGateway['createCheckout']>[0]) {
    this.calls.push({ method: 'checkout', key: input.idempotencyKey })
    const fingerprint = JSON.stringify(input), existing = this.checkoutKeys.get(input.idempotencyKey)
    if (existing && existing.fingerprint !== fingerprint) throw new BillingProviderError('UNSUPPORTED')
    const id = existing?.id ?? 'cs_test_' + randomUUID().replaceAll('-','')
    if (!existing) {
      this.checkoutKeys.set(input.idempotencyKey, { id, fingerprint })
      this.checkouts.set(id, { id, customerId: input.customerId, subscriptionId: null, status: 'OPEN', expiresAt: input.expiresAt, livemode: false, priceId: input.priceId })
    }
    return { id, url: 'https://checkout.stripe.com/c/pay/' + id, expiresAt: this.checkouts.get(id)!.expiresAt }
  }
  async checkout(id: string) {
    this.calls.push({ method: 'checkout.get', id })
    const row = this.checkouts.get(id)
    if (!row) throw new BillingProviderError('UNSUPPORTED')
    return structuredClone(row)
  }
  async expireCheckout(id: string, key: string) {
    this.calls.push({ method: 'checkout.expire', id, key })
    const row = this.checkouts.get(id)
    if (!row || row.status === 'COMPLETE') throw new BillingProviderError('UNSUPPORTED')
    row.status = 'EXPIRED'
  }
  async subscription(id: string) {
    this.calls.push({ method: 'subscription', id })
    const row = this.subscriptions.get(id)
    if (!row) throw new BillingProviderError('UNSUPPORTED')
    return structuredClone(row)
  }
  async resolveEventSubscription(reference: BillingEventReference) {
    if (reference.objectType === 'subscription') return reference.objectId
    if (reference.objectType === 'checkout') {
      const row = this.checkouts.get(reference.objectId)
      if (!row || row.customerId !== reference.customerId) throw new BillingProviderError('UNSUPPORTED')
      return row.subscriptionId
    }
    const row = this.invoices.get(reference.objectId)
    if (!row || row.customerId !== reference.customerId) throw new BillingProviderError('UNSUPPORTED')
    return row.subscriptionId
  }
  async subscriptionFromEvent(reference: BillingEventReference) {
    const id = await this.resolveEventSubscription(reference)
    return id ? this.subscription(id) : null
  }
  async checkoutForSubscription(id: string) {
    const row = [...this.checkouts.values()].find(row => row.subscriptionId === id)
    return row ? { id: row.id, customerId: row.customerId } : null
  }
  async cancelAtPeriodEnd(id: string, key: string) {
    this.calls.push({ method: 'cancel.end', id, key })
    const row = this.subscriptions.get(id)
    if (!row) throw new BillingProviderError('UNSUPPORTED')
    row.cancelAtPeriodEnd = true; row.scheduleId = null; row.nextPriceId = null
  }
  async cancelUnpaid(id: string, key: string) {
    this.calls.push({ method: 'cancel.unpaid', id, key })
    const row = this.subscriptions.get(id)
    if (!row) throw new BillingProviderError('UNSUPPORTED')
    row.status = 'CANCELED'
  }
  async changeAtPeriodEnd(input: Parameters<BillingGateway['changeAtPeriodEnd']>[0]) {
    this.calls.push({ method: 'change.end', id: input.subscriptionId, key: input.idempotencyKey })
    const row = this.subscriptions.get(input.subscriptionId)
    if (!row || row.priceId !== input.currentPriceId || row.periodEnd?.getTime() !== input.expectedPeriodEnd.getTime()) throw new BillingProviderError('UNSUPPORTED')
    row.nextPriceId = input.nextPriceId; row.scheduleId = 'sub_sched_fixture'
  }
  verifyEvent(): never { throw new Error('Use the real SDK contract suite for signature verification') }
  complete(id: string, now: Date, paid = true) {
    const session = this.checkouts.get(id)
    if (!session) throw new Error('Missing fixture Checkout')
    const subscriptionId = 'sub_' + randomUUID().replaceAll('-','')
    const end = new Date(now.getTime() + 30 * 86400000)
    session.status = 'COMPLETE'; session.subscriptionId = subscriptionId
    this.subscriptions.set(subscriptionId, { id: subscriptionId, customerId: session.customerId, priceId: session.priceId,
      status: paid ? 'ACTIVE' : 'INCOMPLETE', periodStart: new Date(now.getTime() - 1000), periodEnd: end, paidThrough: paid ? end : null,
      cancelAtPeriodEnd: false, scheduleId: null, nextPriceId: null, livemode: false,
    })
    return subscriptionId
  }
}
