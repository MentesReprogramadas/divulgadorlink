'use client'

import { useEffect, useId, useRef, useState, type ComponentProps } from 'react'
import { Field, Select } from './input'
import { TabNavigation } from './tabs'
import type { ActionIcon } from './action-icon'
import styles from './responsive-tabs.module.css'

export function ResponsiveTabs<T extends string>({ value, onChange, label, items, idPrefix }: { value: T; onChange: (value: T) => void; label: string; items: Array<{ id: T; label: string; icon: ComponentProps<typeof ActionIcon>['name'] }>; idPrefix: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(false)
  const selectId = useId()
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const measure = () => {
      const list = root.querySelector('[role="tablist"]')
      setFits(!!list && root.clientWidth > 0 && list.scrollWidth <= root.clientWidth)
    }
    measure()
    void document.fonts?.ready.then(measure)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [items])
  return <div ref={ref} className={styles.root} data-responsive-area>
    <div className={fits ? styles.tabs : styles.measure} aria-hidden={!fits || undefined} inert={!fits}><TabNavigation value={value} onChange={onChange} label={label + ' em abas'} items={items} idPrefix={idPrefix} /></div>
    <div key={fits ? 'tabs' : 'select'} hidden={fits}><Field label={label} htmlFor={selectId}><Select id={selectId} value={value} onChange={event => { const selected = items.find(item => item.id === event.target.value); if (selected) onChange(selected.id) }}>{items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field></div>
  </div>
}
