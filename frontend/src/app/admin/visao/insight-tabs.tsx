'use client'

import { useRef, type KeyboardEvent } from 'react'

export function InsightTabs<T extends string>({
  name,
  label,
  tabs,
  current,
  onChange,
}: {
  name: string
  label: string
  tabs: Array<{ id: T; label: string }>
  current: T
  onChange: (id: T) => void
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function move(event: KeyboardEvent, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
    onChange(tabs[next]!.id)
    refs.current[next]?.focus()
  }

  return (
    <div className="insight-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => { refs.current[index] = node }}
          type="button"
          role="tab"
          id={`insight-${name}-${tab.id}`}
          aria-selected={current === tab.id}
          aria-controls={`insight-panel-${name}-${tab.id}`}
          tabIndex={current === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => move(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function panelProps(name: string, id: string) {
  return {
    role: 'tabpanel' as const,
    id: `insight-panel-${name}-${id}`,
    'aria-labelledby': `insight-${name}-${id}`,
  }
}
