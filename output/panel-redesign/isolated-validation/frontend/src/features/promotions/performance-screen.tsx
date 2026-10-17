'use client'

import { PerformanceSkeleton } from './components/performance-skeleton'
import { useResourceState } from '@/lib/use-resource-state'

import { ActionIcon } from '@/components/ui/action-icon'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { PerformanceFiltersForm, PerformanceReport } from './components/performance-report'
import type { PerformanceFilters, PerformanceReport as Report } from './performance-contract'

export function PerformanceScreen({ linkId, filters }: { linkId: string; filters: PerformanceFilters }) {
  const { from, to, promotionId } = filters
  const { state, setState, refreshing, start } = useResourceState<{ kind: 'loading' | 'error' | 'denied' } | { kind: 'invalid'; message: string } | { kind: 'ready'; report: Report }>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries({ from, to, promotionId })) if (value) query.set(key, value)
    start(JSON.stringify([linkId, from, to, promotionId]))
    void api<Report & { message?: string }>('/v1/analytics/links/' + encodeURIComponent(linkId) + '/performance?' + query).then(result => {
      if (!current) return
      setState(result.status === 200 ? { kind: 'ready', report: result.body } : result.status === 400 ? { kind: 'invalid', message: result.body.message ?? 'Período inválido.' } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : 'error' })
    }).catch(() => { if (current) setState({ kind: 'error' }) })
    return () => { current = false }
  }, [linkId, from, to, promotionId, attempt, start, setState])
  return <>
    <p><a href="/painel/links">Voltar aos seus links</a></p>
    {state.kind === 'ready' ? <p><Button type="button" variant="secondary" disabled={refreshing} onClick={() => setAttempt(value => value + 1)}><ActionIcon name="refresh" />Atualizar relatório</Button></p> : null}
    {state.kind === 'loading' ? <PerformanceSkeleton filters={filters} /> : null}
    {state.kind === 'denied' ? <p role="alert">Relatório indisponível para esta conta.</p> : null}
    {state.kind === 'error' ? <><h2>Resultado do destaque</h2><PerformanceFiltersForm filters={filters} /><ErrorState onRetry={() => setAttempt(value => value + 1)} /></> : null}
    {state.kind === 'invalid' ? <><h2>Resultado do destaque</h2><p role="alert">{state.message}</p><PerformanceFiltersForm filters={filters} /></> : null}
    {state.kind === 'ready' ? <PerformanceReport report={state.report} filters={filters} /> : null}
  </>
}
