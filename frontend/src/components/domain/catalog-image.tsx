'use client'

import { useState, type ReactNode } from 'react'

/** Public media URLs are supplied by the approved-media DTO. */
export function CatalogImage({ src, alt = '', className, eager = false, fallback = null, sizes, kind = 'image' }: { src?: string | null; alt?: string | null; className: string; eager?: boolean; fallback?: ReactNode; sizes?: string; kind?: 'image' | 'icon' }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || src === failed) return fallback
  const url = src.replace(/^\/api\//, '/bff/')
  const responsive = sizes && /^\/bff\/v1\/links\/[^/?#]+\/media\/(?!private(?:\/|$))[^/?#]+$/.test(url)
  const widths = kind === 'icon' ? [64, 128] : [320, 640, 960, 1280, 1600]
  return <img src={url} ref={image => { if (image?.currentSrc && image.complete && !image.naturalWidth) setFailed(src) }} srcSet={responsive ? widths.map(width => `${url}?width=${width} ${width}w`).join(', ') : undefined} sizes={responsive ? sizes : undefined} alt={alt ?? ''} className={className} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" onError={() => setFailed(src)} />
}
