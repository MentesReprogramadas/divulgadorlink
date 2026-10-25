'use client'
import { useState, type ReactNode } from 'react'
import styles from './home-preview.module.css'

export function PreviewFrame({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false)
  return <main className={styles.preview} data-motion={paused ? 'paused' : 'running'} aria-label="Home reimaginada do Tem Link Aqui">
    <div className={styles.atmosphere} aria-hidden="true"><span /><span /><span /><svg viewBox="0 0 1400 1200" preserveAspectRatio="none"><defs><linearGradient id="preview-light"><stop stopColor="#4af9eb" stopOpacity="0" /><stop offset=".48" stopColor="#72e5e0" stopOpacity=".45" /><stop offset="1" stopColor="#92c5ea" stopOpacity="0" /></linearGradient><filter id="preview-soft"><feGaussianBlur stdDeviation="18" /></filter></defs><path d="M-100 100C300 600 800-200 1500 440M-100 700C550 100 750 1300 1500 700" stroke="url(#preview-light)" strokeWidth="110" filter="url(#preview-soft)" fill="none" /></svg></div>
    <svg className={styles.filterDefinitions} aria-hidden="true"><defs><filter id="preview-refraction" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".012 .018" numOctaves="1" seed="4" result="waves" /><feDisplacementMap in="SourceGraphic" in2="waves" scale="10" xChannelSelector="R" yChannelSelector="G" /></filter></defs></svg>
    <div className={styles.previewNotice}><span><i /> Home reimaginada <b>·</b> Conteúdo ilustrativo</span><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Retomar movimento' : 'Pausar movimento'}</button></div>
    {children}
    <footer className={styles.previewFooter}><span>Tem Link Aqui <b>Um link. Muitas possibilidades.</b></span><p>Demo de catálogo. Imagens via Unsplash. Números e links fictícios.</p></footer>
  </main>
}
