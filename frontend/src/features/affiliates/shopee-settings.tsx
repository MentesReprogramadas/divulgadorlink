'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { affiliateRequest, localDate } from './contracts'
import styles from './affiliates.module.css'

export type ShopeeStatus = { provider: 'SHOPEE'; configured: boolean; connected: boolean; status: string; accountLabel: string; subIds: string[]; updatedAt: string | null }

export function ShopeeSettings({ status, onChanged }: { status: ShopeeStatus | null; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false), [disconnect, setDisconnect] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [appId, setAppId] = useState(''), [secret, setSecret] = useState(''), [accountLabel, setAccountLabel] = useState(status?.accountLabel ?? ''), [subIds, setSubIds] = useState(status?.subIds?.join(', ') ?? '')
  const lock = useRef(false), trigger = useRef<HTMLElement | null>(null)
  async function perform(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { await action() } catch { setError('Não foi possível concluir a operação com a Shopee. Confira a conexão e as credenciais e tente novamente.') }
    finally { lock.current = false; setBusy(false) }
  }
  function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = subIds.split(',').map(value => value.trim()).filter(Boolean)
    if (values.length > 5 || values.some(value => !/^[A-Za-z0-9_-]{1,50}$/.test(value))) { setError('Use até 5 identificadores com até 50 letras, números, hífen ou sublinhado cada.'); return }
    void perform(async () => {
      await affiliateRequest('/catalog/shopee', 'PUT', { appId: appId.trim(), secret, accountLabel: accountLabel.trim(), subIds: values })
      setAppId(''); setSecret(''); await onChanged(); setEditing(false); setNotice('Credenciais salvas. Verifique a conexão antes de usar a Shopee.')
    })
  }
  return <section className={styles.catalogConnection} aria-labelledby="shopee-settings-title">
    <h3 id="shopee-settings-title">Shopee Afiliados</h3>
    <p>{!status ? 'Não foi possível conferir a integração.' : status.connected ? 'Conexão verificada' : status.configured ? 'Configurada; verificação pendente' : 'Credenciais não configuradas'}{status?.accountLabel ? ` · ${status.accountLabel}` : ''}</p>
    <p>Use as credenciais da Open API de afiliados da sua conta Shopee. Elas ficam no servidor desta operação.</p>
    {status?.updatedAt ? <p className={styles.muted}>Atualizada em {localDate(status.updatedAt)}</p> : null}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}{notice ? <p role="status" className={styles.notice}>{notice}</p> : null}
    <div className={styles.actions}>
      <Button variant="secondary" disabled={busy} onClick={() => void perform(onChanged)}>Atualizar Shopee</Button>
      <Button variant="secondary" disabled={busy} onClick={() => { setAccountLabel(status?.accountLabel ?? ''); setSubIds(status?.subIds?.join(', ') ?? ''); setEditing(value => !value); setAppId(''); setSecret(''); setError('') }}>{editing ? 'Cancelar configuração Shopee' : 'Configurar Shopee'}</Button>
      {status?.configured ? <><Button variant="secondary" disabled={busy} onClick={() => void perform(async () => { await affiliateRequest('/catalog/shopee/verify', 'POST', {}); await onChanged(); setNotice('Verificação concluída. Confira o estado da conexão acima.') })}>Verificar conexão Shopee</Button><Button variant="ghost" disabled={busy} onClick={event => { trigger.current = event.currentTarget; setDisconnect(true) }}>Desconectar Shopee</Button></> : null}
    </div>
    {editing ? <form className={styles.form} onSubmit={configure}>
      <Field label="Identificação da conta Shopee" hint="Um nome para reconhecer esta conta no painel."><Input value={accountLabel} onChange={event => setAccountLabel(event.target.value)} required maxLength={80} disabled={busy} autoComplete="off" /></Field>
      <Field label="App ID Shopee" hint="De 4 a 32 números."><Input value={appId} onChange={event => setAppId(event.target.value)} type="password" inputMode="numeric" pattern="[0-9]{4,32}" required minLength={4} maxLength={32} disabled={busy} autoComplete="new-password" /></Field>
      <Field label="Segredo Shopee"><Input value={secret} onChange={event => setSecret(event.target.value)} type="password" required minLength={8} maxLength={512} disabled={busy} autoComplete="new-password" /></Field>
      <Field label="Identificadores de atribuição (Sub IDs)" hint="Opcional. Até 5 identificadores separados por vírgulas."><Input value={subIds} onChange={event => setSubIds(event.target.value)} maxLength={600} disabled={busy} autoComplete="off" /></Field>
      <Button type="submit" loading={busy} disabled={busy}>Salvar credenciais Shopee</Button>
    </form> : null}
    <OverlayDialog open={disconnect} title="Desconectar Shopee?" onClose={() => { if (!busy) setDisconnect(false) }} closeDisabled={busy} returnFocusTo={trigger.current}>
      <p>As credenciais serão removidas desta operação. Novos produtos e links da Shopee dependem de uma nova configuração. As ofertas e o histórico permanecem.</p>
      <Button variant="danger" loading={busy} onClick={() => void perform(async () => { await affiliateRequest('/catalog/shopee', 'DELETE'); await onChanged(); setDisconnect(false); setNotice('Shopee desconectada.') })}>Confirmar desconexão Shopee</Button>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </OverlayDialog>
  </section>
}
