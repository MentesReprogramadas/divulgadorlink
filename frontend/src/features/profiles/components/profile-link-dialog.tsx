'use client'
import { Checkbox } from '@/components/ui/checkbox'
import {EventEditor} from '@/features/profile-events/event-editor'
import {useId,useState} from 'react'
import {createPortal} from 'react-dom'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {TabNavigation} from '@/components/ui/tabs'
import {Field,Input,Select} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {ProfileAccessEditor} from '@/features/profile-channels/profile-access-editor'
import type {ProfileContent} from '../profile-contract'
import type {ProfileChannelsNavigation} from './profile-group-manager'
import {ChangedField,useProfileChanges} from './profile-changes'
import styles from './profile-groups.module.css'

type Item=ProfileContent['items'][number]
type Props={draft:Item;content:ProfileContent;catalog:Array<{id:string;name:string}>;channels?:ProfileChannelsNavigation;trigger:HTMLElement;onChange:(draft:Item)=>void;onSave:(element:HTMLElement,item?:Item)=>void;onClose:()=>void}
export function ProfileLinkDialog({draft,content,catalog,channels,trigger,onChange,onSave,onClose}:Props){
 const changes=useProfileChanges(),existing=content.items.some(item=>item.id===draft.id),isInvite=Boolean(channels?.groups.some(group=>group.channels.some(channel=>channel.id===draft.id)))
 const [mode,setMode]=useState<'LINK'|'INVITE'|'EVENT'>(draft.event?'EVENT':isInvite?'INVITE':'LINK'),[visitedInvite,setVisitedInvite]=useState(isInvite),[pending,setPending]=useState(false),id=useId(),typeId=useId()
 function choose(next:'LINK'|'INVITE'|'EVENT'){setMode(next);if(next==='INVITE')setVisitedInvite(true)}
 return createPortal(<OverlayDialog open title={mode==='EVENT'?(existing?'Editar evento':'Adicionar evento'):draft.templateExample?'Configurar link de exemplo':existing?'Editar link':'Adicionar link'} returnFocusTo={trigger} closeDisabled={pending} onClose={onClose}>
  <div className={styles.dialog}>
   <TabNavigation value={mode} onChange={pending?undefined:choose} label="Tipo de conteúdo" idPrefix={id} items={existing?(draft.event?[{id:'EVENT',label:'Evento',disabled:pending}]:isInvite?[{id:'INVITE',label:'Link permanente',disabled:pending}]:[{id:'LINK',label:'Link',disabled:pending}]):[{id:'LINK',label:'Link',disabled:pending},{id:'EVENT',label:'Evento',disabled:pending},{id:'INVITE',label:'Link permanente',disabled:pending||!channels}]}/>
   <div role="tabpanel" id={id+'-panel-LINK'} aria-labelledby={id+'-LINK'} hidden={mode!=='LINK'}>
    <div data-profile-dialog className={styles.dialog} onKeyDown={event=>{if(event.key==='Enter'&&event.target instanceof HTMLInputElement){event.preventDefault();event.currentTarget.querySelector<HTMLButtonElement>('[data-complete]')?.click()}}}>
     <ChangedField changed={changes.baseline!==undefined&&draft.label!==changes.baseline.items.find(row=>row.id===draft.id)?.label}><Field label="Título do link"><Input autoFocus required pattern=".*\S.*" title="Digite um título para o link." maxLength={100} value={draft.label} onChange={event=>onChange({...draft,label:event.target.value})}/></Field></ChangedField>
     <ChangedField changed={changes.baseline!==undefined&&draft.type!==changes.baseline.items.find(row=>row.id===draft.id)?.type}><TabNavigation value={draft.type==='CATALOG'?'CATALOG':'URL'} onChange={type=>onChange({...draft,type,destination:''})} label="Tipo de link" idPrefix={typeId} items={[{id:'URL',label:'Novo'},{id:'CATALOG',label:'Meus links'}]}/></ChangedField>
     {content.categories.length>1&&existing?<ChangedField changed={changes.baseline!==undefined&&draft.categoryId!==changes.baseline.items.find(row=>row.id===draft.id)?.categoryId}><Field label="Grupo"><Select value={draft.categoryId} onChange={event=>onChange({...draft,categoryId:event.target.value})}>{content.categories.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</Select></Field></ChangedField>:null}
     <div role="tabpanel" id={typeId+'-panel-URL'} aria-labelledby={typeId+'-URL'} hidden={draft.type==='CATALOG'}><Field label="Link de acesso" hint="Cole o endereço completo, começando com https://."><Input required={draft.type!=='CATALOG'} disabled={draft.type==='CATALOG'} type="url" maxLength={2048} value={draft.type==='CATALOG'?'':draft.destination} onChange={event=>onChange({...draft,destination:event.target.value})}/></Field></div>
     <div role="tabpanel" id={typeId+'-panel-CATALOG'} aria-labelledby={typeId+'-CATALOG'} hidden={draft.type!=='CATALOG'}><Field label="Link do catálogo"><Select required={draft.type==='CATALOG'} disabled={draft.type!=='CATALOG'} value={draft.type==='CATALOG'?draft.destination:''} onChange={event=>onChange({...draft,destination:event.target.value})}><option value="">Escolha um link publicado</option>{catalog.map(link=><option key={link.id} value={link.id}>{link.name}</option>)}</Select></Field></div>
     {existing&&!draft.templateExample?<ChangedField changed={changes.baseline!==undefined&&draft.visible!==changes.baseline.items.find(row=>row.id===draft.id)?.visible}><label className={styles.check}><Checkbox checked={draft.visible} onChange={event=>onChange({...draft,visible:event.target.checked})}/>Link visível</label></ChangedField>:null}
     <div className={styles.actions}><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="button" data-complete onClick={event=>onSave(event.currentTarget)}><ActionIcon name="save"/>Concluir link</Button></div>
    </div>
   </div>
   <div role="tabpanel" id={id+'-panel-EVENT'} aria-labelledby={id+'-EVENT'} hidden={mode!=='EVENT'}>{mode==='EVENT'?<EventEditor initial={draft} onSave={(value,element)=>onSave(element,value)} onClose={onClose}/>:null}</div>
   <div role="tabpanel" id={id+'-panel-INVITE'} aria-labelledby={id+'-INVITE'} hidden={mode!=='INVITE'}>{visitedInvite&&channels?<ProfileAccessEditor embedded groupId={draft.categoryId} channelId={isInvite?draft.id:undefined} trigger={trigger} flush={channels.flush} onSaved={next=>{channels.onSaved(next);onClose()}} onClose={onClose} onPendingChange={setPending}/>:null}</div>
  </div>
 </OverlayDialog>,document.body)
}
