'use client'

import Image from 'next/image'
import { useState } from 'react'
import styles from './discovery.module.css'

export function ProductImage({ src, title }: { src: string | null | undefined; title: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const safe = src?.startsWith('https://') && failedSource !== src
  return <div className={styles.image}>{safe && src ? <Image unoptimized src={src} alt={title} width={144} height={144} loading="lazy" onError={() => setFailedSource(src)} /> : <span>Imagem indisponível</span>}</div>
}
