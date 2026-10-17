import { afterEach, expect, it, vi } from 'vitest'
import { prepareAvatar } from './prepare-avatar'
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
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
it('resizes and converts locally to WebP before returning upload bytes', async () => {
  const close = vi.fn(), drawImage = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1600, height: 800, close }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,AQID')
  expect(await prepareAvatar(new File(['fixture'], 'foto.jpg', { type: 'image/jpeg' }))).toBe('AQID')
  expect(encode).toHaveBeenCalledWith('image/webp', 0.82)
  expect(drawImage.mock.calls[0].slice(-2)).toEqual([512, 256]); expect(close).toHaveBeenCalledOnce()
})
it('rejects SVG and browsers that silently fall back to PNG', async () => {
  await expect(prepareAvatar(new File(['svg'], 'foto.svg', { type: 'image/svg+xml' }))).rejects.toThrow()
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 16, height: 16, close }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AQID')
  await expect(prepareAvatar(new File(['fixture'], 'foto.png', { type: 'image/png' }))).rejects.toThrow(/WebP/)
  expect(close).toHaveBeenCalledOnce()
})
