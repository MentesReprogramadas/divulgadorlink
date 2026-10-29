'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'
import type { AffiliateInstance } from './contracts'
import styles from './connection-card.module.css'

type Action = (element: HTMLElement) => void
type ConnectionCardProps = {
  instance: AffiliateInstance; state: string; busy: boolean; segmentCount: number
  onConnect: Action; onRefresh: Action; onEdit: Action; onToggle: Action; onViewSegments: Action
}

export function ConnectionCard({ instance, state, busy, segmentCount, onConnect, onRefresh, onEdit, onToggle, onViewSegments }: ConnectionCardProps) {
  const details = useRef<HTMLDetailsElement>(null), summary = useRef<HTMLElement>(null)
  const checking = state === 'checking', connected = instance.enabled && instance.configured && state === 'open'
  const label = !instance.enabled ? 'Pausada' : !instance.configured ? 'Configuração pendente' : connected ? 'Conectada' : checking ? 'Conferindo conexão…' : state === 'close' ? 'Desconectada' : state === 'connecting' ? 'Aguardando leitura do QR' : 'Estado indisponível'
  const hint = !instance.enabled ? 'Ative esta conta para utilizá-la nos grupos.' : !instance.configured ? 'Esta conta aguarda a configuração da integração no servidor.' : connected ? 'Pronta para os grupos das suas segmentações.' : checking ? 'Aguarde a confirmação do WhatsApp.' : state === 'close' ? 'Leia o QR no telefone que deseja usar para enviar as ofertas.' : state === 'connecting' ? 'Abra o QR e conclua a conexão no seu telefone.' : 'Confira novamente antes de iniciar uma conexão.'
  function secondary(action: Action) {
    const anchor = summary.current
    if (details.current) details.current.open = false
    if (anchor) { anchor.focus(); action(anchor) }
  }
  return <article className={styles.card} aria-label={'Conta ' + instance.name}>
    <div className={styles.heading}><h3>{instance.name}</h3><span className={styles.status} data-connected={connected || undefined} role="status">{label}</span></div>
    <p className={styles.hint}>{hint}</p>
    <div className={styles.actions}>
      {!instance.enabled ? <Button type="button" variant="secondary" disabled={busy} onClick={event => onToggle(event.currentTarget)}><ActionIcon name="enable" />Ativar conta</Button>
        : !instance.configured ? <Button type="button" variant="secondary" disabled={busy} onClick={event => onRefresh(event.currentTarget)}><ActionIcon name="refresh" />Verificar configuração</Button>
        : connected ? <Button type="button" variant="secondary" disabled={busy} onClick={event => onViewSegments(event.currentTarget)}><ActionIcon name="next" />{segmentCount ? 'Ver segmentações' : 'Usar em uma segmentação'}</Button>
        : state === 'close' || state === 'connecting' ? <Button type="button" disabled={busy} onClick={event => onConnect(event.currentTarget)}><ActionIcon name="qr" />{state === 'connecting' ? 'Abrir QR code' : 'Conectar WhatsApp'}</Button>
        : <Button type="button" variant="secondary" disabled={busy || checking} loading={checking} onClick={event => onRefresh(event.currentTarget)}><ActionIcon name="refresh" />{checking ? 'Conferindo…' : 'Tentar verificar'}</Button>}
      <details ref={details} className={styles.more} onKeyDown={event => { if (event.key === 'Escape' && event.currentTarget.open) { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; summary.current?.focus() } }}>
        <summary ref={summary} aria-disabled={busy || undefined} onClick={event => { if (busy) event.preventDefault() }}>Mais opções<span className={styles.srOnly}> de {instance.name}</span><ActionIcon name="down" /></summary>
        <div className={styles.secondary}><Button type="button" variant="ghost" disabled={busy} onClick={() => secondary(onEdit)}><ActionIcon name="edit" />Editar dados</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => secondary(onRefresh)}><ActionIcon name="refresh" />Atualizar estado</Button>{instance.enabled ? <Button type="button" variant="ghost" disabled={busy} onClick={() => secondary(onToggle)}><ActionIcon name="disable" />Pausar conta</Button> : null}</div>
      </details>
    </div>
    <LiquidLens radius={16} />
  </article>
}
