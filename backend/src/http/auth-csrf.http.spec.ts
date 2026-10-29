import { beforeAll, describe, expect, it } from 'vitest'
import { app } from '@/app'

beforeAll(async () => { await app.ready() })

describe('recuperação pública do token CSRF', () => {
  it('emite token forte legível sem autenticar, alterar ou limpar os cookies de sessão', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf', cookies: { accessToken: 'old-access', refreshToken: 'old-refresh' } })
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('private, no-store')
    const { csrfToken } = response.json<{ csrfToken: string }>()
    expect(csrfToken).toMatch(/^[a-f0-9]{64}$/)
    expect(response.cookies).toHaveLength(1)
    expect(response.cookies[0]).toMatchObject({ name: 'csrf', value: csrfToken, path: '/', sameSite: 'Lax' })
    expect(response.cookies[0]?.httpOnly).toBeFalsy()
  })

  it('reaproveita cookie válido e substitui cookie curto', async () => {
    const valid = 'a'.repeat(32)
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf', cookies: { csrf: valid } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ csrfToken: valid })
    const short = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf', cookies: { csrf: 'short' } })
    expect(short.statusCode).toBe(200)
    expect(short.json().csrfToken).toMatch(/^[a-f0-9]{64}$/)
    expect(short.json().csrfToken).not.toBe(valid)
  })

  it('recupera a inicialização do login sem dispensar a comparação CSRF', async () => {
    const request = { method: 'POST' as const, url: '/api/v1/auth/login', payload: { email: 'invalid', password: '12345678' } }
    const cookies = { accessToken: 'old-access', refreshToken: 'old-refresh' }
    expect((await app.inject({ ...request, cookies })).statusCode).toBe(403)
    const bootstrap = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf', cookies })
    expect(bootstrap.statusCode).toBe(200)
    const { csrfToken } = bootstrap.json<{ csrfToken: string }>()
    const recovered = await app.inject({ ...request, cookies: { ...cookies, csrf: csrfToken }, headers: { 'x-csrf-token': csrfToken } })
    expect(recovered.statusCode).toBe(400) // The login payload now reaches validation, without DB access.
    const mismatch = await app.inject({ ...request, cookies: { ...cookies, csrf: csrfToken }, headers: { 'x-csrf-token': 'b'.repeat(64) } })
    expect(mismatch.statusCode).toBe(403)
  })

  it('permite recuperar CSRF com marcador de suporte antigo sem liberar mutações', async () => {
    const cookies = { supportSession: 'old-support', accessToken: 'old-access' }
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf', cookies })
    expect(response.statusCode).toBe(200)
    expect(response.json().csrfToken).toMatch(/^[a-f0-9]{64}$/)
    const csrf = response.json().csrfToken as string
    const denied = await app.inject({ method: 'POST', url: '/api/v1/auth/login', cookies: { ...cookies, csrf }, headers: { 'x-csrf-token': csrf }, payload: { email: 'invalid', password: '12345678' } })
    expect(denied.statusCode).toBe(401)
    expect(denied.json().code).toBe('support_read_only')
  })
})
