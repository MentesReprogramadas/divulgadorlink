import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@/app'

const payload = {
  sub: 'user-1',
  role: 'USER',
  tenantId: 'tenant-1',
}

describe('verifyJWT', () => {
  beforeAll(async () => {
    await app.ready()
  })

  it('rejeita pedido só com cookie de refresh', async () => {
    const refreshToken = app.jwt.sign({ ...payload, typ: 'refresh' }, { expiresIn: '7d' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/confirm',
      cookies: { refreshToken },
      payload: { kind: 'EMAIL', code: '000001' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('rejeita refresh token no Authorization Bearer', async () => {
    const refreshToken = app.jwt.sign({ ...payload, typ: 'refresh' }, { expiresIn: '7d' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/confirm',
      headers: { authorization: `Bearer ${refreshToken}` },
      payload: { kind: 'EMAIL', code: '000001' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('aceita access token válido no Bearer', async () => {
    const accessToken = app.jwt.sign({ ...payload, typ: 'access' }, { expiresIn: '5m' })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/confirm',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {},
    })

    expect(response.statusCode).toBe(400)
  })
})
