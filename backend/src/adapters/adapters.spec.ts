import { describe, expect, it, vi } from 'vitest'
import { OpenAiEmbeddingService } from './embeddings/openai-embedding-service'
import { StripeCardPaymentGateway } from './payments/stripe-card-payment-gateway'
import { WooviPixPaymentGateway } from './payments/woovi-pix-payment-gateway'
import { BullRefundScheduler } from './queues/bull-refund-scheduler'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

describe('adapters', () => {
  it('Woovi cria Pix, lê cobrança paga e estorna com o correlationID recebido', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        charge: { correlationID: 'order-1', brCode: '000201', expiresDate: '2026-09-29T15:30:00.000Z' },
      }))
      .mockResolvedValueOnce(jsonResponse({ charge: { status: 'COMPLETED' } }))
      .mockResolvedValueOnce(jsonResponse({
        refund: { correlationID: 'refund-order-1', status: 'IN_PROCESSING' },
      }))

    const gateway = new WooviPixPaymentGateway('app-id', 'https://api.openpix.com.br', fetchImpl)

    const charge = await gateway.createCharge({
      orderId: 'order-1',
      amountCents: 1990,
      expiresInSeconds: 1800,
    })
    const snapshot = await gateway.getCharge('order-1')
    const refund = await gateway.refund({
      gatewayChargeId: 'order-1',
      correlationId: 'refund-order-1',
      amountCents: 1990,
    })

    expect(charge.brCode).toBe('000201')
    expect(snapshot.status).toBe('PAID')
    expect(refund.status).toBe('PROCESSING')
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      'https://api.openpix.com.br/api/v1/charge/order-1/refund',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          correlationID: 'refund-order-1',
          value: 1990,
          comment: 'Pix pago após o prazo',
        }),
      }),
    )
  })

  it('Stripe confirma cartão pago e usa a chave de idempotência no estorno', async () => {
    const createRefund = vi.fn().mockResolvedValue({ id: 're_1', status: 'succeeded' })
    const gateway = new StripeCardPaymentGateway({
      paymentIntents: {
        create: vi.fn().mockResolvedValue({ id: 'pi_1', client_secret: 'secret', status: 'requires_payment_method' }),
        retrieve: vi.fn().mockResolvedValue({ status: 'succeeded' }),
      },
      refunds: { create: createRefund },
    })

    const charge = await gateway.createCharge({ orderId: 'order-1', amountCents: 4990 })
    const snapshot = await gateway.getCharge('pi_1')
    const refund = await gateway.refund({
      gatewayChargeId: 'pi_1',
      correlationId: 'refund-order-1',
      amountCents: 4990,
    })

    expect(charge.clientSecret).toBe('secret')
    expect(snapshot.status).toBe('PAID')
    expect(refund.status).toBe('CONFIRMED')
    expect(createRefund).toHaveBeenCalledWith(
      { payment_intent: 'pi_1', amount: 4990 },
      { idempotencyKey: 'refund-order-1' },
    )
  })

  it('OpenAI pede text-embedding-3-large com 1536 dimensões', async () => {
    const vector = Array.from({ length: 1536 }, () => 0.1)
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [{ embedding: vector }] }))
    const service = new OpenAiEmbeddingService('sk-test', fetchImpl)

    const result = await service.embed('nome\ndescrição')

    expect(result).toHaveLength(1536)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: 'nome\ndescrição',
          dimensions: 1536,
        }),
      }),
    )
  })

  it('rejeita vetor com dimensão diferente de 1536', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [{ embedding: [1, 2, 3] }] }))
    const service = new OpenAiEmbeddingService('sk-test', fetchImpl)

    await expect(service.embed('texto')).rejects.toThrow(/dimensão/)
  })

  it('Woovi aborta estorno sem resposta e não reporta sucesso', async () => {
    const fetchImpl = ((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    })) as typeof fetch
    const gateway = new WooviPixPaymentGateway('app-id', 'https://api.openpix.com.br', fetchImpl, () => new Date(), 20)
    await expect(gateway.refund({ gatewayChargeId: 'order-1', correlationId: 'refund-order-1', amountCents: 1 }))
      .rejects.toThrow(/timeout|aborted/i)
    const failing = new WooviPixPaymentGateway('app-id', 'https://api.openpix.com.br', vi.fn().mockResolvedValue(jsonResponse({}, false, 500)))
    await expect(failing.refund({ gatewayChargeId: 'order-1', correlationId: 'refund-order-1', amountCents: 1 }))
      .rejects.toThrow('500')
  })

  it('embedding aborta quando o provedor não responde no prazo', async () => {
    const fetchImpl = ((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    })) as typeof fetch
    const service = new OpenAiEmbeddingService('sk-test', fetchImpl, undefined, undefined, 20)
    await expect(service.embed('texto')).rejects.toThrow(/timeout|aborted/i)
  })

  it('Woovi e Stripe sem credencial falham explicitamente sem chamar o provedor', async () => {
    const fetchImpl = vi.fn()
    const pix = new WooviPixPaymentGateway('', 'http://woovi', fetchImpl as unknown as typeof fetch)
    await expect(pix.createCharge({ orderId: 'o1', amountCents: 100, expiresInSeconds: 60 }))
      .rejects.toThrow('WOOVI_APP_ID ausente.')
    await expect(pix.getCharge('o1')).rejects.toThrow('WOOVI_APP_ID ausente.')
    expect(fetchImpl).not.toHaveBeenCalled()

    const card = new StripeCardPaymentGateway(null)
    await expect(card.createCharge({ orderId: 'o1', amountCents: 100 })).rejects.toThrow('STRIPE_SECRET_KEY ausente.')
    await expect(card.refund({ gatewayChargeId: 'pi', amountCents: 100, correlationId: 'r' }))
      .rejects.toThrow('STRIPE_SECRET_KEY ausente.')
  })

  it('embedding sem chave falha explicitamente e não chama o provedor', async () => {
    const fetchImpl = vi.fn()
    const service = new OpenAiEmbeddingService('', fetchImpl as unknown as typeof fetch)
    await expect(service.embed('texto')).rejects.toThrow('OPENAI_API_KEY ausente.')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('agenda o estorno no BullMQ sem cron', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    const scheduler = new BullRefundScheduler({ add })

    await scheduler.scheduleRetry('order-1')

    expect(add).toHaveBeenCalledWith(
      'refund-pix',
      { orderId: 'order-1' },
      expect.objectContaining({ delay: 60_000, attempts: 1, jobId: 'refund-order-1-1' }),
    )
  })
})
