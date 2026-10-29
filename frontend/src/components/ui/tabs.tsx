'use client'

import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import type { ReactNode } from 'react'
import styles from './tabs.module.css'
import { ActionIcon } from './action-icon'
import { LiquidLens } from './liquid-lens'
type TabIcon = React.ComponentProps<typeof ActionIcon>['name']

export function TabNavigation<T extends string>({ value, onChange, label, items, idPrefix, className }: { className?: string; value: T; onChange?: (value: T) => void; label: string; items: Array<{ id: T; label: string; icon?: TabIcon; compactLabel?: string; disabled?:boolean }>; idPrefix: string }) {
  return <BaseTabs.Root className={[styles.root, className].filter(Boolean).join(" ")} value={value} onValueChange={next => { const item = items.find(item => item.id === next); if (item) onChange?.(item.id) }}>
    <div className={styles.listFrame}><LiquidLens radius={16}/><BaseTabs.List aria-label={label} className={styles.list}>{items.map(item => <BaseTabs.Tab key={item.id} value={item.id} disabled={item.disabled} data-value={item.id} id={`${idPrefix}-${item.id}`} aria-label={item.compactLabel ? item.label : undefined} aria-controls={`${idPrefix}-panel-${item.id}`} className={styles.tab}>{item.icon ? <ActionIcon name={item.icon} /> : null}{item.compactLabel ? <><span className={styles.fullLabel}>{item.label}</span><span className={styles.compactLabel} aria-hidden="true">{item.compactLabel}</span></> : item.label}</BaseTabs.Tab>)}<BaseTabs.Indicator className={styles.indicator}><LiquidLens radius={12}/></BaseTabs.Indicator></BaseTabs.List></div>
  </BaseTabs.Root>
}

export function Tabs({ value, onChange, label, items, actions, disabled = false }: { value: string; onChange: (value: string) => void; label: string; actions?: ReactNode; disabled?: boolean; items: Array<{ id: string; label: string; icon?: TabIcon; content: ReactNode }> }) {
  return <BaseTabs.Root value={value} onValueChange={next => { if (typeof next === 'string') onChange(next) }} className={styles.root}>
    <div className={styles.toolbar}><div className={styles.listFrame}><LiquidLens radius={16}/><BaseTabs.List aria-label={label} className={styles.list}>
      {items.map(item => <BaseTabs.Tab key={item.id} value={item.id} disabled={disabled} className={styles.tab}>{item.icon ? <ActionIcon name={item.icon} /> : null}{item.label}</BaseTabs.Tab>)}
      <BaseTabs.Indicator className={styles.indicator}><LiquidLens radius={12}/></BaseTabs.Indicator>
    </BaseTabs.List></div>
    {actions?<div className={styles.toolbarActions}>{actions}</div>:null}</div>
    {items.map(item => <BaseTabs.Panel key={item.id} value={item.id} className={styles.panel}>{item.content}</BaseTabs.Panel>)}
  </BaseTabs.Root>
}
