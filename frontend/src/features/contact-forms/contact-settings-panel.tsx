'use client'
import {useEffect,useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Badge} from '@/components/ui/badge'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {useWorkspaceIdentity} from '@/features/workspace-team/workspace-access'
import {contactRequest} from './contact-api'
import {ContactSettingsForm} from './contact-settings-form'
import type {ContactSettings,ContactDefinition} from './contact-contract'
import styles from './contact.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'

export function ContactSettingsPanel({ready,pending,onPrepare,onPreviewChange}:{ready:boolean;pending:boolean;onPrepare:()=>Promise<unknown>;onPreviewChange?:(definition:ContactDefinition)=>void}){
 const workspace=useWorkspaceIdentity(),canRead=!workspace?.ownerId||workspace.grants?.contacts?.read===true,canWrite=!workspace?.ownerId||workspace.grants?.contacts?.write===true
 const [settings,setSettings]=useState<ContactSettings|null>(null),[editor,setEditor]=useState<ContactDefinition|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const lock=useRef(false),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null)
 useEffect(()=>{if(location.hash==='#formulario-contato'&&canRead){panel.current?.focus();panel.current?.scrollIntoView({block:'start'})}},[canRead])
 async function open(){if(lock.current||!canWrite||!ready)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await onPrepare();const result=await contactRequest<ContactSettings>('/v1/me/forms');setSettings(result);setEditor(structuredClone(result.definition));onPreviewChange?.(result.definition)}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível abrir o formulário.')}finally{lock.current=false;setBusy(false)}}
 async function save(){if(lock.current||!editor||!settings)return;lock.current=true;setBusy(true);setError('');try{const result=await contactRequest<ContactSettings>('/v1/me/forms',{method:'PUT',body:JSON.stringify({definition:editor,expectedVersion:settings.version})});setSettings(result);onPreviewChange?.(result.definition);setEditor(null);setNotice(result.definition.enabled?'Formulário ativado. Ele aparece quando sua página está publicada.':'Formulário desativado.')}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar. Seus campos foram mantidos.')}finally{lock.current=false;setBusy(false)}}
 if(!canRead)return null
 return <section ref={panel} id="formulario-contato" className={`${styles.card} ${styles.settingsCard}`} aria-label="Formulário da minha página" tabIndex={-1}><div className={styles.row}><h2><ActionIcon name="contactForm"/>Receba mensagens pela sua página</h2>{settings?<Badge tone={settings.definition.enabled?'ok':'neutral'}>{settings.definition.enabled?'Ativado':'Desativado'}</Badge>:null}</div><p className={styles.hint}>Adicione um formulário para pedidos de contato, orçamento ou lista de interesse.</p>{!ready?<p className={styles.hint}>Preencha o nome e o endereço da página para configurar.</p>:!canWrite?<p className={styles.hint}>Você tem acesso de leitura aos contatos. Peça permissão para alterar o formulário.</p>:null}<WorkspaceActions><ButtonLink variant="secondary" href="/painel/perfil/contatos"><ActionIcon name="contactInbox"/>Ver contatos recebidos</ButtonLink><Button ref={trigger} disabled={!ready||pending||busy||!canWrite} loading={busy&&!editor} onClick={()=>void open()}><ActionIcon name="settings"/>Configurar formulário</Button></WorkspaceActions>{notice?<p role="status">{notice}</p>:null}{error&&!editor?<p role="alert">{error}</p>:null}<OverlayDialog open={Boolean(editor)} title="Formulário da sua página" returnFocusTo={trigger.current} closeDisabled={busy} onClose={()=>{if(!busy){setEditor(null);setError('');if(settings)onPreviewChange?.(settings.definition)}}}>{editor?<ContactSettingsForm value={editor} onChange={value=>{setEditor(value);onPreviewChange?.(value)}} onSave={()=>void save()} pending={busy} error={error}/>:null}</OverlayDialog><LiquidLens radius={16} /></section>
}
