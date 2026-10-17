import { expect, it, vi } from 'vitest'
import { validateRedirectDestination } from './validate-destination'

it('F12-U02/I01 URL privada não chega à porta de rede', async () => {
  const probe = vi.fn(async () => 200)
  for (const raw of ['https://127.0.0.1', 'https://10.0.0.1', 'https://[::1]', 'https://[::ffff:7f00:1]', 'https://localhost', 'https://metadata.local', 'http://example.com', 'javascript:alert(1)', 'https://user:secret@example.com', 'https://example.com:8443']) await expect(validateRedirectDestination(raw, probe)).rejects.toMatchObject({ status: 422 })
  expect(probe).not.toHaveBeenCalled()
})
it('F12-T01 valida a URL canonicalizada usando o probe seguro já existente', async () => {
  const probe = vi.fn(async () => 200)
  await expect(validateRedirectDestination('https://EXAMPLE.com/convite/?utm_source=teste&code=abc#top', probe)).resolves.toBe('https://example.com/convite?code=abc')
  expect(probe).toHaveBeenCalledExactlyOnceWith('https://example.com/convite?code=abc')
})
it('F12-U01 indisponível não produz um destino liberado e falha externa não vira sucesso', async () => {
  for (const status of [0, 301, 404, 429, 500]) await expect(validateRedirectDestination('https://example.com', async () => status)).rejects.toMatchObject({ status: 422 })
  await expect(validateRedirectDestination('https://example.com', async () => null)).rejects.toMatchObject({ status: 503 })
  await expect(validateRedirectDestination('https://example.com', async () => { throw new Error('provider-secret-sentinel') })).rejects.toMatchObject({ status: 503, message: expect.not.stringContaining('provider-secret-sentinel') })
})
