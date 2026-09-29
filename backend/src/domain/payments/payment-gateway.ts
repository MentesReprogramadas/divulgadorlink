import type { PaymentMethod } from './order'

export interface GatewayChargeSnapshot {
  status: 'PENDING' | 'PAID' | 'EXPIRED'
  paidAt: Date | null
}

export interface RefundInput {
  gatewayChargeId: string
  correlationId: string
  amountCents: number
}

export interface RefundResult {
  refundId: string
  status: 'PROCESSING' | 'CONFIRMED' | 'FAILED'
}

export interface PaymentGateway {
  readonly method: PaymentMethod
  getCharge(gatewayChargeId: string): Promise<GatewayChargeSnapshot>
  refund(input: RefundInput): Promise<RefundResult>
}

export interface CreatePixChargeInput {
  orderId: string
  amountCents: number
  expiresInSeconds: number
}

export interface PixCharge {
  gatewayChargeId: string
  brCode: string
  expiresAt: Date
}

export interface PixPaymentGateway extends PaymentGateway {
  createCharge(input: CreatePixChargeInput): Promise<PixCharge>
}

export interface CreateCardChargeInput {
  orderId: string
  amountCents: number
}

export interface CardCharge {
  gatewayChargeId: string
  clientSecret: string
}

export interface CardPaymentGateway extends PaymentGateway {
  createCharge(input: CreateCardChargeInput): Promise<CardCharge>
}
