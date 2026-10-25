'use client'
import { Checkbox } from '@/components/ui/checkbox'
import { useRef, useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { OverlayDialog } from '@/components/ui/overlay-dialog'
import { ActionIcon } from '@/components/ui/action-icon'
import {paywallPath} from '@/features/profile-billing/billing-access'
import {useWorkspaceIdentity} from '@/features/workspace-team/workspace-access'
import { civilToUtc, utcToCivil, type ProfileSchedule } from '../profile-schedule'
import styles from './profile-schedule.module.css'
export type ProfileScheduleDialogProps = { schedule?: ProfileSchedule | null; allowed: boolean; trigger?: HTMLElement | null; onApply: (value: ProfileSchedule | null) => void; onClose: () => void }
export function ProfileScheduleDialog({schedule,allowed,trigger,onApply,onClose}: ProfileScheduleDialogProps) {
  const workspace=useWorkspaceIdentity(),canSeeBilling=!workspace?.ownerId||workspace.grants?.billing?.read===true
  const [zone,setZone]=useState(schedule?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [start,setStart]=useState(()=>utcToCivil(schedule?.startsAt??null,zone)),[end,setEnd]=useState(()=>utcToCivil(schedule?.endsAt??null,zone)),[paused,setPaused]=useState(schedule?.paused??false)
  const [error,setError]=useState(''),[errorField,setErrorField]=useState<'start'|'end'|null>(null),[applied,setApplied]=useState(false),root=useRef<HTMLDivElement>(null)
  const zones=[...new Set([zone,'America/Sao_Paulo','America/Manaus','America/Rio_Branco','America/Noronha','America/New_York','America/Los_Angeles','Europe/Lisbon','Europe/London','UTC'])]
  const zoneLabels:Record<string,string>={'America/Sao_Paulo':'Brasília / São Paulo','America/Manaus':'Manaus','America/Rio_Branco':'Rio Branco','America/Noronha':'Fernando de Noronha','America/New_York':'Nova York','America/Los_Angeles':'Los Angeles','Europe/Lisbon':'Lisboa','Europe/London':'Londres',UTC:'UTC'}
  function apply() {
    if (applied || !allowed) return
    if (Array.from(root.current?.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])')??[]).some(input=>!input.reportValidity())) return
    let field:'start'|'end'|null='start'
    try {
      const startsAt=civilToUtc(start,zone);field='end';const endsAt=civilToUtc(end,zone)
      if (startsAt && endsAt && endsAt<=startsAt) throw new Error('O fim precisa ser depois do início.')
      field=null
      setApplied(true);onApply(startsAt || endsAt || paused ? {startsAt,endsAt,timeZone:zone,paused}:null)
    } catch(reason) { setErrorField(field);setError(reason instanceof Error?reason.message:'Confira as datas. Seus dados foram mantidos.') }
  }
  return <OverlayDialog open title="Agendar botão" onClose={onClose} returnFocusTo={trigger}><div ref={root} role="form" aria-label="Agendar botão" className={styles.body} onKeyDown={event=>{if(event.key==='Enter' && event.target instanceof HTMLInputElement){event.preventDefault();apply()}}}>
    {allowed ? <><Field label="Fuso dos horários"><Select value={zone} onChange={event=>{setZone(event.target.value);setError('')}}>{zones.map(value=><option key={value} value={value}>{zoneLabels[value]??value.replaceAll('_',' ')}</option>)}</Select></Field><div className={styles.dates}><Field label="Começar a mostrar" hint="Vazio: sem data de início." error={errorField==='start'?error:undefined}><DatePicker withTime value={start} onChange={event=>{setStart(event.target.value);setError('')}} /></Field><Field label="Parar de mostrar" hint="Vazio: sem data de fim." error={errorField==='end'?error:undefined}><DatePicker withTime value={end} onChange={event=>{setEnd(event.target.value);setError('')}} /></Field></div><label className={styles.check}><Checkbox checked={paused} onChange={event=>setPaused(event.target.checked)} />Pausar este botão</label><p className={styles.note}>Vale após publicar a página. Ocultar o botão não desativa o endereço de destino.</p></> : <p className={styles.note}>Agendamento indisponível no seu plano atual. O conteúdo foi mantido; remova a agenda para usar um botão comum.</p>}
    {error&&!errorField?<p className={styles.error} role="alert">{error}</p>:null}
    <div className={styles.actions}>{schedule?<Button type="button" variant="danger" disabled={applied} onClick={()=>{setApplied(true);onApply(null)}}><ActionIcon name="trash" />Remover agendamento</Button>:null}{allowed?<Button type="button" disabled={applied} onClick={apply}><ActionIcon name="save" />Aplicar ao rascunho</Button>:canSeeBilling?<ButtonLink href={paywallPath('profile.scheduling')}><ActionIcon name="subscriptionLock" />Ver planos</ButtonLink>:null}</div>
  </div></OverlayDialog>
}
