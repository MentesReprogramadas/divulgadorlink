import { beforeEach, describe, expect, it, vi } from 'vitest'

const forward = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'www.temlinkaqui.com' }),
}))
vi.mock('@/lib/upstream', () => ({ forward, tenantHost: (host: string) => host }))

import sitemap from './sitemap'

describe('sitemap público', () => {
  beforeEach(() => forward.mockReset())

  it('publica as URLs do catálogo no domínio principal', async () => {
    forward.mockResolvedValue({ status: 200, body: Buffer.from(JSON.stringify({ entries: [
      { path: '/', updatedAt: '' },
      { path: '/nicho/jogos', updatedAt: '2026-10-14T00:00:00.000Z' },
      { path: '/rede/telegram', updatedAt: '' },
      { path: '/link/curto', updatedAt: '' },
    ] })) })
    expect(await sitemap()).toEqual([
      { url: 'https://temlinkaqui.com/' },
      { url: 'https://temlinkaqui.com/nicho/jogos', lastModified: '2026-10-14T00:00:00.000Z' },
      { url: 'https://temlinkaqui.com/rede/telegram' },
      { url: 'https://temlinkaqui.com/link/curto' },
    ])
    expect(forward).toHaveBeenCalledWith({ method: 'GET', path: '/api/v1/sitemap', host: 'temlinkaqui.com' })
  })

  it.each([400, 404, 500, 503])('não publica um sitemap incompleto quando a API retorna %s', async (status) => {
    forward.mockResolvedValue({ status, body: Buffer.from('{}') })
    await expect(sitemap()).rejects.toThrow(`Sitemap upstream returned ${status}`)
  })

  it.each([{}, { entries: [] }])('rejeita resposta sem URLs', async (body) => {
    forward.mockResolvedValue({ status: 200, body: Buffer.from(JSON.stringify(body)) })
    await expect(sitemap()).rejects.toThrow('Sitemap entries missing')
  })
})
