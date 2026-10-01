import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import { resetLoginAttemptsForTest } from '@/http/controllers/@auth/routes'

describe('segurança', () => {
  beforeEach(() => {
    resetLoginAttemptsForTest()
  })

  it('rota privada sem JWT responde 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/links',
      headers: { host: 'temlinkaqui.com' },
      payload: {},
    })
    expect(response.statusCode).toBe(401)
  })

  it('não redireciona /go para um host da query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/go/link-publicado?to=https://evil.example',
      headers: { host: 'temlinkaqui.com' },
    })
    expect(response.headers.location ?? '').not.toContain('evil.example')
  })

  it('webhook sem assinatura não muda o pedido', async () => {
    const webhook = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/stripe/webhook',
      headers: { host: 'temlinkaqui.com' },
      payload: { type: 'payment_intent.succeeded' },
    })
    expect(webhook.statusCode).toBe(400)
  })

  it('não estoura a página', async () => {
    const huge = await app.inject({
      method: 'POST',
      url: '/api/v1/links',
      headers: { host: 'temlinkaqui.com', authorization: 'Bearer token-da-bia' },
      payload: { url: 'https://t.me/x', name: 'n'.repeat(2_000_000), description: 'x', networkId: 'telegram', nicheId: 'jogos' },
    })
    expect(huge.statusCode).toBe(413)
  })

  it('o sexto login na janela responde 429', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { host: 'temlinkaqui.com' },
        payload: { email: 'bia@example.com', password: 'senha-forte-1' },
      })
      statuses.push(response.statusCode)
    }
    expect(statuses.slice(0, 5)).not.toContain(429)
    expect(statuses[5]).toBe(429)
  }, 30_000)
})
