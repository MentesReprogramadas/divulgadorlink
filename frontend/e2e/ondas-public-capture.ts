/** Self-contained so Playwright can serialize it into the page context. */
export async function preparePublicCapture({ imageTimeoutMs = 15_000 }: { imageTimeoutMs?: number } = {}) {
  const initialHeight = document.documentElement.scrollHeight
  for (const image of document.images) image.loading = 'eager'
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  const step = Math.max(400, innerHeight * .8)
  const steps = Math.min(100, Math.ceil(initialHeight / step))
  for (let index = 0; index <= steps; index++) {
    scrollTo(0, Math.min(initialHeight, index * Math.max(step, initialHeight / Math.max(1, steps))))
    await frame()
  }
  const source = (image: HTMLImageElement) => {
    const raw = image.currentSrc || image.src
    if (raw.startsWith('data:')) return raw.slice(0, raw.indexOf(',') + 1)
    try { const url = new URL(raw, location.href); return url.origin + url.pathname } catch { return raw.slice(0, 160) }
  }
  // React can mount images while the page is traversed. Use the current nodes.
  const images = [...document.images]
  for (const image of images) image.loading = 'eager'
  const pending = images.filter(image => !image.complete)
  const decoding = new Set<HTMLImageElement>()
  let decodedImages = 0
  const cleanups: Array<() => void> = []
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      Promise.all(pending.map(image => new Promise<void>(resolve => {
        const done = () => { image.removeEventListener('load', done); image.removeEventListener('error', done); resolve() }
        cleanups.push(() => { image.removeEventListener('load', done); image.removeEventListener('error', done) })
        image.addEventListener('load', done, { once: true }); image.addEventListener('error', done, { once: true })
        if (image.complete) done()
      }))).then(async () => {
        await Promise.all(images.filter(image => image.isConnected && image.naturalWidth > 0).map(async image => {
          if (typeof image.decode !== 'function') return
          decoding.add(image)
          try { await image.decode(); decodedImages++ }
          catch { throw new Error(`Image decode failed: ${source(image)}`) }
          finally { decoding.delete(image) }
        }))
      }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => {
        const unresolved = pending.filter(image => !image.complete).map(source)
        reject(new Error(`Image readiness exceeded ${imageTimeoutMs}ms: ${unresolved.length} pending image(s): ${unresolved.join(', ')}${decoding.size ? `; decoding: ${[...decoding].map(source).join(', ')}` : ''}`))
      }, imageTimeoutMs) }),
    ])
    return { initialHeight, images: images.length, decodedImages, failedImages: images.filter(image => image.complete && image.naturalWidth === 0).map(source) }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    for (const cleanup of cleanups) cleanup()
    scrollTo(0, 0)
    await frame()
  }
}
