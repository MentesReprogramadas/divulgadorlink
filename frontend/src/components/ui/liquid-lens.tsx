'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createDisplacementTexture } from './liquid-optics'
import styles from './liquid-lens.module.css'

const maps = new Map<string, string>()
function displacementUrl(width: number, height: number, radius: number) {
  const key = `${Math.round(width)}:${Math.round(height)}:${radius}`
  const cached = maps.get(key)
  if (cached) return cached
  const texture = createDisplacementTexture(width, height, radius)
  const canvas = document.createElement('canvas')
  canvas.width = texture.width; canvas.height = texture.height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.putImageData(new ImageData(new Uint8ClampedArray(texture.pixels), texture.width, texture.height), 0, 0)
  const url = canvas.toDataURL()
  if (maps.size >= 32) maps.delete(maps.keys().next().value!)
  maps.set(key, url)
  return url
}

export function LiquidLens({ radius = 18, edge = 'rim' }: { radius?: number; edge?: 'rim' | 'none' }) {
  const ref = useRef<HTMLSpanElement>(null)
  const id = `wave-lens-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [map, setMap] = useState<{ url: string; width: number; height: number } | null>(null)
  useEffect(() => {
    const element = ref.current, parent = element?.parentElement
    if (!element || !parent || typeof ResizeObserver === 'undefined') return
    const pointerSurface = parent.hasAttribute('data-card-content') ? parent.closest('article') ?? parent : parent
    const transparency = matchMedia('(prefers-reduced-transparency: reduce)')
    const reduced = matchMedia('(prefers-reduced-motion: reduce), (hover: none)')
    // SVG backdrop filters are Chromium-only; other engines keep the CSS glass.
    const nativeRefraction = /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'blur(1px)')
    let frame = 0
    function update() {
      if (!nativeRefraction || transparency.matches) { setMap(null); return }
      const box = element!.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return
      try {
        const width = Math.round(box.width), height = Math.round(box.height), url = displacementUrl(width, height, radius)
        setMap(previous => url && (previous?.url !== url || previous.width !== width || previous.height !== height) ? { url, width, height } : url ? previous : null)
      } catch { setMap(null) }
    }
    function move(event: PointerEvent) {
      if (event.pointerType === 'touch' || reduced.matches || element!.closest('[data-motion="paused"]')) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = parent!.getBoundingClientRect()
        element!.style.setProperty('--lens-light-x', `${Math.max(0, Math.min(100, (event.clientX - box.left) / box.width * 100))}%`)
        element!.style.setProperty('--lens-light-y', `${Math.max(0, Math.min(100, (event.clientY - box.top) / box.height * 100))}%`)
      })
    }
    function reset() { cancelAnimationFrame(frame); element!.style.removeProperty('--lens-light-x'); element!.style.removeProperty('--lens-light-y') }
    const resize = new ResizeObserver(update)
    resize.observe(element); update()
    transparency.addEventListener('change', update); reduced.addEventListener('change', reset)
    pointerSurface.addEventListener('pointermove', move); pointerSurface.addEventListener('pointerleave', reset); pointerSurface.addEventListener('pointercancel', reset)
    return () => { reset(); resize.disconnect(); transparency.removeEventListener('change', update); reduced.removeEventListener('change', reset); pointerSurface.removeEventListener('pointermove', move); pointerSurface.removeEventListener('pointerleave', reset); pointerSurface.removeEventListener('pointercancel', reset) }
  }, [radius])
  const opticalStyle = map ? { '--lens-filter': `url("#${id}") blur(var(--lens-frost, .65px)) saturate(1.18)` } as CSSProperties : undefined
  // Keep edge sampling continuous instead of folding the photograph into bands.
  const scale = map ? Math.min(22, Math.min(map.width, map.height) * .25) : 0
  return <span ref={ref} className={styles.lens} aria-hidden="true" data-optics={map ? 'refractive' : 'frosted'} style={opticalStyle}>
    <svg className={styles.definitions} width="0" height="0" focusable="false"><defs>{map ? <filter id={id} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width={map.width} height={map.height} colorInterpolationFilters="sRGB">
      <feImage href={map.url} x="0" y="0" width={map.width} height={map.height} preserveAspectRatio="none" result="lens-map" />
      <feGaussianBlur in="lens-map" stdDeviation=".6" result="smooth-lens" />
      <feDisplacementMap in="SourceGraphic" in2="smooth-lens" scale={scale} xChannelSelector="R" yChannelSelector="G" result="red-bend" /><feColorMatrix in="red-bend" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
      <feDisplacementMap in="SourceGraphic" in2="smooth-lens" scale={scale * 1.045} xChannelSelector="R" yChannelSelector="G" result="green-bend" /><feColorMatrix in="green-bend" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />
      <feDisplacementMap in="SourceGraphic" in2="smooth-lens" scale={scale * 1.09} xChannelSelector="R" yChannelSelector="G" result="blue-bend" /><feColorMatrix in="blue-bend" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />
      <feBlend in="red" in2="green" mode="screen" result="red-green" /><feBlend in="red-green" in2="blue" mode="screen" />
    </filter> : null}</defs></svg>
    <span className={styles.backdrop} />{edge === 'rim' ? <span className={styles.rim} /> : null}
  </span>
}
