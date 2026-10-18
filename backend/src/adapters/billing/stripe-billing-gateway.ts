import { createHash } from 'node:crypto'
import Stripe from 'stripe-billing'
import { z } from 'zod'
import { hostedBillingUrl } from '@/domain/billing/profile-plans'
import { BillingProviderError } from '@/domain/billing/billing-gateway'
import type { BillingCheckoutSnapshot, BillingEventReference, BillingGateway, BillingSubscriptionSnapshot } from '@/domain/billing/billing-gateway'

const referenceId = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_]+$/)
const eventShape = z.object({ id: referenceId, type: z.string().max(120), created: z.number().int().positive(), livemode: z.boolean(), data: z.object({ object: z.object({ id: referenceId, customer: z.union([referenceId, z.object({ id: referenceId })]) }) }) })
const id = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id ?? ''
const stamp = (seconds: number) => new Date(seconds * 1000)

export class StripeBillingGateway implements BillingGateway {
  constructor(private client: Stripe.Stripe, private webhookSecret: string, public readonly livemode: boolean) {}
  private async safe<T>(work: () => Promise<T>): Promise<T> {
    try { return await work() } catch (error) { if (error instanceof BillingProviderError) throw error; throw new BillingProviderError('UNAVAILABLE') }
  }
  async price(priceId: string) {
    return this.safe(async () => {
      const price = await this.client.prices.retrieve(priceId, { expand: ['product'] })
      const product = typeof price.product === 'string' ? await this.client.products.retrieve(price.product) : price.product
      const deleted = 'deleted' in product && product.deleted
      return { id: price.id, productId: id(product), productName: deleted ? '' : product.name, active: price.active && !deleted && product.active, amountCents: price.unit_amount, currency: price.currency.toUpperCase(), interval: price.recurring?.interval ?? null, intervalCount: price.recurring?.interval_count ?? null, usageType: price.recurring?.usage_type ?? null, livemode: price.livemode }
    })
  }
  async createCustomer(idempotencyKey: string) {
    return this.safe(async () => {
      const customer = await this.client.customers.create({}, { idempotencyKey })
      if (customer.livemode !== this.livemode) throw new BillingProviderError('UNSUPPORTED')
      return customer.id
    })
  }
  async createCheckout(input: Parameters<BillingGateway['createCheckout']>[0]) {
    return this.safe(async () => {
      const suffix = [...createHash('sha256').update(input.idempotencyKey).digest().subarray(0, 8)].map(value => String.fromCharCode(97 + value % 26)).join('')
      const session = await this.client.checkout.sessions.create({ mode: 'subscription', customer: input.customerId, client_reference_id: input.referenceId,
        line_items: [{ price: input.priceId, quantity: 1 }], success_url: input.successUrl, cancel_url: input.cancelUrl,
        integration_identifier: 'temlink-profile-' + suffix, expires_at: Math.floor(input.expiresAt.getTime() / 1000),
      }, { idempotencyKey: input.idempotencyKey })
      if (!session.url || id(session.customer) !== input.customerId || session.mode !== 'subscription' || session.livemode !== this.livemode) throw new BillingProviderError('UNSUPPORTED')
      return { id: session.id, url: hostedBillingUrl(session.url), expiresAt: stamp(session.expires_at) }
    })
  }
  async subscription(subscriptionId: string): Promise<BillingSubscriptionSnapshot> {
    return this.safe(async () => {
      const subscription = await this.client.subscriptions.retrieve(subscriptionId)
      if (subscription.items.has_more || subscription.items.data.length !== 1 || subscription.livemode !== this.livemode) throw new BillingProviderError('UNSUPPORTED')
      const item = subscription.items.data[0]!
      if (item.quantity !== 1) throw new BillingProviderError('UNSUPPORTED')
      const customerId = id(subscription.customer), priceId = item.price.id
      if (!customerId || !Number.isFinite(item.current_period_start) || !Number.isFinite(item.current_period_end) || item.current_period_end <= item.current_period_start) throw new BillingProviderError('UNSUPPORTED')
      // A status or browser redirect alone is not evidence that the current period was paid.
      const invoices = await this.client.invoices.list({ subscription: subscriptionId, status: 'paid', limit: 5 })
      let paidThrough: Date | null = null
      for (const invoice of invoices.data) {
        if (invoice.status !== 'paid' || invoice.livemode !== this.livemode || id(invoice.customer) !== customerId || id(invoice.parent?.subscription_details?.subscription) !== subscriptionId) continue
        const lines: Stripe.InvoiceLineItem[] = []
        if (invoice.lines.has_more) {
          for await (const line of this.client.invoices.listLineItems(invoice.id!, { limit: 100 })) { lines.push(line); if (lines.length > 100) throw new BillingProviderError('UNSUPPORTED') }
        } else lines.push(...invoice.lines.data)
        for (const line of lines) {
          const origin = line.parent?.subscription_item_details?.subscription ?? id(line.subscription)
          if (origin !== subscriptionId || id(line.pricing?.price_details?.price) !== priceId || line.parent?.subscription_item_details?.proration === true || !Number.isFinite(line.period.end)) continue
          const end = stamp(line.period.end)
          if (!paidThrough || end > paidThrough) paidThrough = end
        }
      }
      const scheduleId = id(subscription.schedule) || null
      let nextPriceId: string | null = null
      if (scheduleId) {
        const schedule = await this.client.subscriptionSchedules.retrieve(scheduleId)
        if (id(schedule.subscription) !== subscriptionId || id(schedule.customer) !== customerId) throw new BillingProviderError('UNSUPPORTED')
        const next = schedule.phases.find(phase => phase.start_date >= item.current_period_end)
        if (next && next.items.length === 1) nextPriceId = id(next.items[0]!.price) || null
      }
      const status: BillingSubscriptionSnapshot['status'] = subscription.status === 'active' ? 'ACTIVE' : subscription.status === 'past_due' ? 'PAST_DUE' : subscription.status === 'canceled' ? 'CANCELED' : subscription.status === 'unpaid' ? 'UNPAID' : subscription.status === 'incomplete_expired' ? 'EXPIRED' : 'INCOMPLETE'
      return { id: subscription.id, customerId, priceId, status, periodStart: stamp(item.current_period_start), periodEnd: stamp(item.current_period_end), paidThrough, cancelAtPeriodEnd: subscription.cancel_at_period_end, scheduleId, nextPriceId, livemode: subscription.livemode }
    })
  }
  async checkout(checkoutId: string): Promise<BillingCheckoutSnapshot> {
    return this.safe(async () => {
      const session = await this.client.checkout.sessions.retrieve(checkoutId)
      const status = session.status === 'open' ? 'OPEN' : session.status === 'complete' ? 'COMPLETE' : session.status === 'expired' ? 'EXPIRED' : null
      if (!status || session.mode !== 'subscription' || session.livemode !== this.livemode || !id(session.customer)) throw new BillingProviderError('UNSUPPORTED')
      return { id: session.id, customerId: id(session.customer), subscriptionId: id(session.subscription) || null, status, expiresAt: stamp(session.expires_at), livemode: session.livemode }
    })
  }
  async expireCheckout(checkoutId: string, idempotencyKey: string) {
    return this.safe(async () => { await this.client.checkout.sessions.expire(checkoutId, {}, { idempotencyKey }) })
  }
  async subscriptionFromEvent(reference: BillingEventReference) {
    const subscriptionId = await this.resolveEventSubscription(reference)
    if (!subscriptionId) return null
    const snapshot = await this.subscription(subscriptionId)
    if (snapshot.customerId !== reference.customerId) throw new BillingProviderError('UNSUPPORTED')
    return snapshot
  }
  async resolveEventSubscription(reference: BillingEventReference) {
    return this.safe(async () => {
      let subscriptionId: string
      if (reference.objectType === 'subscription') subscriptionId = reference.objectId
      else if (reference.objectType === 'invoice') {
        const invoice = await this.client.invoices.retrieve(reference.objectId)
        if (id(invoice.customer) !== reference.customerId || invoice.livemode !== reference.livemode) throw new BillingProviderError('UNSUPPORTED')
        subscriptionId = id(invoice.parent?.subscription_details?.subscription)
      } else {
        const session = await this.client.checkout.sessions.retrieve(reference.objectId)
        if (id(session.customer) !== reference.customerId || session.livemode !== reference.livemode || session.mode !== 'subscription') throw new BillingProviderError('UNSUPPORTED')
        subscriptionId = id(session.subscription)
      }
      return subscriptionId || null
    })
  }
  async checkoutForSubscription(subscriptionId: string) {
    return this.safe(async () => {
      const rows = await this.client.checkout.sessions.list({ subscription: subscriptionId, limit: 2 })
      const session = rows.data.find(row => row.mode === 'subscription' && id(row.subscription) === subscriptionId && row.livemode === this.livemode)
      return session ? { id: session.id, customerId: id(session.customer) } : null
    })
  }
  async cancelAtPeriodEnd(subscriptionId: string, idempotencyKey: string) {
    return this.safe(async () => {
      const subscription = await this.client.subscriptions.retrieve(subscriptionId)
      const schedule = id(subscription.schedule)
      if (schedule) await this.client.subscriptionSchedules.release(schedule, { preserve_cancel_date: true }, { idempotencyKey: idempotencyKey + '-release' })
      await this.client.subscriptions.update(subscriptionId, { cancel_at_period_end: true, proration_behavior: 'none' }, { idempotencyKey })
    })
  }
  async cancelUnpaid(subscriptionId: string, idempotencyKey: string) {
    return this.safe(async () => { await this.client.subscriptions.cancel(subscriptionId, { invoice_now: false, prorate: false }, { idempotencyKey }) })
  }
  async changeAtPeriodEnd(input: Parameters<BillingGateway['changeAtPeriodEnd']>[0]) {
    return this.safe(async () => {
      const subscription = await this.client.subscriptions.retrieve(input.subscriptionId)
      const item = subscription.items.data[0]
      if (subscription.status !== 'active' || subscription.collection_method !== 'charge_automatically' || subscription.cancel_at_period_end || subscription.items.has_more || subscription.items.data.length !== 1 || !item || item.quantity !== 1 || item.price.id !== input.currentPriceId || subscription.discounts.length || subscription.automatic_tax.enabled || subscription.default_tax_rates?.length || subscription.billing_thresholds || subscription.pause_collection) throw new BillingProviderError('UNSUPPORTED')
      if (item.current_period_end * 1000 !== input.expectedPeriodEnd.getTime()) throw new BillingProviderError('UNSUPPORTED')
      const previousSchedule = id(subscription.schedule)
      const schedule = previousSchedule ? await this.client.subscriptionSchedules.retrieve(previousSchedule) : await this.client.subscriptionSchedules.create({ from_subscription: subscription.id }, { idempotencyKey: input.idempotencyKey + '-schedule' })
      if (schedule.current_phase?.end_date !== item.current_period_end) {
        if (!previousSchedule) await this.client.subscriptionSchedules.release(schedule.id, { preserve_cancel_date: true }, { idempotencyKey: input.idempotencyKey + '-release-stale' })
        throw new BillingProviderError('UNSUPPORTED')
      }
      await this.client.subscriptionSchedules.update(schedule.id, { end_behavior: 'release', proration_behavior: 'none', phases: [
        { start_date: item.current_period_start, end_date: item.current_period_end, items: [{ price: input.currentPriceId, quantity: 1 }], proration_behavior: 'none' },
        { start_date: item.current_period_end, duration: { interval: 'month', interval_count: 1 }, items: [{ price: input.nextPriceId, quantity: 1 }], proration_behavior: 'none' },
      ] }, { idempotencyKey: input.idempotencyKey })
    })
  }
  verifyEvent(payload: Buffer, signature: string): BillingEventReference | null {
    try {
      if (!this.webhookSecret) throw new BillingProviderError('SIGNATURE')
      const event = this.client.webhooks.constructEvent(payload, signature, this.webhookSecret)
      const kind = event.type
      const objectType = kind.startsWith('customer.subscription.') ? 'subscription' : ['invoice.paid','invoice.payment_failed','invoice.voided','invoice.marked_uncollectible'].includes(kind) ? 'invoice' : ['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired'].includes(kind) ? 'checkout' : null
      if (!objectType) return null
      const parsed = eventShape.parse(event)
      if (!parsed.id.startsWith('evt_') || parsed.livemode !== this.livemode) throw new BillingProviderError('SIGNATURE')
      return { id: parsed.id, kind, objectId: parsed.data.object.id, customerId: id(parsed.data.object.customer), objectType, livemode: parsed.livemode, createdAt: stamp(parsed.created) }
    } catch { throw new BillingProviderError('SIGNATURE') }
  }
}
