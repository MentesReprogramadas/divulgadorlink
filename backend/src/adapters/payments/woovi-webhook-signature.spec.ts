import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { signWooviTestBody } from '@/adapters/payments/woovi-test-signing'
import { isWooviRegistrationPing, verifyWooviSignature, WOOVI_PUBLISHED_PUBLIC_KEY } from '@/adapters/payments/woovi-webhook-signature'
import { WOOVI_TEST_PUBLIC_KEY } from '@/adapters/payments/woovi-test-signing'

describe('assinatura Woovi', () => {
  const body = '{"event":"OPENPIX:CHARGE_COMPLETED","correlationID":"order-1"}'

  it('aceita RSA-SHA256 do corpo cru', () => {
    const signature = signWooviTestBody(body)
    expect(verifyWooviSignature(body, signature, WOOVI_TEST_PUBLIC_KEY)).toBe(true)
  })

  it('rejeita corpo alterado, header ausente, assinatura inválida e outra chave', () => {
    const signature = signWooviTestBody(body)
    expect(verifyWooviSignature(`${body} `, signature, WOOVI_TEST_PUBLIC_KEY)).toBe(false)
    expect(verifyWooviSignature(body, undefined, WOOVI_TEST_PUBLIC_KEY)).toBe(false)
    expect(verifyWooviSignature(body, 'nao-e-base64-rsa', WOOVI_TEST_PUBLIC_KEY)).toBe(false)
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' }).toString()
    expect(verifyWooviSignature(body, signature, other)).toBe(false)
    expect(verifyWooviSignature(body, signature, WOOVI_PUBLISHED_PUBLIC_KEY)).toBe(false)
  })

  it('reconhece só o ping de cadastro, sem cobrança', () => {
    const ping = JSON.stringify({
      data_criacao: '2026-10-11T00:53:14.484Z',
      evento: 'teste_webhook',
      event: 'OPENPIX:CHARGE_COMPLETED',
    })
    expect(isWooviRegistrationPing(ping)).toBe(true)
    expect(isWooviRegistrationPing(JSON.stringify({ data_criacao: '2024-01-23T20:32:14.429Z', event: 'OPENPIX:CHARGE_COMPLETED' }))).toBe(true)
    expect(isWooviRegistrationPing(JSON.stringify({ evento: 'teste_webhook', charge: { correlationID: 'order-1' } }))).toBe(false)
    expect(isWooviRegistrationPing(JSON.stringify({ event: 'OPENPIX:CHARGE_COMPLETED', correlationID: 'order-1' }))).toBe(false)
    expect(isWooviRegistrationPing('nao-json')).toBe(false)
  })
})
