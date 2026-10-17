'use client'

import { ReportQueueSkeleton } from './components/report-skeleton'

import { ActionIcon } from '@/components/ui/action-icon'

import { useEffect, useRef, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/input'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { WorkspaceActions, WorkspaceFilters } from '@/components/layout/workspace-controls'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { useResourceState } from '@/lib/use-resource-state'
import { api } from '@/lib/api'
import { REPORT_STATUS, type ReportQueueFilters, type ReportQueueRow } from './report-contract'
import { ReportCard, type ReportDecisionInput } from './components/report-card'
import styles from './components/reports.module.css'

type QueueData = { reports: ReportQueueRow[]; nextCursor: string | null }
type QueueState = { kind: 'loading' | 'error' | 'denied' | 'invalid' } | { kind: 'ready'; data: QueueData }
function queryFor(filters: ReportQueueFilters) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value)
  return query.toString()
}
export function ReportQueue({ filters }: { filters: ReportQueueFilters }) {
  const { status, kind, cursor } = filters
  const { state, setState, refreshing, start } = useResourceState<QueueState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0), [notice, setNotice] = useState('')
  const heading = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    let current = true
    start(queryFor({ status, kind, cursor }))
    void api<QueueData>('/v1/admin/reports?' + queryFor({ status, kind, cursor })).then(result => {
      if (current) setState(result.status === 200 ? { kind: 'ready', data: result.body } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : result.status === 400 ? 'invalid' : 'error' })
    }).catch(() => { if (current) setState({ kind: 'error' }) })
    return () => { current = false }
  }, [status, kind, cursor, attempt, start, setState])
  useEffect(() => { if (state.kind === 'ready' && notice) heading.current?.focus() }, [state, notice])
  async function decide(id: string, input: ReportDecisionInput) {
    const result = await api<{ message?: string }>('/v1/admin/reports/' + encodeURIComponent(id) + '/decision', { method: 'PATCH', body: JSON.stringify(input) }).catch(() => { throw new Error('Sem conexão. Sua justificativa foi mantida; tente novamente.') })
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível salvar. Tente novamente.')
    setNotice('Decisão salva.'); setAttempt(value => value + 1)
  }
  return <div className={styles.queue} aria-busy={refreshing}>
    {state.kind === 'denied' ? <p role="alert">Fila indisponível para esta conta.</p> : <>
      <WorkspaceActions><Button type="submit" form="report-filters"><ActionIcon name="filter" />Aplicar filtros</Button><RefreshButton label="Atualizar fila" disabled={refreshing || state.kind === 'loading'} onClick={() => setAttempt(value => value + 1)} /><ButtonLink variant="secondary" href="/admin/denuncias"><ActionIcon name="resetFilters" />Limpar filtros</ButtonLink></WorkspaceActions>
      <WorkspaceFilters method="get" id="report-filters" label="Filtrar denúncias">
        <Field label="Tipo"><Select name="kind" defaultValue={kind ?? ''}><option value="">Todos</option><option value="AVAILABILITY">Disponibilidade</option><option value="CONTENT">Conteúdo</option></Select></Field>
        <Field label="Estado"><Select name="status" defaultValue={status ?? ''}><option value="">Todos</option>{Object.entries(REPORT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
      </WorkspaceFilters>

      {notice ? <p role="status" ref={heading} tabIndex={-1}>{notice}</p> : null}
      {state.kind === 'loading' ? <ReportQueueSkeleton /> : null}
      {state.kind === 'invalid' ? <p role="alert">Filtros inválidos. Revise as opções ou limpe os filtros.</p> : null}
      {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(value => value + 1)} /> : null}
      {state.kind === 'ready' ? <>{state.data.reports.length ? state.data.reports.map(report => <ReportCard key={report.id} report={report} onDecision={input => decide(report.id, input)} />) : <EmptyState />}{state.data.nextCursor ? <ButtonLink variant="secondary" href={'/admin/denuncias?' + queryFor({ status, kind, cursor: state.data.nextCursor })}><ActionIcon name="next" />Próximas denúncias</ButtonLink> : null}</> : null}
    </>}
  </div>
}
