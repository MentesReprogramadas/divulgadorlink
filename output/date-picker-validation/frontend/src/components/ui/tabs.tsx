'use client'

import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import type { ReactNode } from 'react'
import styles from './tabs.module.css'
import { ActionIcon } from './action-icon'
type TabIcon = React.ComponentProps<typeof ActionIcon>['name']

export function TabNavigation<T extends string>({ value, onChange, label, items, idPrefix }: { value: T; onChange?: (value: T) => void; label: string; items: Array<{ id: T; label: string; icon?: TabIcon }>; idPrefix: string }) {
  return <BaseTabs.Root className={styles.root} value={value} onValueChange={next => { const item = items.find(item => item.id === next); if (item) onChange?.(item.id) }}>
    <BaseTabs.List aria-label={label} className={styles.list}>{items.map(item => <BaseTabs.Tab key={item.id} value={item.id} data-value={item.id} id={`${idPrefix}-${item.id}`} aria-controls={`${idPrefix}-panel-${item.id}`} className={styles.tab}>{item.icon ? <ActionIcon name={item.icon} /> : null}{item.label}</BaseTabs.Tab>)}<BaseTabs.Indicator className={styles.indicator} /></BaseTabs.List>
  </BaseTabs.Root>
}

export function Tabs({ value, onChange, label, items, actions }: { value: string; onChange: (value: string) => void; label: string; actions?: ReactNode; items: Array<{ id: string; label: string; icon?: TabIcon; content: ReactNode }> }) {
  return <BaseTabs.Root value={value} onValueChange={next => { if (typeof next === 'string') onChange(next) }} className={styles.root}>
    <BaseTabs.List aria-label={label} className={styles.list}>
      {items.map(item => <BaseTabs.Tab key={item.id} value={item.id} className={styles.tab}>{item.icon ? <ActionIcon name={item.icon} /> : null}{item.label}</BaseTabs.Tab>)}
      <BaseTabs.Indicator className={styles.indicator} />
    </BaseTabs.List>
    {actions}
    {items.map(item => <BaseTabs.Panel key={item.id} value={item.id} className={styles.panel}>{item.content}</BaseTabs.Panel>)}
  </BaseTabs.Root>
}
