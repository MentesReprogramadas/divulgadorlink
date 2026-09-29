import { describe, expect, it } from 'vitest'
import { openPixHmac, openPixSignatureMatches } from '@/adapters/payments/woovi-webhook-signature'

describe('assinatura OpenPix', () => {
  it('confere o HMAC-SHA1 em base64 do corpo cru', () => {
    const body = '{"event":"OPENPIX:CHARGE_COMPLETED"}'
    const secret = 'hmac-secret-key'
    const header = openPixHmac(body, secret)
    expect(openPixSignatureMatches(body, header, secret)).toBe(true)
    expect(openPixSignatureMatches(body, 'outra', secret)).toBe(false)
    expect(openPixSignatureMatches(`${body} `, header, secret)).toBe(false)
  })
})
