import type { CSSProperties } from 'react'
import styles from './liquid-lens.module.css'

// Static glass inherits its parent's corners; radius remains accepted by existing callers.
export function LiquidLens({ edge = 'rim' }: { radius?: number; edge?: 'rim' | 'none' }) {
  return <span className={styles.lens} aria-hidden="true" data-optics="frosted" style={{ '--lens-filter': 'blur(.65px) saturate(1.18)' } as CSSProperties}>
    <span className={styles.backdrop} />{edge === 'rim' ? <span className={styles.rim} /> : null}
  </span>
}
