import type { ProfileSaleReadiness } from './profile-plans'

export class BillingProviderError extends Error {
  constructor(public readonly code: 'UNAVAILABLE' | 'UNSUPPORTED' | 'SIGNATURE') { super('Serviço de assinatura indisponível.') }
}

export type BillingPrice = { id: string; productId: string; productName: string; active: boolean; amountCents: number | null; currency: string; interval: string | null; intervalCount: number | null; usageType: string | null; livemode: boolean }
export type BillingSubscriptionSnapshot = {
  id: string; customerId: string; priceId: string; status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'EXPIRED'
  periodStart: Date | null; periodEnd: Date | null; paidThrough: Date | null
  cancelAtPeriodEnd: boolean; scheduleId: string | null; nextPriceId: string | null; livemode: boolean
}
export type BillingEventReference = { id: string; kind: string; createdAt: Date; customerId: string; objectId: string; objectType: 'subscription' | 'invoice' | 'checkout'; livemode: boolean }
export type BillingCheckoutSnapshot = { id: string; customerId: string; subscriptionId: string | null; status: 'OPEN' | 'COMPLETE' | 'EXPIRED'; expiresAt: Date; livemode: boolean }
/** Separate from PaymentGateway: this port never creates an avulso Order or Promotion. */
export interface BillingGateway {
  readonly livemode: boolean
  price(id: string): Promise<BillingPrice>
  createCustomer(idempotencyKey: string): Promise<string>
  createCheckout(input: { customerId: string; priceId: string; referenceId: string; successUrl: string; cancelUrl: string; idempotencyKey: string; expiresAt: Date }): Promise<{ id: string; url: string; expiresAt: Date }>
  checkout(checkoutId: string): Promise<BillingCheckoutSnapshot>
  expireCheckout(checkoutId: string, idempotencyKey: string): Promise<void>
  subscription(id: string): Promise<BillingSubscriptionSnapshot>
  subscriptionFromEvent(reference: BillingEventReference): Promise<BillingSubscriptionSnapshot | null>
  resolveEventSubscription(reference: BillingEventReference): Promise<string | null>
  checkoutForSubscription(subscriptionId: string): Promise<{ id: string; customerId: string } | null>
  cancelAtPeriodEnd(subscriptionId: string, idempotencyKey: string): Promise<void>
  cancelUnpaid(subscriptionId: string, idempotencyKey: string): Promise<void>
  changeAtPeriodEnd(input: { subscriptionId: string; currentPriceId: string; nextPriceId: string; expectedPeriodEnd: Date; idempotencyKey: string }): Promise<void>
  verifyEvent(payload: Buffer, signature: string): BillingEventReference | null
}
export type BillingReadiness = ProfileSaleReadiness
