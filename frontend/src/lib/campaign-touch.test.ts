import { afterEach, expect, it, vi } from 'vitest'
import { syncCampaignTouch } from './campaign-touch'

afterEach(() => vi.unstubAllGlobals())

it('limita a espera pela captura e não bloqueia o cadastro por falha de medição', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('offline'))
  vi.stubGlobal('fetch', fetch)
  await expect(syncCampaignTouch()).resolves.toBeUndefined()
  expect(fetch).toHaveBeenCalledWith('/anuncio/toque', { method: 'POST', signal: expect.any(AbortSignal) })
})
