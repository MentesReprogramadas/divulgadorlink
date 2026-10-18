'use client'
import {useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {DiscoveryFields} from './discovery-fields'
import type {DiscoveryValues} from './discovery-contract'
import styles from './discovery.module.css'
export function DiscoveryDraftButton({value,onChange}:{value:DiscoveryValues;onChange:(value:DiscoveryValues)=>void}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(value),trigger=useRef<HTMLButtonElement>(null)
 return <><Button ref={trigger} type="button" variant="secondary" onClick={()=>{setDraft(value);setOpen(true)}}><ActionIcon name="city"/>Local e idioma (opcional)</Button>{open?createPortal(<OverlayDialog open title="Local, idioma e participação" onClose={()=>setOpen(false)} returnFocusTo={trigger.current}>
  <form className={styles.form} onSubmit={event=>{event.preventDefault();event.stopPropagation();onChange(draft);setOpen(false)}}><DiscoveryFields value={draft} onChange={setDraft}/><WorkspaceActions><Button type="submit"><ActionIcon name="check"/>Usar estes dados</Button></WorkspaceActions></form>
 </OverlayDialog>,document.body):null}</>
}
