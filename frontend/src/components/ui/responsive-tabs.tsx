'use client'

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Field, Select } from './input'
import { TabNavigation } from './tabs'
import type { ActionIcon } from './action-icon'
import styles from './responsive-tabs.module.css'

export function ResponsiveTabs<T extends string>({ value, onChange, label, items, idPrefix, actions }: { actions?:ReactNode; value: T; onChange: (value: T) => void; label: string; items: Array<{ id: T; label: string; icon: ComponentProps<typeof ActionIcon>['name'] }>; idPrefix: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const toolbar = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(false)
  const [tabsWidth,setTabsWidth]=useState(0)
  const selectId = useId()
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const measure = () => {
      const list = root.querySelector('[role="tablist"]')
      const width=list?Math.max(list.scrollWidth,list.getBoundingClientRect().width):0
      // Actions wrap to their own line before tabs that fit are replaced by a select.
      const available=toolbar.current?.clientWidth??0
      setTabsWidth(Math.ceil(width))
      setFits(width>0&&available>0&&Math.ceil(width)<=available)
    }
    measure()
    void document.fonts?.ready.then(measure)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    if(toolbar.current)observer.observe(toolbar.current)
    return () => observer.disconnect()
  }, [items])
  return <div ref={toolbar} className={styles.toolbar}><div ref={ref} className={styles.root} style={fits?{flexBasis:tabsWidth,flexShrink:0}:undefined} data-responsive-area>
    <div className={fits ? styles.tabs : styles.measure} aria-hidden={!fits || undefined} inert={!fits}><TabNavigation value={value} onChange={onChange} label={label + ' em abas'} items={items} idPrefix={idPrefix} /></div>
    <div key={fits ? 'tabs' : 'select'} hidden={fits}><Field label={label} htmlFor={selectId}><Select id={selectId} value={value} onChange={event => { const selected = items.find(item => item.id === event.target.value); if (selected) onChange(selected.id) }}>{items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field></div>
  </div>{actions?<div className={styles.actions}>{actions}</div>:null}</div>
}
