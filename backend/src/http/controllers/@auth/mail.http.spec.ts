import { hash } from 'bcryptjs'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readOutbound, resetOutboundForTest } from '@/adapters/notifications/outbound-mail'
import { app } from '@/app'
import { resetLoginAttemptsForTest } from '@/http/controllers/@auth/routes'
import { resetAccountDeletionForTest, testAccountDeletion } from '@/use-cases/@Auth/delete-account'
import { resetPasswordResetForTest, testPasswordAccounts } from '@/use-cases/@Auth/password-reset'

const HOST = 'temlinkaqui.com'

describe('e-mail HTTP', () => {
  beforeAll(async () => {
    await app.ready()
  })

  beforeEach(() => {
    resetLoginAttemptsForTest()
    resetPasswordResetForTest()
    resetAccountDeletionForTest()
    resetOutboundForTest()
    process.env.EMAIL_OUTBOX = '1'
  })

  afterEach(() => {
    delete process.env.EMAIL_OUTBOX
    resetOutboundForTest()
  })

  function token(sub: string) {
    return app.jwt.sign({ sub, role: 'USER', tenantId: 'seed-temlinkaqui', typ: 'access' }, { expiresIn: '5m' })
  }

  it('pedido de senha não revela conta e o link troca a senha uma vez', async () => {
    testPasswordAccounts().users.set('ana', {
      tenantId: 'seed-temlinkaqui',
      email: 'ana@example.com',
      passwordHash: 'antiga',
    })

    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      headers: { host: HOST },
      payload: { email: 'ninguem@example.com' },
    })
    expect(missing.statusCode).toBe(200)
    expect(missing.json()).toEqual({ ok: true })
    expect(readOutbound('ninguem@example.com')).toEqual([])

    const sent = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      headers: { host: HOST },
      payload: { email: 'ana@example.com' },
    })
    expect(sent.statusCode).toBe(200)
    const email = readOutbound('ana@example.com')[0]
    expect(email?.kind).toBe('password_reset')
    const tokenValue = email?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1]
    expect(tokenValue).toBeTruthy()

    const reset = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      headers: { host: HOST },
      payload: { token: tokenValue, password: 'senha-nova-1' },
    })
    expect(reset.statusCode).toBe(200)
    expect(testPasswordAccounts().users.get('ana')?.passwordHash).not.toBe('antiga')

    const again = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      headers: { host: HOST },
      payload: { token: tokenValue, password: 'senha-nova-2' },
    })
    expect(again.statusCode).toBe(400)
  })

  it('caixa de e-mail fica fechada sem a flag', async () => {
    delete process.env.EMAIL_OUTBOX
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/email-outbox?to=ana@example.com',
      headers: { host: HOST },
    })
    expect(response.statusCode).toBe(404)
  })

  it('excluir a conta exige a senha, avisa e encerra a sessão', async () => {
    testAccountDeletion().users.set('ana', {
      id: 'ana',
      tenantId: 'seed-temlinkaqui',
      name: 'Ana',
      passwordHash: await hash('senha-forte-1', 4),
      email: 'ana@example.com',
      wiped: false,
    })

    const wrong = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/account/delete',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}` },
      payload: { password: 'senha-errada' },
    })
    expect(wrong.statusCode).toBe(401)
    expect(testAccountDeletion().users.get('ana')?.email).toBe('ana@example.com')

    const deleted = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/account/delete',
      headers: { host: HOST, authorization: `Bearer ${token('ana')}` },
      payload: { password: 'senha-forte-1' },
    })
    expect(deleted.statusCode).toBe(200)
    const rawCookie = deleted.headers['set-cookie']
    const cookies = Array.isArray(rawCookie) ? rawCookie.join(';') : String(rawCookie ?? '')
    expect(cookies).toContain('accessToken=')
    expect(testAccountDeletion().users.get('ana')).toMatchObject({ name: 'Conta excluída', email: null, wiped: true })
    expect(readOutbound('ana@example.com')[0]?.kind).toBe('account_deleted')
    expect(readOutbound('ana@example.com')[0]?.text).toContain('Ana')
  })
})
