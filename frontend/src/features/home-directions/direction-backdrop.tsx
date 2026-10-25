'use client'
import type { DirectionId } from './directions'
import { WaveCanvas } from '@/components/layout/wave-canvas'
import styles from './home-directions.module.css'
export { WaveCanvas } from '@/components/layout/wave-canvas'

export function DirectionBackdrop({ id, paused }: { id: DirectionId; paused: boolean }) {
  return <div className={styles.backdrop} aria-hidden="true">{id === 'ondas' ? <WaveCanvas paused={paused} className={styles.waveCanvas} /> : null}<div className={styles.field}><i /><i /><i /><i /></div><div className={styles.perspectiveGrid} />{id === 'organica' ? <svg className={styles.gooDefinitions}><defs><filter id="direction-goo"><feGaussianBlur stdDeviation="15" /><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" /></filter></defs></svg> : null}</div>
}
