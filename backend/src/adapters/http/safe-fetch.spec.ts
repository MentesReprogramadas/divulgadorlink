import { describe, expect, it, vi } from 'vitest'
import {
  assertPublicHttps,
  assertResolvedAddresses,
  safeFetch,
} from '@/adapters/http/safe-fetch'

describe('ssrf', () => {
  it('recusa esquema errado, loopback e metadata', () => {
    expect(() => assertPublicHttps('http://example.com')).toThrow(/https/)
    expect(() => assertPublicHttps('https://127.0.0.1')).toThrow(/privado/)
    expect(() => assertPublicHttps('https://169.254.169.254')).toThrow(/privado/)
  })

  it('recusa o endereço resolvido mesmo se o host parecer público', () => {
    expect(() => assertResolvedAddresses(['10.0.0.8'])).toThrow(/privado/)
    expect(assertResolvedAddresses(['8.8.8.8'])).toBe(true)
  })

  it('trata IPv4 mapeado em IPv6 como privado', () => {
    expect(() => assertResolvedAddresses(['::ffff:127.0.0.1'])).toThrow(/privado/)
    expect(() => assertResolvedAddresses(['::ffff:10.0.0.8'])).toThrow(/privado/)
    expect(() => assertResolvedAddresses(['::ffff:169.254.169.254'])).toThrow(/privado/)
  })

  it('https://127.0.0.1 não dispara fetch', async () => {
    const fetchImpl = vi.fn()
    const resolve = vi.fn().mockResolvedValue(['127.0.0.1'])

    await expect(
      safeFetch('https://127.0.0.1', { fetch: fetchImpl, resolve }),
    ).rejects.toThrow(/privado/)

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(resolve).not.toHaveBeenCalled()
  })

  it('valida DNS antes do fetch e revalida no redirect', async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(['93.184.216.34'])
      .mockResolvedValueOnce(['93.184.216.34'])

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://example.org/final' },
        }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const result = await safeFetch('https://example.com/start', { fetch: fetchImpl, resolve })

    expect(result.status).toBe(200)
    expect(await result.text()).toBe('ok')
    expect(resolve).toHaveBeenCalledTimes(2)
    expect(resolve).toHaveBeenNthCalledWith(1, 'example.com')
    expect(resolve).toHaveBeenNthCalledWith(2, 'example.org')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('para no quarto redirect', async () => {
    const resolve = vi.fn().mockResolvedValue(['93.184.216.34'])
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://example.com/next' },
      }),
    )

    await expect(
      safeFetch('https://example.com/start', { fetch: fetchImpl, resolve }),
    ).rejects.toThrow(/redirects demais/)

    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('recusa corpo acima de 1 MiB', async () => {
    const resolve = vi.fn().mockResolvedValue(['93.184.216.34'])
    const big = new Uint8Array(1024 * 1024 + 1)
    const fetchImpl = vi.fn().mockResolvedValue(new Response(big, { status: 200 }))

    await expect(
      safeFetch('https://example.com', { fetch: fetchImpl, resolve }),
    ).rejects.toThrow(/limite/)
  })
})
