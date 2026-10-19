'use client'

import type { ReactNode } from 'react'
import styles from './report.module.css'

export type MetricCardItem = { label: string; value: ReactNode; note?: ReactNode; primary?: boolean }
export function MetricCards({ items, label = 'Resumo do período' }: { items: MetricCardItem[]; label?: string }) {
  return <dl className={styles.metrics} aria-label={label}>{items.map(item => <div key={item.label} data-primary={item.primary || undefined}><dt>{item.label}</dt><dd>{item.value}{item.note ? <small>{item.note}</small> : null}</dd></div>)}</dl>
}
