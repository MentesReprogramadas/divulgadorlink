import styles from './feedback.module.css'
import type { ReactNode } from 'react'

export function EmptyState({ children = 'Nada por aqui ainda.', action }: { children?: string; action?: ReactNode }) {
  return <div className={styles.empty} role="status"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m3 8 4-5h10l4 5v12H3V8Zm0 0h6l1 4h4l1-4h6" /></svg><p>{children}</p>{action ? <div>{action}</div> : null}</div>
}
