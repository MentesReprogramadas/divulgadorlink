'use client'
import {useRef,useState} from 'react'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {RedirectFields} from '@/features/redirects/components/redirect-fields'
import {emptyRedirect,type RedirectDetail,type RedirectSummary} from '@/features/redirects/redirect-contract'
import {redirectRequest,RedirectRequestError} from '@/features/redirects/redirect-api'
import styles from './pool.module.css'

/** Uses the normal F12 validation and retry identity, without activating distribution. */
export function CreatePoolInvite({onClose,onCreated}:{onClose:()=>void;onCreated:(invite:RedirectSummary)=>void}){
 const [value,setValue]=useState(emptyRedirect),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const lock=useRef(false),resource=useRef<{id:string;version:number}|null>(null),attempt=useRef<{fields:string;key:string;id:string|null;version:number}|null>(null)
 async function save(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('')
  const fields=JSON.stringify(value)
  if(!attempt.current||attempt.current.fields!==fields)attempt.current={fields,key:crypto.randomUUID(),id:resource.current?.id??null,version:resource.current?.version??0}
  const current=attempt.current
  try{
   const created=await redirectRequest<{id:string;version:number}>(current.id?'/'+current.id+'/destinations':'',{method:'POST',body:JSON.stringify({...value,expectedRevision:current.version,requestKey:current.key})})
   resource.current={id:created.id,version:created.version}
   const detail=await redirectRequest<RedirectDetail>('/'+created.id)
   onCreated({...detail,latest:detail.revisions[0]??null,active:detail.revisions.find(r=>r.id===detail.activeRevisionId)??null})
  }catch(reason){if(reason instanceof RedirectRequestError&&reason.resource){resource.current=reason.resource;attempt.current=null}setError(reason instanceof Error?reason.message:'Não foi possível cadastrar. Seus dados foram mantidos.')}
  finally{lock.current=false;setBusy(false)}
 }
 return <OverlayDialog open title="Cadastrar convite" closeDisabled={busy} onClose={onClose}><form className={styles.form} aria-label="Cadastrar convite para distribuição" onSubmit={e=>{e.preventDefault();void save()}}><p className={styles.hint}>Informe o grupo ou a comunidade que receberá visitantes. O convite passa pela mesma validação dos demais.</p><fieldset className={styles.fields} disabled={busy}><legend className={styles.srOnly}>Dados do convite</legend><RedirectFields value={value} onChange={setValue}/></fieldset>{error?<p role="alert">{error}</p>:null}<WorkspaceActions><Button type="button" variant="secondary" disabled={busy} onClick={onClose}><ActionIcon name="back"/>Voltar</Button><Button type="submit" loading={busy}><ActionIcon name="save"/>Validar e cadastrar</Button></WorkspaceActions></form></OverlayDialog>
}
