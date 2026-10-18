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
export function LinkDiscoveryEditor({linkId}:{linkId:string}){
 const [value,setValue]=useState(emptyDiscovery),[version,setVersion]=useState(0),[ready,setReady]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[notice,setNotice]=useState('')
 const lock=useRef(false),sequence=useRef(0)
 async function load(){
  const current=++sequence.current;setLoading(true);setError('');setNotice('')
  try{const response=await api<Response>('/v1/links/'+encodeURIComponent(linkId)+'/discovery',{cache:'no-store'});if(current!==sequence.current)return;if(response.status!==200){setError(response.body.message??'Não foi possível carregar os dados.');return}setValue(response.body.metadata);setVersion(response.body.version);setReady(true);setConflict(false)}catch{if(current===sequence.current)setError('Sem conexão. Tente carregar os dados novamente.')}finally{if(current===sequence.current)setLoading(false)}
 }
 useEffect(()=>{void load();return()=>{sequence.current++}},[linkId])
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current||!ready)return;lock.current=true;setSaving(true);setError('');setNotice('')
  try{
   const response=await api<Response>('/v1/links/'+encodeURIComponent(linkId)+'/discovery',{method:'PATCH',body:JSON.stringify({...value,expectedVersion:version})})
   if(response.status!==200){setConflict(response.status===409);setError(response.body.message??'Não foi possível salvar os dados.');return}
   setValue(response.body.metadata);setVersion(response.body.version);setNotice('Dados salvos.');setConflict(false)
  }catch{setError('Sem conexão. Seus dados foram mantidos.')}finally{lock.current=false;setSaving(false)}
 }
 return <form className={`${styles.form} ${styles.editorForm}`} aria-label="Local, idioma e participação do link" aria-busy={loading||saving} onSubmit={event=>void save(event)}>
  {!ready && loading ? <DiscoveryFieldsSkeleton/> : <DiscoveryFields value={value} onChange={next=>{setValue(next);setNotice('')}} disabled={loading||saving||!ready}/>}
  {error?<ErrorState variant="compact" message={error} onRetry={!ready?()=>void load():undefined}/>:null}
  {conflict?<WorkspaceActions><Button type="button" onClick={()=>void load()}><ActionIcon name="refresh"/>Recarregar dados</Button></WorkspaceActions>:null}
  <WorkspaceActions><Button type="submit" loading={saving} disabled={loading||!ready||conflict}><ActionIcon name="save"/>Salvar dados</Button></WorkspaceActions>
  {notice?<p role="status">{notice}</p>:null}
 </form>
}
