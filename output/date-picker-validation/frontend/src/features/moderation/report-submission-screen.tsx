'use client'

import { ReportSubmissionSkeleton } from './components/report-skeleton'

import { useEffect, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { AgeWall } from '@/components/domain/age-gate'
import { api } from '@/lib/api'
import { ReportForm } from './components/report-form'
import type { ReportFormProps, ReportReceipt } from './report-contract'

type LinkContext = { available: boolean; name?: string; niche?: { requiresAge?: boolean } }
export function ReportSubmissionScreen({ linkId }: { linkId: string }) {
  const [state, setState] = useState<{ kind: 'loading' | 'error' | 'denied' } | { kind: 'ready'; link: LinkContext }>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    setState({ kind: 'loading' })
    void api<LinkContext>('/v1/links/' + encodeURIComponent(linkId)).then(result => {
      if (current) setState(result.status === 200 && result.body.available && result.body.name ? { kind: 'ready', link: result.body } : { kind: [200, 403, 404].includes(result.status) ? 'denied' : 'error' })
    }).catch(() => { if (current) setState({ kind: 'error' }) })
    return () => { current = false }
  }, [linkId, attempt])
  const submit: ReportFormProps['onSubmit'] = async input => {
    let result
    try { result = await api<{ report: ReportReceipt; message?: string }>('/v1/links/' + encodeURIComponent(linkId) + '/reports', { method: 'POST', body: JSON.stringify(input) }) }
    catch { throw new Error('Sem conexão. Seu comentário foi mantido; tente novamente.') }
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível enviar. Seu comentário foi mantido.')
    return result.body.report
  }
  return <>
    <p><a href={'/link/' + encodeURIComponent(linkId)}>Voltar ao link</a></p>
    {state.kind === 'loading' ? <ReportSubmissionSkeleton /> : null}
    {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(value => value + 1)} /> : null}
    {state.kind === 'denied' ? <p role="alert">Link indisponível para denúncia.</p> : null}
    {state.kind === 'ready' ? <AgeWall required={state.link.niche?.requiresAge === true}><ReportForm name={state.link.name!} onSubmit={submit} /></AgeWall> : null}
  </>
}
