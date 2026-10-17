import type { ReactNode } from 'react'
import styles from './catalog-grid.module.css'

export function CatalogGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}
