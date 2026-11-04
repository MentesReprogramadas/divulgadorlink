import type {
  CardCharge,
  CardPaymentGateway,
  GatewayChargeSnapshot,
  RefundInput,
  RefundResult,
} from '@/domain/payments/payment-gateway'

export interface StripeGatewayClient {
  paymentIntents: {
    create(
      params: { amount: number; currency: string; metadata: { orderId: string } },
      options: { idempotencyKey: string },
    ): Promise<{ id: string; client_secret: string | null; status: string }>
    retrieve(id: string): Promise<{ status: string; id?: string; client_secret?: string | null; amount?: number; currency?: string; metadata?: { orderId?: string } }>
  }
  refunds: {
    create(
      params: { payment_intent: string; amount: number },
      options: { idempotencyKey: string },
    ): Promise<{ id: string; status: string }>
  }
}

export class StripeCardPaymentGateway implements CardPaymentGateway {
  readonly method = 'CARD' as const

  constructor(private client: StripeGatewayClient | null) {}

  private get stripe(): StripeGatewayClient {
    if (!this.client) throw new Error('STRIPE_SECRET_KEY ausente.')
    return this.client
  }

  async createCharge(input: { orderId: string; amountCents: number }): Promise<CardCharge> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: 'brl',
        metadata: { orderId: input.orderId },
      },
      { idempotencyKey: `card-${input.orderId}` },
    )

    if (!intent.client_secret) {
      throw new Error('Stripe não devolveu o client secret.')
    }

    return { gatewayChargeId: intent.id, clientSecret: intent.client_secret }
  }

  async resumeCharge(input: { gatewayChargeId: string; orderId: string; amountCents: number }): Promise<string> {
    const intent = await this.stripe.paymentIntents.retrieve(input.gatewayChargeId)
    if (intent.id !== input.gatewayChargeId || intent.metadata?.orderId !== input.orderId || intent.amount !== input.amountCents || intent.currency !== 'brl' || !intent.client_secret || intent.status === 'canceled' || intent.status === 'succeeded') throw new Error('Cobrança não pode ser retomada.')
    return intent.client_secret
  }

  async getCharge(gatewayChargeId: string): Promise<GatewayChargeSnapshot> {
    const intent = await this.stripe.paymentIntents.retrieve(gatewayChargeId)
    if (intent.status === 'succeeded') return { status: 'PAID', paidAt: null }
    if (intent.status === 'canceled') return { status: 'EXPIRED', paidAt: null }
    return { status: 'PENDING', paidAt: null }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create(
      { payment_intent: input.gatewayChargeId, amount: input.amountCents },
      { idempotencyKey: input.correlationId },
    )

    if (refund.status === 'succeeded') {
      return { refundId: refund.id, status: 'CONFIRMED' }
    }
    if (refund.status === 'failed') {
      return { refundId: refund.id, status: 'FAILED' }
    }
    return { refundId: refund.id, status: 'PROCESSING' }
  }
}
