'use client'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { Badge } from '@/components/ui/badge'
import type { ProfileContent } from '../profile-contract'
import { useProfileSort } from './use-profile-sort'
import styles from './profile-groups.module.css'
import { useProfileChanges } from './profile-changes'
import type {ChannelGroupSummary} from '@/features/profile-channels/channel-contract'
import { scheduleLabel } from '../profile-schedule'

type ProfileLinkListProps = {
  channels?:ChannelGroupSummary['channels'];content: ProfileContent; items: ProfileContent['items']; primaryId: string | null
  onReorder: (source: string, target: string) => void
  onToggle?:(item:ProfileContent['items'][number],trigger:HTMLElement)=>void
  onEdit: (id: string) => void; onRemove: (id: string) => void
  scheduling?: { allowed: boolean; serverNow: string }; onSchedule?: (id: string, trigger: HTMLElement) => void
}
export function ProfileLinkList({ content, items, primaryId, onReorder, onEdit, onRemove, scheduling, onSchedule, channels, onToggle }: ProfileLinkListProps) {
  const changes = useProfileChanges()
  const sort = useProfileSort(items.map(item => item.id), onReorder), hintId = useId()
  return <><p id={hintId} className={styles.srOnly}>Arraste pela alça para ordenar. No teclado, use as setas na alça.</p><ul className={styles.links} ref={sort.root}>
    {items.map(item => {const channel=channels?.find(channel=>channel.id===item.id);return <li key={item.id} data-profile-link data-unpublished={changes.item(item.id, content) || undefined} data-sort-id={item.id} data-over={sort.over === item.id || undefined} data-dragging={sort.dragging === item.id || undefined} className={styles.link}>
      <div className={styles.linkHeading}><div className={styles.labels}>{primaryId === item.id ? <Badge>Botão principal</Badge> : null}{!item.visible ? <Badge tone="muted">Oculto</Badge> : null}</div><button type="button" className={styles.handle} aria-label={'Arrastar link ' + item.label} aria-describedby={hintId} {...sort.handle(item.id)}><ActionIcon name="grip" /></button></div>
      <div className={styles.linkTitle}><strong>{item.label}</strong>{channel?<><Badge tone="neutral">{channel.networkName} · Convite</Badge><Badge tone={channel.available?'ok':'warn'}>{channel.paused?'Pausado':channel.status==='PENDING_REVIEW'?'Em análise':channel.status==='PENDING'?'Em validação':channel.available?'Validado':'Revisar acesso'}</Badge></>:null}{item.templateExample?<Badge tone="neutral">Exemplo: configure seu endereço</Badge>:<p>{item.destination}</p>}{item.schedule ? <Badge tone={item.schedule.paused ? 'muted' : 'neutral'}>{scheduleLabel(item.schedule, scheduling?.serverNow ?? new Date().toISOString(), scheduling?.allowed ?? false)}</Badge> : null}</div>
      <div className={`${styles.actions} ${styles.linkActions}`}>{onToggle&&!item.templateExample?<Button type="button" variant="secondary" aria-label={(channel?(channel.paused?'Retomar convite ':'Pausar convite '):(item.visible?'Ocultar link ':'Mostrar link '))+item.label} onClick={event=>onToggle(item,event.currentTarget)}>{channel?(channel.paused?'Retomar':'Pausar'):(item.visible?'Ocultar':'Mostrar')}</Button>:null}{onSchedule && !item.templateExample && (scheduling?.allowed || item.schedule) ? <Button type="button" variant="secondary" aria-label={'Agendar ' + item.label} onClick={event => onSchedule(item.id,event.currentTarget)}><ActionIcon name="schedule" />Agendar</Button> : null}<Button type="button" variant="secondary" aria-label={item.templateExample?'Configurar exemplo':'Editar link'} onClick={() => onEdit(item.id)}><ActionIcon name="edit" />{item.templateExample?'Configurar':'Editar'}</Button><Button type="button" variant="danger" aria-label="Remover link" onClick={() => onRemove(item.id)}><ActionIcon name="trash" />Remover</Button></div>
    </li>})}
  </ul></>
}
