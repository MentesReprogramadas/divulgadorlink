'use client'
import {useRef,useState,type FormEvent} from 'react'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {Field,Input,Select} from '@/components/ui/input'
import {ActionIcon} from '@/components/ui/action-icon'
import {Button} from '@/components/ui/button'
import {TabNavigation} from '@/components/ui/tabs'
import {useChannelSource} from './use-channel-source'
import type {ChannelDestination,ChannelNetworkOption,ChannelSource,PrivateChannel} from './channel-contract'
import styles from './channels.module.css'

export type ChannelFormProps={sourceProfileId?:string;initial:PrivateChannel;destinations:ChannelDestination[];networks:ChannelNetworkOption[];sourcePending:boolean;sourceError:string;hasMore:boolean;trigger?:HTMLElement;onPendingChange?:(pending:boolean)=>void;onLoadMore:()=>void;onRefresh:()=>void;onClose:()=>void;onSave:(channel:PrivateChannel)=>void|Promise<void>}
const statusLabels:Record<string,string>={APPROVED:'Validado',PENDING:'Em validação',PENDING_REVIEW:'Em análise',REJECTED:'Recusado: revise o endereço',BLOCKED:'Endereço bloqueado',FAILED:'Não foi possível validar',SUPERSEDED:'Versão substituída'}
export function ChannelDialog(props:ChannelFormProps){
 const [pending,setPending]=useState(false)
 return <OverlayDialog open title={props.initial.destinationRevisionId?'Editar convite':'Adicionar convite'} onClose={props.onClose} returnFocusTo={props.trigger} closeDisabled={pending}><ChannelForm {...props} onPendingChange={setPending}/></OverlayDialog>
}
export function ChannelForm({sourceProfileId,initial,destinations,networks,sourcePending,sourceError,hasMore,onLoadMore,onRefresh,onClose,onSave,onPendingChange}:ChannelFormProps){
 const [draft,setDraft]=useState(initial),[mode,setMode]=useState<'URL'|'EXISTING'>(sourceProfileId?'EXISTING':'URL'),[url,setUrl]=useState(initial.destinationUrl??''),[requiresAge,setRequiresAge]=useState(false),[resolved,setResolved]=useState<ChannelSource|null>(null),[pending,setPending]=useState(false),[error,setError]=useState('')
 const busy=useRef(false),sourceApi=useChannelSource(sourceProfileId),tabsId=useRef('invite-source-'+initial.id)
 const updatePending=(value:boolean)=>{setPending(value);onPendingChange?.(value)}
 const sourceStatus=resolved?.status??draft.status??'',sourceAvailable=resolved?.available??draft.available
 const selected=destinations.find(row=>row.id===draft.destinationRevisionId),choices=resolved?.networks??selected?.networks??networks
 function apply(source:ChannelSource){
  if(draft.destinationRevisionId===source.id&&draft.networkId&&!source.networks.some(row=>row.id===draft.networkId))throw new Error('O endereço não corresponde à rede selecionada. Escolha a rede correta ou Site.')
  const network=draft.destinationRevisionId===source.id?(source.networks.find(row=>row.id===draft.networkId)??null):(source.networks.length===1?source.networks[0]:null)
  setResolved(source)
  const next={...draft,destinationRevisionId:source.id,destinationUrl:source.destinationUrl,handleId:source.handleId,status:source.status,available:source.available,destinationLabel:source.label,networkId:network?.id??null,network:network?{name:network.name,slug:network.slug}:{name:'Site',slug:'site'}}
  setDraft(next);return next
 }
 async function refresh(){
  if(busy.current||!draft.destinationRevisionId)return
  busy.current=true;updatePending(true);setError('')
  try{apply(await sourceApi.read(draft.destinationRevisionId))}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível atualizar o acesso.')}finally{busy.current=false;updatePending(false)}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();event.stopPropagation();if(busy.current)return
  busy.current=true;updatePending(true);setError('')
  try{
   let next=draft
   if(mode==='URL'&&(!draft.destinationRevisionId||url.trim()!==draft.destinationUrl))next=apply(await sourceApi.create(draft.label.trim()||'Convite',url.trim(),requiresAge))
   else if(!draft.destinationRevisionId)throw new Error('Escolha um acesso existente.')
   else next=apply(await sourceApi.read(draft.destinationRevisionId))
   await onSave({...next,label:draft.label.trim()||next.network?.name||'Convite',paused:draft.paused,showLabel:draft.showLabel??true})
  }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar. Os campos foram mantidos.')}finally{busy.current=false;updatePending(false)}
 }
 return <form className={styles.dialogForm} onSubmit={submit} aria-label="Configurar convite">
  <fieldset disabled={pending} className={styles.controls}><div className={styles.dialogFields}>
   <label className={styles.toggle}><input type="checkbox" role="switch" checked={draft.showLabel!==false} onChange={event=>setDraft({...draft,showLabel:event.target.checked})}/>Mostrar título</label>
   {draft.showLabel!==false?<Field label="Título"><Input autoFocus required pattern=".*\S.*" maxLength={100} value={draft.label} onChange={event=>setDraft({...draft,label:event.target.value})}/></Field>:null}
   <TabNavigation value={mode} onChange={setMode} label="Destino do convite" idPrefix={tabsId.current} items={sourceProfileId?[{id:'EXISTING',label:'Convites do proprietário'}]:[{id:'URL',label:'Novo'},{id:'EXISTING',label:'Existente'}]}/>
   <div role="tabpanel" id={tabsId.current+'-panel-URL'} aria-labelledby={tabsId.current+'-URL'} hidden={mode!=='URL'}><fieldset className={styles.controls} disabled={mode!=='URL'}><div className={styles.dialogFields}><Field label="Link"><Input required type="url" maxLength={2048} value={url} onChange={event=>setUrl(event.target.value)}/></Field>{url.trim()!==initial.destinationUrl?<label className={styles.check}><input type="checkbox" checked={requiresAge} onChange={event=>setRequiresAge(event.target.checked)}/>Conteúdo para maiores de 18 anos</label>:null}</div></fieldset></div>
   <div role="tabpanel" id={tabsId.current+'-panel-EXISTING'} aria-labelledby={tabsId.current+'-EXISTING'} hidden={mode!=='EXISTING'}><fieldset className={styles.controls} disabled={mode!=='EXISTING'}><div className={styles.dialogFields}><div className={styles.sourcePicker}><Field label="Convite"><Select required disabled={sourcePending} value={draft.destinationRevisionId} onChange={event=>{const source=destinations.find(row=>row.id===event.target.value);setResolved(null);setDraft({...draft,destinationRevisionId:event.target.value,destinationUrl:source?.destinationUrl,networkId:source?.networks.length===1?source.networks[0].id:null})}}><option value="">Selecione um convite</option>{draft.destinationRevisionId&&!selected?<option value={draft.destinationRevisionId}>{draft.destinationLabel} (atual)</option>:null}{destinations.map(source=><option key={source.id} value={source.id}>{source.label+' · '+source.destinationUrl}</option>)}</Select></Field><Button type="button" className={styles.sourceRefresh} variant="secondary" aria-label="Atualizar convites" title="Atualizar convites" disabled={sourcePending} onClick={onRefresh}><ActionIcon name="refresh"/></Button></div><div className={styles.sourceActions}>{hasMore?<Button type="button" variant="secondary" disabled={sourcePending} onClick={onLoadMore}>Mais convites</Button>:null}</div>{sourceError?<p role="alert" className={styles.failure}>{sourceError}</p>:null}</div></fieldset></div>
   {draft.destinationRevisionId?<><Field label="Rede"><Select value={draft.networkId??'SITE'} onChange={event=>{const network=choices.find(row=>row.id===event.target.value);setDraft({...draft,networkId:network?.id??null,network:network?{name:network.name,slug:network.slug}:{name:'Site',slug:'site'}})}}><option value="SITE">Site</option>{draft.networkId&&!choices.some(row=>row.id===draft.networkId)?<option value={draft.networkId}>{draft.network?.name??'Rede indisponível'}</option>:null}{choices.map(network=><option key={network.id} value={network.id}>{network.name}</option>)}</Select></Field>{!sourceAvailable?<div className={styles.sourceState}><p role="status" className={styles.note}>{sourceStatus==='APPROVED'?'Destino substituído':statusLabels[sourceStatus]??'Revisar convite'}</p><Button type="button" variant="secondary" onClick={()=>void refresh()}>Verificar situação</Button></div>:null}</>:null}
   {initial.destinationRevisionId?<label className={styles.check}><input type="checkbox" checked={draft.paused} onChange={event=>setDraft({...draft,paused:event.target.checked})}/>Pausar convite</label>:null}
  </div></fieldset>
  {error?<p role="alert" className={styles.failure}>{error}</p>:null}
  <div className={styles.actions}><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" loading={pending} disabled={pending}>Salvar convite</Button></div>
 </form>
}
