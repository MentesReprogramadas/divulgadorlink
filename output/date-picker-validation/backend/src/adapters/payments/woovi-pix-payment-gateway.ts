import type {
  GatewayChargeSnapshot,
  PixCharge,
  PixPaymentGateway,
  RefundInput,
  RefundResult,
} from '@/domain/payments/payment-gateway'

interface WooviChargeResponse {
  charge?: {
    correlationID?: string
    status?: string
    brCode?: string
    expiresDate?: string
  }
}

interface WooviRefundResponse {
  refund?: {
    correlationID?: string
    status?: string
  }
}

export class WooviPixPaymentGateway implements PixPaymentGateway {
  readonly method = 'PIX' as const

  constructor(
    private appId: string,
    private baseUrl = 'https://api.openpix.com.br',
    private fetchImpl: typeof fetch = fetch,
    private now: () => Date = () => new Date(),
    private timeoutMs = 15_000,
  ) {}

  async createCharge(input: {
    orderId: string
    amountCents: number
    expiresInSeconds: number
  }): Promise<PixCharge> {
    const body = await this.request<WooviChargeResponse>('/api/v1/charge', {
      method: 'POST',
      body: JSON.stringify({
        correlationID: input.orderId,
        value: input.amountCents,
        expiresIn: input.expiresInSeconds,
        comment: 'Destaque de link',
      }),
    })

    const charge = body.charge
    if (!charge?.correlationID || !charge.brCode) {
      throw new Error('Woovi não devolveu a cobrança Pix.')
    }

    return {
      gatewayChargeId: charge.correlationID,
      brCode: charge.brCode,
      expiresAt: charge.expiresDate
        ? new Date(charge.expiresDate)
        : new Date(this.now().getTime() + input.expiresInSeconds * 1000),
    }
  }

  async getCharge(gatewayChargeId: string): Promise<GatewayChargeSnapshot> {
    const body = await this.request<WooviChargeResponse>(
      `/api/v1/charge/${encodeURIComponent(gatewayChargeId)}`,
      { method: 'GET' },
    )
    const status = body.charge?.status

    if (status === 'COMPLETED') return { status: 'PAID', paidAt: this.now() }
    if (status === 'EXPIRED') return { status: 'EXPIRED', paidAt: null }
    return { status: 'PENDING', paidAt: null }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const body = await this.request<WooviRefundResponse>(
      `/api/v1/charge/${encodeURIComponent(input.gatewayChargeId)}/refund`,
      {
        method: 'POST',
        body: JSON.stringify({
          correlationID: input.correlationId,
          value: input.amountCents,
          comment: 'Pix pago após o prazo',
        }),
      },
    )

    const status = body.refund?.status
    return {
      refundId: body.refund?.correlationID ?? input.correlationId,
      status: status === 'CONFIRMED' || status === 'REFUNDED' ? 'CONFIRMED' : 'PROCESSING',
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.appId) throw new Error('WOOVI_APP_ID ausente.')
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        Authorization: this.appId,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })

    if (!response.ok) {
      throw new Error(`Woovi respondeu ${response.status}.`)
    }

    return response.json() as Promise<T>
  }
}
