'use client'

import { Children, useId, useState, type FormEvent, type ReactNode } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import styles from './workspace-controls.module.css'

export function WorkspaceActions({ children, label = 'Ações da página' }: { children: ReactNode; label?: string }) {
  return <div className={styles.actions} role="group" aria-label={label}>{children}</div>
}
export function WorkspaceFilters({ children, label, onSubmit, method, id }: { children: ReactNode; label: string; onSubmit?: (event: FormEvent<HTMLFormElement>) => void; method?: 'get'; id?: string }) {
  const [expanded, setExpanded] = useState(false)
  const moreId = useId()
  const controls = Children.toArray(children)
  const content = <><LiquidLens radius={16} />{controls.slice(0, 2)}{controls.length > 2 ? <><div id={moreId} className={styles.additional} data-expanded={expanded}>{controls.slice(2)}</div><button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={moreId} aria-label={expanded ? 'Ver menos filtros' : 'Ver mais filtros'} onClick={() => setExpanded(value => !value)}><ActionIcon name={expanded ? 'up' : 'down'} />{expanded ? 'Ver menos' : 'Ver mais'}</button></> : null}</>
  return onSubmit || method ? <form data-workspace-filters id={id} className={styles.filters} aria-label={label} onSubmit={onSubmit} method={method}>{content}</form> : <div data-workspace-filters id={id} className={styles.filters} role="search" aria-label={label}>{content}</div>
}
