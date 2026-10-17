import type { ReactNode } from 'react'
import styles from './workspace-section.module.css'

export function WorkspaceSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className={styles.section} aria-label={title}><header className={styles.header}><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action}</header>{children}</section>
}

/** A ranked comparison, never a fabricated time series. Values remain available as text. */
export function ComparisonBars({ rows, unit }: { rows: Array<{ id: string; label: string; value: number }>; unit: 'links' | 'cliques' }) {
  const peak = Math.max(1, ...rows.map(row => row.value))
  return <ul className={styles.bars}>{rows.map(row => <li key={row.id}><div><span>{row.label}</span><strong>{row.value.toLocaleString('pt-BR')} {row.value === 1 ? unit === 'links' ? 'link' : 'clique' : unit}</strong></div><span className={styles.track} aria-hidden="true"><span style={{ width: `${Math.max(0, row.value) / peak * 100}%` }} /></span></li>)}</ul>
}
