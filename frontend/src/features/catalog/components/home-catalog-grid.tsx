'use client'

import { Children, useLayoutEffect, useRef, type ReactNode } from 'react'
import styles from './home-catalog-grid.module.css'

export function HomeCatalogGrid({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const grid = ref.current
    if (!grid || typeof ResizeObserver === 'undefined') return
    const items = Array.from(grid.children) as HTMLElement[]
    const measure = (item: HTMLElement) => {
      // Layout pixels keep the row span stable when the page is zoomed.
      item.style.gridRowEnd = `span ${Math.max(1, item.offsetHeight)}`
    }
    items.forEach(measure)
    grid.dataset.packed = ''
    const observer = new ResizeObserver(entries => {
      entries.forEach(entry => measure(entry.target as HTMLElement))
    })
    items.forEach(item => observer.observe(item))
    return () => observer.disconnect()
  }, [children])

  return <div ref={ref} className={styles.grid}>{Children.map(children, child => <div className={styles.item}>{child}</div>)}</div>
}
