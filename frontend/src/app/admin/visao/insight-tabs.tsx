'use client'

import { TabNavigation } from '@/components/ui/tabs'

export function InsightTabs<T extends string>({ name, label, tabs, current, onChange }: {
  name: string; label: string; tabs: Array<{ id: T; label: string }>; current: T; onChange: (id: T) => void
}) {
  return <TabNavigation idPrefix={'insight-' + name} label={label} items={tabs} value={current} onChange={onChange} />
}

export function panelProps(name: string, id: string) {
  return { role: 'tabpanel' as const, id: `insight-${name}-panel-${id}`, 'aria-labelledby': `insight-${name}-${id}` }
}
