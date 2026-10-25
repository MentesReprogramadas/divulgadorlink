'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { WaveCanvas } from '@/features/home-directions/direction-backdrop'
import { LiquidLens } from './liquid-lens'
import styles from '@/features/catalog/components/ondas-catalog.module.css'

export function WaveFrame({ children, detail = false }: { children: ReactNode; detail?: boolean }) {
  const [paused, setPaused] = useState(false)
  return <main className={styles.page} data-style="ondas" data-detail={detail || undefined} data-motion={paused ? 'paused' : 'running'} aria-label={detail ? 'Detalhes Ondas' : 'Home Ondas'}>
    <div className={styles.atmosphere} data-wave-background aria-hidden="true"><WaveCanvas paused={paused} /><svg className={styles.waveLines} viewBox="0 0 1440 800" preserveAspectRatio="none"><path d="M-100 610C240 120 490 820 870 410S1240 240 1540 40" /><path d="M-100 635C240 145 490 845 870 435S1240 265 1540 65" /><path d="M-100 660C240 170 490 870 870 460S1240 290 1540 90" /></svg></div>
    <div className={styles.container}>
      <nav className={styles.reviewBar} aria-label="Prévia Ondas"><LiquidLens radius={16} /><Link href="/dev/homes"><ActionIcon name="back" width="15" height="15" />Todas as homes</Link><span>Ondas <span aria-hidden="true">/</span> Liquid Glass <b>Demonstração</b></span><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}><LiquidLens radius={12} />{paused ? 'Retomar animações' : 'Pausar animações'}</button></nav>
      {children}
      <footer className={styles.footer}><LiquidLens radius={20} /><Link href="/dev/homes/ondas">Tem Link Aqui<span>Interesses em comum. Novas conexões.</span></Link><p>Prévia Ondas · Dados fictícios<br />Fotografias ilustrativas do Unsplash</p><Link href="/dev/homes">Comparar outras homes<ActionIcon name="next" width="17" height="17" /></Link></footer>
    </div>
  </main>
}
