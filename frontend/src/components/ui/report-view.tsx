'use client'

import { useId, useState, type ReactNode } from 'react'
import { Button } from './button'
import { ActionIcon } from './action-icon'
import { Tabs } from './tabs'
import styles from './report.module.css'
import { LiquidLens } from './liquid-lens'

export type ReportColumn<Row> = { label: string; render: (row: Row) => ReactNode; numeric?: boolean }
export function ReportTable<Row>({ rows, columns, rowKey, label, pageSize = 7 }: { rows: Row[]; columns: ReportColumn<Row>[]; rowKey: (row: Row) => string; label: string; pageSize?: number }) {
  const [page, setPage] = useState(1)
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)))
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const start = (current - 1) * pageSize
  return <div className={styles.tableBlock}><div className={styles.tableWrap} role="region" aria-label={label} tabIndex={0}><table style={{ minWidth: columns.length * 144 }}><caption className={styles.srOnly}>{label}</caption><thead><tr>{columns.map(column => <th scope="col" key={column.label} data-numeric={column.numeric || undefined}>{column.label}</th>)}</tr></thead><tbody>{rows.slice(start, start + pageSize).map(row => <tr key={rowKey(row)}>{columns.map((column, index) => index === 0 ? <th scope="row" key={column.label}>{column.render(row)}</th> : <td data-numeric={column.numeric || undefined} key={column.label}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>{pages > 1 ? <div className={styles.pagination}><p role="status">{start + 1}–{Math.min(start + pageSize, rows.length)} de {rows.length} · Página {current} de {pages}</p><nav aria-label={`Paginação: ${label}`}><Button variant="secondary" disabled={current === 1} onClick={() => setPage(current - 1)}><ActionIcon name="back"/>Anterior</Button><Button variant="secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>Próxima<ActionIcon name="next"/></Button></nav></div> : null}</div>
}
export function ReportView<Row>({ title, rows, columns, rowKey, chart, children, pageSize }: { title: string; rows: Row[]; columns: ReportColumn<Row>[]; rowKey: (row: Row) => string; chart: ReactNode; children?: ReactNode; pageSize?: number }) {
  const [view, setView] = useState('charts')
  const id = useId()
  if (!rows.length) return null
  return <section className={styles.report} aria-labelledby={id}><LiquidLens radius={16}/><header><h2 id={id}>{title}</h2>{children}</header><Tabs value={view} onChange={setView} label={`Visualização: ${title}`} items={[{ id: 'charts', label: 'Gráficos', content: chart }, { id: 'table', label: 'Tabela', content: <ReportTable rows={rows} columns={columns} rowKey={rowKey} label={title} pageSize={pageSize} /> }]} /></section>
}
