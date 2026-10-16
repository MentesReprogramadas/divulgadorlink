'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { ReminderPreferenceForm } from './components/reminder-preference-form'
import { ReminderList } from './components/reminder-list'
import type { ReminderPreferences, RenewalRemindersData } from './reminder-contract'
import styles from './components/renewal-reminders.module.css'

type State = { kind: 'loading' | 'error' | 'denied' } | { kind: 'ready'; data: RenewalRemindersData }
export function RenewalRemindersScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' }), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true; setState({ kind: 'loading' })
    void api<RenewalRemindersData>('/v1/promotions/mine/reminders').then(result => { if (live) setState(result.status === 200 ? { kind: 'ready', data: result.body } : { kind: [401, 403, 404].includes(result.status) ? 'denied' : 'error' }) }).catch(() => { if (live) setState({ kind: 'error' }) })
    return () => { live = false }
  }, [attempt])
  async function save(emailRenewal: boolean) {
    if (state.kind !== 'ready') return
    const result = await api<ReminderPreferences & { message?: string }>('/v1/me/notification-preferences', { method: 'PATCH', body: JSON.stringify({ emailRenewal, expectedVersion: state.data.preferences.expectedVersion }) }).catch(() => { throw new Error('Sem conexão. Sua opção foi mantida; tente novamente.') })
    if (result.status !== 200) throw new Error(result.body.message ?? 'Não foi possível salvar. Atualize os dados e tente novamente.')
    setState({ kind: 'ready', data: { ...state.data, preferences: result.body } })
  }
  return <section className={styles.page}>
    <header><h2>Lembretes de renovação</h2><p className={styles.note}>Acompanhe o vencimento dos seus destaques. Renovar depende da sua confirmação; não há cobrança automática.</p></header>
    <div className={styles.actions}><a href="/painel">Voltar ao painel</a><Button variant="secondary" disabled={state.kind === 'loading'} onClick={() => setAttempt(x => x + 1)}>Atualizar dados</Button></div>
    {state.kind === 'loading' ? <p role="status">Carregando lembretes…</p> : null}
    {state.kind === 'error' ? <ErrorState onRetry={() => setAttempt(x => x + 1)} /> : null}
    {state.kind === 'denied' ? <p role="alert">Lembretes indisponíveis para esta conta.</p> : null}
    {state.kind === 'ready' ? <><section aria-label="Preferências de e-mail"><h3>E-mail opcional</h3><ReminderPreferenceForm key={attempt} enabled={state.data.preferences.emailRenewal} onSave={save} /></section><section aria-label="Destaques perto do vencimento"><h3>Próximos vencimentos</h3><ReminderList reminders={state.data.reminders} /></section></> : null}
  </section>
}
export function RenewalReminderNotice() {
  const [count, setCount] = useState(0)
  useEffect(() => { let live = true; void api<RenewalRemindersData>('/v1/promotions/mine/reminders').then(r => { if (live && r.status === 200) setCount(r.body.reminders.length) }).catch(() => {}); return () => { live = false } }, [])
  if (!count) return null
  return <aside className={styles.notice} aria-label="Aviso de vencimento"><p>{count === 1 ? 'Um destaque está perto de terminar.' : `${count} destaques estão perto de terminar.`} <a href="/painel/lembretes">Ver lembretes de renovação</a></p></aside>
}
