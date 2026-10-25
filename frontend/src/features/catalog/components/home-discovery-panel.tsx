'use client'

import { useState } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import { DiscoveryFilters } from '../discovery/discovery-filters'
import type { DiscoveryValues } from '../discovery/discovery-contract'
import styles from './ondas-catalog.module.css'

export function HomeDiscoveryPanel({ filters }: { filters: DiscoveryValues }) {
  const [open, setOpen] = useState(Object.values(filters).some(Boolean))
  return <details className={styles.discoveryPanel} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><LiquidLens radius={12} /><ActionIcon name="filter" width={18} height={18} />Localização e preferências</summary>
    <DiscoveryFilters initial={filters} />
  </details>
}
