import { afterEach, expect, it, vi } from 'vitest'
import { prepareAvatar } from './prepare-avatar'
afterEach(() => vi.unstubAllGlobals())
it('F09 mídia recusa formato ativo ou arquivo grande antes de tentar decodificar', async () => {
  const decode = vi.fn(); vi.stubGlobal('createImageBitmap', decode)
  await expect(prepareAvatar(new File(['<svg/>'], 'avatar.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG, JPG ou WebP')
  await expect(prepareAvatar(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' }))).rejects.toThrow('5 MB')
  expect(decode).not.toHaveBeenCalled()
})
it('F09 mídia preserva falha de decodificação como erro acionável sem upload', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  await expect(prepareAvatar(new File(['invalid'], 'photo.png', { type: 'image/png' }))).rejects.toThrow('Escolha outra imagem')
})
