import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readCsrf, readSession, writeSession } from '@/domain/session'
import { api, currentSession } from './api'

function reply(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('sessão por cookie no cliente', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.cookie = 'csrf=abc123abc123abc123abc123abc123ab; Path=/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrf=; Path=/; Max-Age=0'
  })

  it('não guarda nem devolve token no sessionStorage', () => {
    writeSession({ role: 'USER', status: 'ACTIVE', canSubmit: true, token: 'jwt' } as never)
    expect(sessionStorage.getItem('catalogo.session')).not.toContain('jwt')
    expect(document.cookie).toContain('catalogo_role=USER')
    sessionStorage.setItem('catalogo.session', JSON.stringify({ token: 'antigo', role: 'USER', status: 'ACTIVE', canSubmit: false }))
    expect(readSession()).toEqual({ role: 'USER', status: 'ACTIVE', canSubmit: false })
  })

  it('mutação envia x-csrf-token do cookie e GET não envia', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return reply(200)
    }))
    await api('/v1/links/mine')
    await api('/v1/links/x', { method: 'PATCH', body: '{}' })
    expect(readCsrf()).toBe('abc123abc123abc123abc123abc123ab')
    expect(new Headers(calls[0]?.init.headers).get('x-csrf-token')).toBeNull()
    expect(new Headers(calls[1]?.init.headers).get('x-csrf-token')).toBe('abc123abc123abc123abc123abc123ab')
    expect(new Headers(calls[1]?.init.headers).get('authorization')).toBeNull()
    expect(calls.every((call) => call.init.credentials === 'include')).toBe(true)
  })

  it('401 tenta um refresh e repete a chamada uma única vez', async () => {
    const urls: string[] = []
    const responses = [reply(401), reply(200, { role: 'USER' }), reply(200, { links: [] })]
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url)
      return responses.shift() ?? reply(500)
    }))
    const result = await api<{ links: unknown[] }>('/v1/links/mine')
    expect(result.status).toBe(200)
    expect(urls).toEqual(['/bff/v1/links/mine', '/bff/v1/auth/refresh', '/bff/v1/links/mine'])
  })

  it('refresh negado mantém 401 e limpa a sessão local', async () => {
    writeSession({ role: 'USER', status: 'ACTIVE', canSubmit: true })
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url)
      return reply(401)
    }))
    expect(await currentSession()).toBeNull()
    expect(urls).toEqual(['/bff/v1/auth/session', '/bff/v1/auth/refresh'])
    expect(readSession()).toBeNull()
  })

  it('login não dispara refresh em credencial errada', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url)
      return reply(401, { message: 'Credenciais inválidas.' })
    }))
    const result = await api('/v1/auth/login', { method: 'POST', body: '{}' })
    expect(result.status).toBe(401)
    expect(urls).toEqual(['/bff/v1/auth/login'])
  })
})
