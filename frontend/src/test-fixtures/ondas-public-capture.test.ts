import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { preparePublicCapture } from '../../e2e/ondas-public-capture'

beforeEach(() => {
  document.body.innerHTML = ''
  vi.stubGlobal('scrollTo', vi.fn())
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = '' })

it('promove lazy para eager e aguarda o load antes de capturar', async () => {
  const image = document.createElement('img')
  image.loading = 'lazy'; image.src = '/photo.jpg'
  let complete = false
  Object.defineProperty(image, 'complete', { get: () => complete })
  Object.defineProperty(image, 'naturalWidth', { value: 1400 })
  document.body.append(image)
  const ready = preparePublicCapture()
  expect(image.loading).toBe('eager')
  complete = true; image.dispatchEvent(new Event('load'))
  expect(await ready).toMatchObject({ images: 1, failedImages: [] })
  expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
})

it('termina o percurso usando a altura inicial mesmo se a página crescer', async () => {
  let reads = 0
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(() => 2000 + ++reads * 1000)
  const result = await preparePublicCapture()
  expect(result.initialHeight).toBe(3000)
  const positions = vi.mocked(scrollTo).mock.calls.map(args => args[1] as number)
  expect(Math.max(...positions)).toBeLessThanOrEqual(result.initialHeight)
  expect(positions.length).toBeLessThan(12)
})

it('falha dentro do prazo com a imagem pendente identificada e sem token na evidência', async () => {
  const image = document.createElement('img')
  image.src = '/private-photo.jpg?token=do-not-serialize'
  Object.defineProperty(image, 'complete', { value: false })
  document.body.append(image)
  await expect(preparePublicCapture({ imageTimeoutMs: 50 })).rejects.toThrow(/50ms: 1 pending image\(s\): .*\/private-photo\.jpg$/)
  expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
})

it('registra erro de carregamento concluído sem confundir com imagem ainda pendente', async () => {
  const image = document.createElement('img')
  image.src = '/missing-photo.jpg'
  Object.defineProperty(image, 'complete', { value: true })
  document.body.append(image)
  expect((await preparePublicCapture()).failedImages[0]).toContain('/missing-photo.jpg')
})

it('aguarda decode da imagem completa antes de liberar a captura', async () => {
  const image = document.createElement('img')
  image.src = '/async-photo.jpg'
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalWidth', { value: 1400 })
  let finishDecode: (() => void) | undefined
  image.decode = vi.fn(() => new Promise<void>(resolve => { finishDecode = resolve }))
  document.body.append(image)
  let settled = false
  const ready = preparePublicCapture().then(value => { settled = true; return value })
  for (let index = 0; index < 20; index++) await Promise.resolve()
  expect(image.decode).toHaveBeenCalledOnce()
  expect(settled).toBe(false)
  finishDecode?.()
  expect(await ready).toMatchObject({ images: 1, failedImages: [] })
})

it('identifica decode que não termina dentro do prazo, sem expor query privada', async () => {
  const image = document.createElement('img')
  image.src = '/decode-pending.jpg?token=do-not-serialize'
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalWidth', { value: 1400 })
  image.decode = vi.fn(() => new Promise<void>(() => {}))
  document.body.append(image)
  await expect(preparePublicCapture({ imageTimeoutMs: 50 })).rejects.toThrow(/decoding: .*\/decode-pending\.jpg$/)
})

it('inclui imagens montadas durante o percurso e exige decode bem-sucedido', async () => {
  const image = document.createElement('img')
  image.src = '/mounted-photo.jpg'
  Object.defineProperty(image, 'complete', { value: true })
  Object.defineProperty(image, 'naturalWidth', { value: 1400 })
  image.decode = vi.fn().mockRejectedValue(new Error('encoding failed'))
  vi.mocked(scrollTo).mockImplementationOnce(() => { document.body.append(image) })
  await expect(preparePublicCapture()).rejects.toThrow(/Image decode failed: .*\/mounted-photo\.jpg/)
  expect(image.loading).toBe('eager')
})
