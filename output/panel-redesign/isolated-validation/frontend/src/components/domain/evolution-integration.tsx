'use client'

import { EvolutionIntegrationSkeleton } from './evolution-integration-skeleton'

import { ActionIcon } from '@/components/ui/action-icon'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { WorkspaceActions } from '@/components/layout/workspace-controls'
import { WorkspaceSection } from '@/components/layout/workspace-section'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { EmptyState } from '@/components/feedback/empty-state'
import styles from './evolution-integration.module.css'
import { ErrorState } from '@/components/feedback/error-state'

type Message = { id: string; kind: string; state: string; attempts: number; lastErrorCode: string | null; createdAt: string }
type Status = { configured: boolean; enabled: boolean; actionsEnabled: boolean; instance: string; group: string; connection?: string; backlog: number; version: string | null; messages: Message[]; operators: { phone: string; enabled: boolean }[]; allowedPhones: string[] }
const STATES: Record<string, string> = { PENDING: 'Aguardando', PROCESSING: 'Enviando', SENT: 'Enviado', RETRY: 'Nova tentativa agendada', UNCERTAIN: 'Entrega incerta', DEAD: 'Precisa de atenção', CANCELLED: 'Revisão desatualizada' }
const KINDS: Record<string, string> = { REVIEW_CASE: 'Revisão de link', REVIEW_TEXT: 'Revisão de texto', DECISION: 'Decisão de moderação', REFUND_FAILED: 'Falha de estorno', COMMAND_RESULT: 'Resposta ao comando', RECOVERY: 'Integração recuperada' }

export function EvolutionIntegration() {
  const [data, setData] = useState<Status | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [uncertain, setUncertain] = useState<string | null>(null)
  async function load() {
    try {
      const response = await api<Status>('/v1/admin/integrations/evolution/status')
      if (response.status === 200) { setData(response.body); setError('') }
      else setError('Não foi possível carregar a integração.')
    } catch { setError('Não foi possível carregar a integração.') }
  }
  useEffect(() => { void load() }, [])
  async function mutate(path: string, body: unknown, method = 'POST') {
    if (busy) return
    setBusy(true); setNotice(''); setError('')
    try {
      const response = await api<{ message?: string }>(path, { method, body: JSON.stringify(body) })
      if (response.status !== 200) { setError(response.body.message ?? 'Não foi possível salvar. Atualize e tente novamente.'); return }
      setNotice('Alteração salva.'); setUncertain(null); await load()
    } catch { setError('Não foi possível salvar. Verifique sua conexão e tente novamente.') }
    finally { setBusy(false) }
  }
  if (!data) return error ? <ErrorState onRetry={() => void load()} /> : <EvolutionIntegrationSkeleton />
  return <section className={styles.page} aria-label="Integração WhatsApp">
    <WorkspaceActions>
      <Button disabled={busy || !data.configured} onClick={() => void mutate('/v1/admin/integrations/evolution/settings', { enabled: !data.enabled, actionsEnabled: data.actionsEnabled, version: data.version }, 'PATCH')}><ActionIcon name="bell" />{data.enabled ? 'Desativar avisos' : 'Ativar avisos'}</Button>
      <Button variant="secondary" disabled={busy || !data.configured || !data.enabled} onClick={() => void mutate('/v1/admin/integrations/evolution/settings', { enabled: data.enabled, actionsEnabled: !data.actionsEnabled, version: data.version }, 'PATCH')}><ActionIcon name="commands" />{data.actionsEnabled ? 'Desativar comandos' : 'Ativar comandos'}</Button>
      <RefreshButton label="Atualizar estado" disabled={busy} onClick={() => void load()} />
    </WorkspaceActions>
    <WorkspaceSection title="Avisos e moderação pelo WhatsApp">
    {error ? <p role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    <dl className={styles.details}><dt>Configuração</dt><dd>{data.configured ? 'Configurada no servidor' : 'Configuração pendente no servidor'}</dd><dt>Instância</dt><dd>{data.instance || 'Não definida'}</dd><dt>Grupo</dt><dd>{data.group || 'Não definido'}</dd><dt>Integração</dt><dd>{data.enabled ? 'Avisos ativados' : 'Avisos desativados'}</dd><dt>Comandos</dt><dd>{data.actionsEnabled ? 'Aprovação e recusa ativadas' : 'Comandos desativados'}</dd><dt>Entregas pendentes ou com falha</dt><dd>{data.backlog}</dd></dl>
    </WorkspaceSection>
    <WorkspaceSection title="Operadores autorizados">
    <p>Conexão: {data.connection === 'open' ? 'conectada' : data.connection === 'close' ? 'desconectada' : data.connection === 'connecting' ? 'conectando' : 'não foi possível consultar'}.</p>
    <p>Os números permitidos são definidos no servidor. Ao vincular, o número passa a usar sua conta administradora; revogar impede novos comandos imediatamente.</p>
    {data.allowedPhones.length === 0 ? <EmptyState /> : <ul className={styles.operators}>{data.allowedPhones.map(phone => {
      const bound = data.operators.find(o => o.phone === phone && o.enabled)
      return <li key={phone}>Final {phone.slice(-4)} — {bound ? 'Vinculado' : 'Não vinculado'} <Button variant="secondary" disabled={busy} onClick={() => void mutate(`/v1/admin/integrations/evolution/operators/${phone}`, { enabled: !bound })}><ActionIcon name="access" />{bound ? `Revogar final ${phone.slice(-4)}` : `Vincular final ${phone.slice(-4)}`}</Button></li>
    })}</ul>}
    </WorkspaceSection>
    <WorkspaceSection title="Histórico de entregas">
    <p>Enviado indica aceite pelo provedor, sem confirmar leitura. Em uma entrega incerta, confira o grupo antes de reenviar.</p>
    {data.messages.length === 0 ? <EmptyState /> : <div className="link-list">{data.messages.map(message => <article key={message.id} className="link-card">
      <h4>{KINDS[message.kind] ?? 'Aviso operacional'}</h4><p>{STATES[message.state] ?? message.state} · {message.attempts} tentativa(s)</p>
      {message.lastErrorCode ? <p>Código: {message.lastErrorCode}</p> : null}
      {['RETRY', 'DEAD', 'UNCERTAIN'].includes(message.state) ? uncertain === message.id ? <div><p>Você conferiu o grupo? Reenviar pode duplicar uma mensagem já entregue.</p><Button disabled={busy} onClick={() => void mutate(`/v1/admin/integrations/evolution/deliveries/${message.id}/retry`, { confirmUncertain: true })}><ActionIcon name="check" />Confirmar reenvio</Button><Button variant="ghost" disabled={busy} onClick={() => setUncertain(null)}><ActionIcon name="close" />Cancelar</Button></div> : <Button variant="secondary" disabled={busy} onClick={() => message.state === 'UNCERTAIN' ? setUncertain(message.id) : void mutate(`/v1/admin/integrations/evolution/deliveries/${message.id}/retry`, {})}><ActionIcon name="refresh" />Reprocessar entrega</Button> : null}
    </article>)}</div>}
    </WorkspaceSection>
  </section>
}
