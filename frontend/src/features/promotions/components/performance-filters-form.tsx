'use client'

import { useEffect, useRef, useState } from 'react'
import { DatePicker } from '@/components/ui/date-picker'
import { Field, Select } from '@/components/ui/input'
import type { PerformanceFilters, PerformanceReport } from '../performance-contract'
import styles from './performance-report.module.css'

const surfaces: Record<string, string> = { HOME: 'Início', SEARCH: 'Busca', NICHE: 'Categoria', ORGANIC: 'Orgânico', RELATED: 'Relacionados' }
export function PerformanceFiltersForm({ report, filters, onFiltersChange }: { report?: PerformanceReport; filters: PerformanceFilters; onFiltersChange?: (filters: PerformanceFilters) => void }) {
  const initial = { from: filters.from ?? report?.from ?? '', to: filters.to ?? report?.to ?? '', promotionId: filters.promotionId ?? '' }
  const [draft, setDraft] = useState(initial)
  const form = useRef<HTMLFormElement>(null)
  const submitted = useRef(JSON.stringify(initial))
  const { from, to, promotionId } = initial
  useEffect(() => {
    const next = { from, to, promotionId }
    submitted.current = JSON.stringify(next)
    setDraft(next)
  }, [from, to, promotionId])
  useEffect(() => {
    const serialized = JSON.stringify(draft)
    if (!onFiltersChange || serialized === submitted.current) return
    const timer = setTimeout(() => {
      if (!form.current?.checkValidity()) return
      submitted.current = serialized
      onFiltersChange(draft)
    }, 450)
    return () => clearTimeout(timer)
  }, [draft, onFiltersChange])
  return <form ref={form} className={styles.filters} method="get" aria-label="Filtrar relatório" onSubmit={event => { event.preventDefault(); if (form.current?.reportValidity()) { submitted.current = JSON.stringify(draft); onFiltersChange?.(draft) } }}>
    <Field label="De"><DatePicker name="from" value={draft.from} onChange={event => setDraft(previous => ({ ...previous, from: event.target.value }))} /></Field>
    <Field label="Até"><DatePicker name="to" value={draft.to} onChange={event => setDraft(previous => ({ ...previous, to: event.target.value }))} /></Field>
    <Field label="Campanha"><Select name="promotionId" value={draft.promotionId} onChange={event => setDraft(previous => ({ ...previous, promotionId: event.target.value }))}>
      <option value="">Todas as campanhas</option>
      {report?.campaigns.map(item => <option key={item.id} value={item.id}>{surfaces[item.surface] ?? item.surface} · {item.activatedAt.slice(0, 10).split('-').reverse().join('/')}{item.administrative ? ' · administrativo' : ''}</option>)}
    </Select></Field>
  </form>
}
