'use client'
import {useState} from 'react'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {Field,Input,Select} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import type {ImportEntry} from './import-contract'
import type {ProfileContent} from '@/features/profiles/profile-contract'
import styles from './import.module.css'
export function ImportEditDialog({entry,groups,trigger,onClose,onSave}:{entry:ImportEntry;groups:ProfileContent['categories'];trigger:HTMLElement|null;onClose:()=>void;onSave:(entry:ImportEntry)=>void}){
 const [label,setLabel]=useState(entry.label),[categoryId,setCategory]=useState(entry.categoryId??''),[name,setName]=useState(entry.newCategoryName??'Importados')
 return <OverlayDialog open title={'Revisar linha '+entry.line} returnFocusTo={trigger} onClose={onClose}><form className={styles.page} onSubmit={event=>{event.preventDefault();onSave({...entry,label:label.trim(),categoryId:categoryId||null,newCategoryName:categoryId?null:name.trim()})}}>
  <p className={styles.address}>{entry.url}</p><Field label="Título do link" hint="O texto que aparece no botão da sua página." icon={<ActionIcon name="edit"/>}><Input required maxLength={100} value={label} onChange={event=>setLabel(event.target.value)}/></Field>
  <Field label="Grupo de links" icon={<ActionIcon name="folder"/>}><Select value={categoryId} onChange={event=>setCategory(event.target.value)}><option value="">Criar um grupo</option>{groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</Select></Field>
  {!categoryId?<Field label="Nome do novo grupo"><Input required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></Field>:null}
  <WorkspaceActions><Button variant="secondary" type="button" onClick={onClose}><ActionIcon name="back"/>Cancelar</Button><Button type="submit"><ActionIcon name="save"/>Salvar revisão</Button></WorkspaceActions>
 </form></OverlayDialog>
}
