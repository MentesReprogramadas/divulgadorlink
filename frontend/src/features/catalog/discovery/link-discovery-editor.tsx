'use client'
import {useEffect,useRef,useState} from 'react'
import {api} from '@/lib/api'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {ErrorState} from '@/components/feedback/error-state'
import {DiscoveryFieldsSkeleton} from './discovery-skeleton'
import {DiscoveryFields} from './discovery-fields'
import {emptyDiscovery,type DiscoveryValues} from './discovery-contract'
import styles from './discovery.module.css'
type Response={metadata:DiscoveryValues;version:number;message?:string}
export function useLinkDiscovery(linkId:string){
 const [value,setValue]=useState(emptyDiscovery),[version,setVersion]=useState(0),[ready,setReady]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[notice,setNotice]=useState('')
 const lock=useRef(false),sequence=useRef(0),saved=useRef(emptyDiscovery())
 async function load(){
  const current=++sequence.current;setLoading(true);setError('');setNotice('')
  try{const response=await api<Response>('/v1/links/'+encodeURIComponent(linkId)+'/discovery',{cache:'no-store'});if(current!==sequence.current)return;if(response.status!==200){setError(response.body.message??'Não foi possível carregar os dados.');return}setValue(response.body.metadata);saved.current=response.body.metadata;setVersion(response.body.version);setReady(true);setConflict(false)}catch{if(current===sequence.current)setError('Sem conexão. Tente carregar os dados novamente.')}finally{if(current===sequence.current)setLoading(false)}
 }
 useEffect(()=>{void load();return()=>{sequence.current++}},[linkId])
 async function save(){
  if(lock.current||!ready||loading||conflict)return false;
  if(JSON.stringify(value)===JSON.stringify(saved.current))return true;lock.current=true;setSaving(true);setError('');setNotice('')
  try{
   const response=await api<Response>('/v1/links/'+encodeURIComponent(linkId)+'/discovery',{method:'PATCH',body:JSON.stringify({...value,expectedVersion:version})})
   if(response.status!==200){setConflict(response.status===409);setError(response.body.message??'Não foi possível salvar os dados.');return false}
   setValue(response.body.metadata);saved.current=response.body.metadata;setVersion(response.body.version);setNotice('Dados salvos.');setConflict(false);return true
  }catch{setError('Sem conexão. Seus dados foram mantidos.');return false}finally{lock.current=false;setSaving(false)}
 }
 return {value,ready,loading,saving,error,conflict,notice,load,save,change:(next:DiscoveryValues)=>{setValue(next);setNotice('')}}
}
export function LinkDiscoveryContent({editor,disabled=false}:{editor:ReturnType<typeof useLinkDiscovery>;disabled?:boolean}){
 return <div className={styles.form}>
  {!editor.ready && editor.loading ? <DiscoveryFieldsSkeleton/> : <DiscoveryFields value={editor.value} onChange={editor.change} disabled={disabled||editor.loading||editor.saving||!editor.ready}/>}
  {editor.error?<ErrorState variant="compact" message={editor.error} onRetry={!editor.ready?()=>void editor.load():undefined}/>:null}
  {editor.conflict?<WorkspaceActions><Button type="button" onClick={()=>void editor.load()}><ActionIcon name="refresh"/>Recarregar dados</Button></WorkspaceActions>:null}
  {editor.notice?<p role="status">{editor.notice}</p>:null}
 </div>
}
export function LinkDiscoveryEditor({linkId}:{linkId:string}){
 const editor=useLinkDiscovery(linkId)
 return <form className={`${styles.form} ${styles.editorForm}`} aria-label="Local, idioma e participação do link" aria-busy={editor.loading||editor.saving} onSubmit={event=>{event.preventDefault();void editor.save()}}>
  <LinkDiscoveryContent editor={editor}/>
  <WorkspaceActions><Button type="submit" loading={editor.saving} disabled={editor.loading||!editor.ready||editor.conflict}><ActionIcon name="save"/>Salvar dados</Button></WorkspaceActions>
 </form>
}
