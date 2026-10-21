'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {ResponsiveTabs} from '@/components/ui/responsive-tabs'
import type {ReactNode} from 'react'
import type {ActionIconName} from '@/components/ui/action-icon'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Field,TextArea} from '@/components/ui/input'
import {Select} from '@/components/ui/select'
import {Badge} from '@/components/ui/badge'
import {SkeletonField,SkeletonRegion} from '@/components/feedback/skeleton'
import {EmptyState} from '@/components/feedback/empty-state'
import {ErrorState} from '@/components/feedback/error-state'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {contactRequest} from './contact-api'
import {contactStatuses,historyLabels,type ContactStatus,type ContactNote,type ContactDetail,type ContactHistory} from './contact-handling-contract'
import type {ContactSubmission} from './contact-contract'
import styles from './contact-handling.module.css'
export function ContactHandling({contact,writable,onClose,onSaved,trigger}:{contact:ContactSubmission;writable:boolean;onClose:()=>void;onSaved:(row:ContactSubmission)=>void;trigger:HTMLElement|null}){
 const [detail,setDetail]=useState<ContactDetail|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(false),[tab,setTab]=useState('handling'),[status,setStatus]=useState<ContactStatus>(contact.status)
 const [editing,setEditing]=useState<{id:string;text:string;existing:boolean}|null>(null),[removing,setRemoving]=useState<ContactNote|null>(null)
 const busy=useRef(false),path='/v1/me/forms/submissions/'+contact.id
 const load=useCallback(async()=>{setError('');try{const value=await contactRequest<ContactDetail>(path);setDetail(value);setStatus(value.status)}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar o contato.')}},[path])
 useEffect(()=>{void load()},[load])
 async function mutate(url:string,method:string,body:unknown,message:string){
  if(busy.current)return;busy.current=true;setPending(true);setError('');setNotice('')
  try{const next=await contactRequest<ContactDetail>(path+url,{method,body:JSON.stringify(body)});setDetail(next);setStatus(next.status);onSaved(next);setEditing(null);setRemoving(null);setNotice(message)}
  catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar. Seus dados foram mantidos.')}
  finally{busy.current=false;setPending(false)}
 }
 async function more(){if(!detail?.nextHistoryCursor||busy.current)return;busy.current=true;setPending(true);try{const next=await contactRequest<{history:ContactHistory[];nextHistoryCursor:number|null}>(path+'/history?beforeVersion='+detail.nextHistoryCursor);setDetail({...detail,history:[...detail.history,...next.history],nextHistoryCursor:next.nextHistoryCursor})}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar o histórico.')}finally{busy.current=false;setPending(false)}}
 const panes:Array<{id:string;label:string;icon:ActionIconName;content:ReactNode}>=detail?[
   {id:'handling',label:'Atendimento',icon:'contactHandling',content:<div className={styles.body}>
    <dl className={styles.answers}><div><dt>Recebido em</dt><dd><time dateTime={detail.createdAt}>{new Date(detail.createdAt).toLocaleString('pt-BR')}</time></dd></div><div><dt>Página de origem</dt><dd>/p/{detail.sourceSlug}</dd></div><div><dt>Primeiro atendimento</dt><dd>{detail.firstHandledAt?new Date(detail.firstHandledAt).toLocaleString('pt-BR'):'Ainda não iniciado'}</dd></div></dl>
    <Field label="Situação do atendimento"><Select value={status} disabled={!writable||pending} onChange={event=>setStatus(event.target.value as ContactStatus)}>{Object.entries(contactStatuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select></Field>
    {writable?<WorkspaceActions><Button loading={pending} onClick={()=>void mutate('/status','PATCH',{status,expectedVersion:detail.version},'Situação atualizada.')}><ActionIcon name="save"/>Salvar situação</Button></WorkspaceActions>:<Badge tone={detail.status==='DONE'?'ok':'wait'}>{contactStatuses[detail.status]}</Badge>}
   </div>},
   {id:'notes',label:'Notas privadas',icon:'contactNotes',content:editing?<form className={styles.form} onSubmit={event=>{event.preventDefault();void mutate('/notes'+(editing.existing?'/'+editing.id:''),editing.existing?'PATCH':'POST',{...(editing.existing?{}:{id:editing.id}),text:editing.text,expectedVersion:detail.version},'Nota salva.')}}><WorkspaceActions><Button type="button" variant="secondary" disabled={pending} onClick={()=>setEditing(null)}><ActionIcon name="back"/>Voltar às notas</Button></WorkspaceActions><Field label="Nota privada" hint="Visível somente para responsáveis com acesso a contatos."><TextArea required maxLength={2000} rows={4} value={editing.text} disabled={pending} onChange={event=>setEditing({...editing,text:event.target.value})}/></Field><WorkspaceActions><Button type="submit" loading={pending}><ActionIcon name="save"/>Salvar nota</Button></WorkspaceActions></form>:<div className={styles.notes}>
    {writable?<WorkspaceActions><Button onClick={()=>{setEditing({id:crypto.randomUUID(),text:'',existing:false});setNotice('')}}><ActionIcon name="plus"/>Nova nota</Button></WorkspaceActions>:null}
    {detail.notes.map(note=><article key={note.id} className={styles.note} aria-label="Nota privada"><p>{note.text}</p><div className={styles.meta}><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('pt-BR')}</time>{writable?<WorkspaceActions><Button variant="secondary" onClick={()=>setEditing({id:note.id,text:note.text,existing:true})}><ActionIcon name="edit"/>Editar nota</Button><Button variant="danger" onClick={()=>setRemoving(note)}><ActionIcon name="trash"/>Remover nota</Button></WorkspaceActions>:null}</div>{removing?.id===note.id?<div role="group" aria-label="Confirmar remoção da nota"><p>A nota será removida. O histórico guardará apenas o registro da ação.</p><WorkspaceActions><Button variant="secondary" disabled={pending} onClick={()=>setRemoving(null)}><ActionIcon name="back"/>Cancelar</Button><Button variant="danger" loading={pending} onClick={()=>void mutate('/notes/'+note.id,'DELETE',{expectedVersion:detail.version},'Nota removida.')}><ActionIcon name="trash"/>Confirmar remoção</Button></WorkspaceActions></div>:null}</article>)}
    {!detail.notes.length?<EmptyState>Use notas para organizar o atendimento com sua equipe.</EmptyState>:null}
   </div>},
   {id:'history',label:'Histórico',icon:'history',content:<div className={styles.history}>{detail.history.map(entry=><article className={styles.entry} key={entry.version}><p>{historyLabels[entry.kind]??'Atendimento atualizado'}</p>{entry.toStatus?<p>{entry.fromStatus?contactStatuses[entry.fromStatus]+' → ':''}{contactStatuses[entry.toStatus]}</p>:null}<time className={styles.muted} dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('pt-BR')}</time></article>)}{!detail.history.length?<EmptyState>As alterações do atendimento aparecerão aqui.</EmptyState>:null}{detail.nextHistoryCursor?<WorkspaceActions><Button loading={pending} onClick={()=>void more()}><ActionIcon name="loadMore"/>Ver mais alterações</Button></WorkspaceActions>:null}</div>},
  ]:[]
 return <OverlayDialog open title="Atendimento do contato" onClose={()=>{if(!pending)onClose()}} returnFocusTo={trigger} closeDisabled={pending} size="wide"><div className={styles.body}>
  {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status">{notice}</p>:null}
  {!detail&&!error?<SkeletonRegion><SkeletonField label="Situação do atendimento"/><SkeletonField label="Contato"/></SkeletonRegion>:null}
  {detail?<><ResponsiveTabs value={tab} onChange={next=>{if(!pending)setTab(next)}} label="Detalhes do contato" idPrefix="contact-detail" items={panes.map(({id,label,icon})=>({id,label,icon}))}/>{panes.map(pane=><section key={pane.id} id={'contact-detail-panel-'+pane.id} role="tabpanel" aria-labelledby={'contact-detail-'+pane.id} hidden={tab!==pane.id}>{pane.content}</section>)}</>:null}
 </div></OverlayDialog>
}
