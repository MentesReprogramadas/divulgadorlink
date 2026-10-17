'use client'

import { ReminderSkeleton } from './components/reminder-skeleton'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'

import { ActionIcon } from '@/components/ui/action-icon'
import { useEffect, useState } from 'react'
import { useResourceState } from '@/lib/use-resource-state'
import { api } from '@/lib/api'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { Button } from '@/components/ui/button'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { ErrorState } from '@/components/feedback/error-state'
import { ReminderPreferenceForm } from './components/reminder-preference-form'
import { ReminderList } from './components/reminder-list'
import type { ReminderPreferences, RenewalRemindersData } from './reminder-contract'
import styles from './components/renewal-reminders.module.css'

type State = { kind: 'loading' | 'error' | 'denied' } | { kind: 'ready'; data: RenewalRemindersData }
export function RenewalRemindersScreen() {
  const [editing, setEditing] = useState(false)
  const { state, setState, refreshing, start } = useResourceState<State>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true; start('reminders')
    void api<RenewalRemindersData>('/v1/promotions/mine/reminders').then(result => { if (live) setState(result.status === 200 ? { kind: 'ready', data: result.body } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : 'error' }) }).catch(() => { if (live) setState({ kind: 'error' }) })
    return () => { live = false }
  }, [attempt, start, setState])
  async function save(emailRenewal: boolean) {
    if (state.kind !== 'ready') return
    const result = await api<ReminderPreferences & { message?: string }>('/v1/me/notification-preferences', { method: 'PATCH', body: JSON.stringify({ emailRenewal, expectedVersion: state.data.preferences.expectedVersion }) }).catch(() => { throw new Error('Sem conexão. Sua opção foi mantida; tente novamente.') })
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível salvar. Atualize os dados e tente novamente.')
    setState({ kind: 'ready', data: { ...state.data, preferences: result.body } })
  }
  return <section className={styles.page} aria-busy={refreshing}>
    <WorkspaceActions>{state.kind === 'ready' ? <Button variant="secondary" onClick={() => setEditing(true)}><ActionIcon name="settings" />Configurar avisos</Button> : null}<RefreshButton disabled={refreshing || state.kind === 'loading'} onClick={() => setAttempt(value => value + 1)} /></WorkspaceActions>

    {state.kind === 'loading' ? <ReminderSkeleton /> : null}
    {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(x => x + 1)} /> : null}
    {state.kind === 'denied' ? <p role="alert">Lembretes indisponíveis para esta conta.</p> : null}
    {state.kind === 'ready' ? <><section aria-label="Destaques perto do vencimento"><ReminderList reminders={state.data.reminders} /></section><OverlayDialog open={editing} title="Preferências de e-mail" onClose={() => setEditing(false)}><p className={styles.note}>Renovar depende da sua confirmação. Não há cobrança automática.</p><ReminderPreferenceForm key={attempt} enabled={state.data.preferences.emailRenewal} onSave={save} /></OverlayDialog></> : null}
  </section>
}
export function RenewalReminderNotice() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => { let live = true; void api<RenewalRemindersData>('/v1/promotions/mine/reminders').then(r => { if (live) setCount(r.status === 200 ? r.body.reminders.length : 0) }).catch(() => { if (live) setCount(0) }); return () => { live = false } }, [])
  if (count === null) return <aside className={styles.notice}><SkeletonRegion><Skeleton height={26} /></SkeletonRegion></aside>
  if (!count) return null
  return <aside className={styles.notice} aria-label="Aviso de vencimento"><p>{count === 1 ? 'Um destaque está perto de terminar.' : `${count} destaques estão perto de terminar.`} <a href="/painel/lembretes">Ver lembretes de renovação</a></p></aside>
}
