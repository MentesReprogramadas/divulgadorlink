import { describe, expect, it, vi } from 'vitest'
import {
  assertPublicHttps,
  assertResolvedAddresses,
  safeFetch,
  type PinnedResponse,
  type PinnedTarget,
} from '@/adapters/http/safe-fetch'

function response(status: number, headers: Record<string, string> = {}, body = ''): PinnedResponse {
  return {
    status,
    headers: new Headers(headers),
    body: new TextEncoder().encode(body),
  }
}

describe('ssrf', () => {
  it('F07 preserva preferência IPv4 da submissão sem ignorar destinos privados no DNS', async () => {
    const connect = vi.fn(async (_target: PinnedTarget) => response(200))
    await safeFetch('https://example.com', { resolve: async () => ['2606:4700:4700::1111', '1.1.1.1'], connect })
    expect(connect.mock.calls[0]?.[0]).toMatchObject({ address: '1.1.1.1', servername: 'example.com' })
    connect.mockClear()
    await expect(safeFetch('https://example.com', { resolve: async () => ['1.1.1.1', '::1'], connect })).rejects.toThrow(/privado/)
    expect(connect).not.toHaveBeenCalled()
  })
  it('F07 destino acessível sem corpo conserva HTTP 204/205', async () => {
    for (const status of [204, 205]) {
      const result = await safeFetch('https://example.com', { resolve: async () => ['8.8.8.8'], connect: async () => response(status) })
      expect(result.status).toBe(status)
    }
  })
  it('F07-U03 bloqueia endereços não públicos e credenciais antes de abrir conexão', () => {
    for (const address of ['0.0.0.0', '100.64.0.1', '224.0.0.1', '255.255.255.255', '::', 'ff02::1']) expect(() => assertResolvedAddresses([address])).toThrow()
    expect(() => assertPublicHttps('https://usuario:senha@example.com')).toThrow()
    expect(() => assertResolvedAddresses(['not-an-ip'])).toThrow()
  })
  it('recusa esquema errado, loopback e metadata', () => {
    expect(() => assertPublicHttps('http://example.com')).toThrow(/https/)
    expect(() => assertPublicHttps('https://127.0.0.1')).toThrow(/privado/)
    expect(() => assertPublicHttps('https://169.254.169.254')).toThrow(/privado/)
    expect(() => assertPublicHttps('https://[::1]/x')).toThrow(/privado/)
    expect(() => assertPublicHttps('https://[::ffff:127.0.0.1]/x')).toThrow(/privado/)
  })

  it('recusa o endereço resolvido mesmo se o host parecer público', () => {
    expect(() => assertResolvedAddresses(['10.0.0.8'])).toThrow(/privado/)
    expect(() => assertResolvedAddresses([])).toThrow(/dns vazio/)
    expect(assertResolvedAddresses(['8.8.8.8'])).toBe(true)
  })

  it('trata IPv4 mapeado em IPv6 como privado', () => {
    expect(() => assertResolvedAddresses(['::ffff:127.0.0.1'])).toThrow(/privado/)
    expect(() => assertResolvedAddresses(['::ffff:10.0.0.8'])).toThrow(/privado/)
    expect(() => assertResolvedAddresses(['::ffff:169.254.169.254'])).toThrow(/privado/)
  })

  it('https://127.0.0.1 não abre conexão', async () => {
    const connect = vi.fn()
    const resolve = vi.fn().mockResolvedValue(['127.0.0.1'])

    await expect(safeFetch('https://127.0.0.1', { connect, resolve })).rejects.toThrow(/privado/)

    expect(connect).not.toHaveBeenCalled()
    expect(resolve).not.toHaveBeenCalled()
  })

  it('conecta no IP validado e não resolve de novo no mesmo salto', async () => {
    let lookups = 0
    const resolve = vi.fn(async () => {
      lookups += 1
      if (lookups > 1) return ['127.0.0.1']
      return ['8.8.8.8']
    })
    const connect = vi.fn(async (_target: PinnedTarget) => response(200, {}, 'ok'))

    const result = await safeFetch('https://example.com/start', { connect, resolve })

    expect(result.status).toBe(200)
    expect(lookups).toBe(1)
    expect(connect).toHaveBeenCalledTimes(1)
    expect(connect.mock.calls[0]?.[0]).toMatchObject({
      hostname: 'example.com',
      address: '8.8.8.8',
      servername: 'example.com',
    })
  })

  it('recusa redirect cujo host resolve para IP privado e não conecta nele', async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(['8.8.8.8'])
      .mockResolvedValueOnce(['10.0.0.8'])
    const connect = vi.fn(async (_target: { address: string }) =>
      response(302, { location: 'https://evil.example/next' }),
    )

    await expect(safeFetch('https://example.com/start', { connect, resolve })).rejects.toThrow(/privado/)

    expect(connect).toHaveBeenCalledTimes(1)
    expect(connect.mock.calls[0]?.[0].address).toBe('8.8.8.8')
  })

  it('revalida o redirect e conecta no IP novo', async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(['93.184.216.34'])
      .mockResolvedValueOnce(['1.1.1.1'])
    const connect = vi
      .fn()
      .mockResolvedValueOnce(response(302, { location: 'https://example.org/final' }))
      .mockResolvedValueOnce(response(200, {}, 'ok'))

    const result = await safeFetch('https://example.com/start', { connect, resolve })

    expect(result.status).toBe(200)
    expect(await result.text()).toBe('ok')
    expect(connect.mock.calls.map((call) => call[0].address)).toEqual(['93.184.216.34', '1.1.1.1'])
  })

  it('para no quarto redirect', async () => {
    const resolve = vi.fn().mockResolvedValue(['93.184.216.34'])
    const connect = vi.fn(async () => response(302, { location: 'https://example.com/next' }))

    await expect(safeFetch('https://example.com/start', { connect, resolve })).rejects.toThrow(/redirects demais/)

    expect(connect).toHaveBeenCalledTimes(4)
  })

  it('recusa corpo acima de 1 MiB', async () => {
    const resolve = vi.fn().mockResolvedValue(['93.184.216.34'])
    const connect = vi.fn(async () => ({
      status: 200,
      headers: new Headers(),
      body: new Uint8Array(1024 * 1024 + 1),
    }))

    await expect(safeFetch('https://example.com', { connect, resolve })).rejects.toThrow(/limite/)
  })
})
