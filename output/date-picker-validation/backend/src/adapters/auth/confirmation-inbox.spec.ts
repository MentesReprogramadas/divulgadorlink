import { afterEach, describe, expect, it } from 'vitest'
import { app } from '@/app'
import {
  confirmationInboxEnabled,
  resetConfirmationInboxForTest,
  stashConfirmation,
} from '@/adapters/auth/confirmation-inbox'
import { setTenantsRepositoryForTest } from '@/http/tenant'
import { InMemoryTenantsRepository } from '@/repositories/tenants-repository'

function token(sub: string) {
  return app.jwt.sign({ sub, role: 'USER', tenantId: 'seed-temlinkaqui', typ: 'access' }, { expiresIn: '5m' })
}

describe('caixa de confirmação de teste', () => {
  afterEach(() => {
    delete process.env.CONFIRMATION_INBOX
    resetConfirmationInboxForTest()
  })

  it('nunca liga em produção, mesmo com a flag', () => {
    expect(confirmationInboxEnabled({ CONFIRMATION_INBOX: '1', NODE_ENV: 'production' })).toBe(false)
    expect(confirmationInboxEnabled({ NODE_ENV: 'dev' })).toBe(false)
    expect(confirmationInboxEnabled({ CONFIRMATION_INBOX: '1', NODE_ENV: 'dev' })).toBe(true)
  })

  it('sem a flag o endpoint não existe e nada é guardado', async () => {
    await app.ready()
    setTenantsRepositoryForTest(new InMemoryTenantsRepository([{ id: 'seed-temlinkaqui', host: 'temlinkaqui.com', name: 'T' }]))
    stashConfirmation('ana', 'PHONE', '123456')
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/confirmation-inbox?kind=PHONE',
      headers: { host: 'temlinkaqui.com', authorization: `Bearer ${token('ana')}` },
    })
    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('123456')
  })

  it('com a flag só devolve o código do próprio usuário autenticado', async () => {
    process.env.CONFIRMATION_INBOX = '1'
    await app.ready()
    stashConfirmation('ana', 'PHONE', '654321')
    const own = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/confirmation-inbox?kind=PHONE',
      headers: { host: 'temlinkaqui.com', authorization: `Bearer ${token('ana')}` },
    })
    const other = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/confirmation-inbox?kind=PHONE',
      headers: { host: 'temlinkaqui.com', authorization: `Bearer ${token('bia')}` },
    })
    const anonymous = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/confirmation-inbox?kind=PHONE',
      headers: { host: 'temlinkaqui.com' },
    })
    expect(own.json()).toEqual({ code: '654321' })
    expect(other.statusCode).toBe(404)
    expect(anonymous.statusCode).toBe(401)
  })
})
