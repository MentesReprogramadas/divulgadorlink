'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { affiliateRequest, localDate } from './contracts'
import styles from './affiliates.module.css'

type GroupPolicy = { enabled: boolean; disappearingSeconds: 0 | 86400 | 604800 | 7776000; joinApproval: boolean; autoApproveDelaySeconds: number; groups: Array<{ id: string; name: string; groupPolicyState: string; groupPolicyErrorCode: string | null; groupPolicyNextRunAt: string | null }> }
const states: Record<string, string> = { PENDING: 'Aplicação pendente', PAUSED: 'Automação pausada', ACTIVE: 'Aplicada', WAITING_CONNECTION: 'Aguardando conexão do WhatsApp', UNSUPPORTED: 'Extensão do provedor necessária; aplicação pendente', ERROR: 'Falha na aplicação', ATTENTION: 'Conferência necessária' }
const errors: Record<string, string> = { connection_unavailable: 'Conecte a conta do WhatsApp para continuar.', admission_extension_required: 'O provedor atual precisa da extensão de aprovação. A configuração ainda não está ativa.', ephemeral_unsupported: 'O provedor atual não confirmou suporte a mensagens temporárias.', provider_rejected: 'O provedor recusou a alteração. Confira o grupo no WhatsApp.', admission_response_uncertain: 'A resposta de aprovação foi incerta. Confira no WhatsApp antes de tentar novamente.' }

export function GroupPolicySettings({ segmentId, pending }: { segmentId: string; pending: (value: boolean) => void }) {
  const [policy, setPolicy] = useState<GroupPolicy | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const [enabled, setEnabled] = useState(false), [disappearingSeconds, setDisappearingSeconds] = useState<GroupPolicy['disappearingSeconds']>(604800), [joinApproval, setJoinApproval] = useState(true), [delay, setDelay] = useState('120')
  const lock = useRef(false), active = useRef(true)
  const path = '/segments/' + encodeURIComponent(segmentId) + '/group-policy'
  useEffect(() => {
    const controller = new AbortController(); active.current = true
    void affiliateRequest<GroupPolicy>(path, 'GET', undefined, controller.signal).then(result => { if (controller.signal.aborted) return; if (typeof result.enabled !== 'boolean' || !Array.isArray(result.groups)) throw new Error('Invalid group policy'); setPolicy(result); setEnabled(result.enabled); setDisappearingSeconds(result.disappearingSeconds); setJoinApproval(result.joinApproval); setDelay(String(result.autoApproveDelaySeconds)); setError('') }).catch(() => { if (!controller.signal.aborted) setError('Não foi possível consultar a política dos grupos. Tente atualizar.') })
    return () => { active.current = false; controller.abort() }
  }, [path, revision])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || !policy) return
    const seconds = Number(delay)
    if (!Number.isInteger(seconds) || seconds < 120 || seconds > 86400) { setError('Use um intervalo inteiro entre 120 e 86400 segundos.'); return }
    lock.current = true; setBusy(true); pending(true); setError(''); setNotice('')
    try { await affiliateRequest(path, 'PUT', { enabled, disappearingSeconds, joinApproval, autoApproveDelaySeconds: seconds }); if (active.current) { setNotice('Preferências salvas. Confira abaixo a aplicação em cada grupo.'); setRevision(value => value + 1) } }
    catch { if (active.current) setError('Não foi possível salvar a política. Seus dados foram mantidos.') }
    finally { lock.current = false; if (active.current) { setBusy(false); pending(false) } }
  }
  return <section className={styles.catalogConnection} aria-labelledby="group-policy-title">
    <h3 id="group-policy-title">Entrada e mensagens dos grupos</h3>
    <p>Defina a política desejada. Ela só estará aplicada quando o WhatsApp e o provedor confirmarem cada grupo.</p>
    <p className={styles.warning}>A aprovação automática exige uma extensão do provedor. Enquanto ela não estiver disponível, a aprovação permanece pendente.</p>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}{notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    <Button variant="secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Atualizar política dos grupos</Button>
    {!policy && !error ? <p role="status">Consultando política dos grupos…</p> : null}
    {policy ? <form className={styles.form} onSubmit={event => void save(event)}>
      <label className={styles.check}><Input type="checkbox" checked={enabled} disabled={busy} onChange={event => setEnabled(event.target.checked)} />Automatizar esta política nos grupos</label>
      <Field label="Mensagens temporárias"><Select value={String(disappearingSeconds)} disabled={busy} onChange={event => setDisappearingSeconds(Number(event.target.value) as GroupPolicy['disappearingSeconds'])}><option value="0">Desativadas</option><option value="86400">24 horas</option><option value="604800">7 dias</option><option value="7776000">90 dias</option></Select></Field>
      <label className={styles.check}><Input type="checkbox" checked={joinApproval} disabled={busy} onChange={event => setJoinApproval(event.target.checked)} />Exigir aprovação para entrar pelo convite</label>
      <Field label="Espera antes da aprovação automática (segundos)" hint="Entre 120 segundos (2 minutos) e 86400 segundos (24 horas). Depende do suporte do provedor."><Input type="number" required min={120} max={86400} step={1} value={delay} disabled={busy} onChange={event => setDelay(event.target.value)} /></Field>
      <p className={styles.muted}>Pausar a automação não desfaz configurações já aplicadas no WhatsApp.</p>
      <Button loading={busy} disabled={busy} type="submit">Salvar política dos grupos</Button>
    </form> : null}
    {policy?.groups.length ? <ul>{policy.groups.map(group => <li key={group.id}><strong>{group.name}</strong> · {states[group.groupPolicyState] ?? 'Estado não confirmado'}{group.groupPolicyErrorCode ? <p>{errors[group.groupPolicyErrorCode] ?? 'Confira o estado deste grupo no WhatsApp.'}</p> : null}{group.groupPolicyNextRunAt ? <p className={styles.muted}>Próxima verificação: {localDate(group.groupPolicyNextRunAt)}</p> : null}</li>)}</ul> : policy ? <p className={styles.muted}>Nenhum grupo para aplicar esta política.</p> : null}
  </section>
}
