import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@/app'

describe('F42 webhook fechado por padrão', () => {
  beforeAll(async () => { await app.ready() })
  it('F42-T06 payload plausível não autentica webhook', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/integrations/evolution/webhook', payload: { instance: 'Test bot', event: 'MESSAGES_UPSERT' } })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ accepted: false })
  })
  it('F42-T22 GET nunca aprova e admin sem sessão é negado', async () => {
    expect((await app.inject({ url: '/api/v1/integrations/evolution/webhook' })).statusCode).toBe(404)
    expect((await app.inject({ url: '/api/v1/admin/integrations/evolution/status' })).statusCode).toBe(401)
  })
})
