'use client'

import { WaveCanvas } from './wave-canvas'
import styles from './ondas-atmosphere.module.css'

export function OndasAtmosphere() {
  return <div className={styles.atmosphere} aria-hidden="true">
    <WaveCanvas paused className={styles.canvas} />
    <svg className={styles.lines} viewBox="0 0 1440 800" preserveAspectRatio="none"><path d="M-100 610C240 120 490 820 870 410S1240 240 1540 40" /><path d="M-100 635C240 145 490 845 870 435S1240 265 1540 65" /><path d="M-100 660C240 170 490 870 870 460S1240 290 1540 90" /></svg>
  </div>
}
