'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import {Button,ButtonLink} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {ActionIcon,type ActionIconName} from '@/components/ui/action-icon'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {ErrorState} from '@/components/feedback/error-state'
import {SkeletonRegion} from '@/components/feedback/skeleton'
import {profileRequest} from '@/features/profiles/profile-api'
import type {ProfileChecklist,ChecklistStep,ChecklistState} from './checklist-contract'
import styles from './checklist.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
const status:Record<ChecklistState,{label:string;tone:'ok'|'neutral'|'wait'|'warn'}>={COMPLETE:{label:'Concluído',tone:'ok'},PENDING:{label:'Pendente',tone:'neutral'},SUGGESTED:{label:'Opcional',tone:'neutral'},REQUESTED:{label:'Solicitada',tone:'neutral'},IN_REVIEW:{label:'Em análise',tone:'wait'},REJECTED:{label:'Rever decisão',tone:'warn'}}
const icons:Record<ChecklistStep['id'],ActionIconName>={account:'account',identity:'edit',links:'link',publication:'publish',presentation:'appearance',preview:'preview',share:'copy'}
const stepIcon=(step:ChecklistStep):ActionIconName=>step.id==='publication'&&step.actionKind==='NAVIGATE'?(step.state==='COMPLETE'?'profile':step.state==='IN_REVIEW'?'reviews':'edit'):icons[step.id]
const placeholder:ProfileChecklist={profileVersion:0,canPublish:false,requiresFinalValidation:true,reasons:[],publicPath:null,progress:{completed:0,total:4},steps:['account','identity','links','publication','presentation','preview','share'].map((id,index)=>({id:id as ChecklistStep['id'],required:index<4,state:'PENDING',title:'Preparar sua página',description:'Confira os dados desta etapa da sua página.',actionLabel:'Continuar etapa',actionKind:'NAVIGATE',actionPath:null}))}
function Text({value,pending}:{value:string;pending:boolean}){return pending?<span data-skeleton-block className={styles.ghost}>{value}</span>:value}
function ChecklistContent({value,pending,disabled,working,onAction}:{value:ProfileChecklist;pending:boolean;disabled:boolean;working:string|null;onAction:(step:ChecklistStep)=>void}){
 return <div className={styles.content}>{[true,false].map(required=><section className={styles.card} aria-label={required?'Etapas obrigatórias':'Sugestões opcionais'} key={String(required)}>
  <header className={styles.heading}><h2>{required?'Obrigatórios':'Sugestões'}</h2>{required?<strong><Text value={`${value.progress.completed}/${value.progress.total}`} pending={pending}/></strong>:null}</header>
  {required?<div role="progressbar" aria-label="Etapas obrigatórias" aria-valuemin={0} aria-valuemax={value.progress.total} aria-valuenow={pending?undefined:value.progress.completed} className={styles.track}><span data-skeleton-block={pending||undefined} style={{width:pending?'40%':`${Math.max(0,Math.min(100,value.progress.completed/Math.max(1,value.progress.total)*100))}%`}}/></div>:null}
  <ul className={styles.tasks}>{value.steps.filter(step=>step.required===required).map(step=><li key={step.id} className={styles.task} data-checklist-step={step.id} aria-labelledby={'checklist-'+step.id}>
   <div className={styles.copy}><div className={styles.title}><h3 id={'checklist-'+step.id}><Text value={step.title} pending={pending}/></h3><Badge tone={pending?'neutral':status[step.state].tone}><Text value={status[step.state].label} pending={pending}/></Badge></div><p><Text value={step.description} pending={pending}/></p></div>
   <div className={styles.action}>{step.actionKind==='NAVIGATE'&&step.actionPath?<ButtonLink variant="secondary" href={step.actionPath} aria-disabled={disabled||undefined} onClick={event=>{if(disabled)event.preventDefault()}}><ActionIcon name={stepIcon(step)}/><Text value={step.actionLabel} pending={pending}/></ButtonLink>:<Button variant={step.actionKind==='PUBLISH'?'primary':'secondary'} disabled={disabled||(step.actionKind==='PUBLISH'?!value.canPublish:!step.actionPath)} loading={working===step.id} onClick={()=>onAction(step)}><ActionIcon name={stepIcon(step)}/><Text value={step.actionLabel} pending={pending}/></Button>}</div>
  </li>)}</ul>
 <LiquidLens radius={16} /></section>)}</div>
}
export function ProfileChecklistScreen({pendingOnly=false}:{pendingOnly?:boolean}={}){
 const router=useRouter(),[value,setValue]=useState<ProfileChecklist|null>(null),[loading,setLoading]=useState(true),[working,setWorking]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const sequence=useRef(0),busy=useRef(false)
 const load=useCallback(async()=>{
  const id=++sequence.current;setLoading(true);setError('')
  try{const next=await profileRequest<ProfileChecklist>('/checklist');if(id===sequence.current){setValue(next);return next}}
  catch(reason){if(id===sequence.current)setError(reason instanceof Error?reason.message:'Não foi possível carregar o checklist.')}
  finally{if(id===sequence.current)setLoading(false)}
 },[])
 useEffect(()=>{if(!pendingOnly)void load();return()=>{sequence.current++}},[load,pendingOnly])
 async function act(step:ChecklistStep){
  if(busy.current||!value||loading||error||step.actionKind==='PUBLISH'&&!value.canPublish)return
  busy.current=true;setWorking(step.id);setError('');setNotice('');let copied=false
  try{
   if(step.actionKind==='PUBLISH'){
    await profileRequest('/publish',{method:'POST',body:JSON.stringify({expectedVersion:value.profileVersion})})
    const next=await load(),state=next?.steps.find(item=>item.id==='publication')?.state
    if(next)setNotice(state==='COMPLETE'?'Publicação concluída.':state==='IN_REVIEW'?'Página enviada para análise.':state==='REJECTED'?'Confira a decisão no editor.':'Situação da publicação atualizada.')
   }else if(step.actionKind==='PREVIEW'||step.actionKind==='COPY'){
    if(step.actionKind==='COPY'){if(!value.publicPath)return;try{await navigator.clipboard.writeText(new URL(value.publicPath,location.origin).href);copied=true}catch{throw new Error('Não foi possível copiar. Tente novamente.')}}
    const next=await profileRequest<ProfileChecklist>('/checklist/actions',{method:'POST',body:JSON.stringify({action:step.actionKind==='PREVIEW'?'PREVIEW_REQUESTED':'LINK_COPIED',expectedVersion:value.profileVersion})});setValue(next)
    if(step.actionKind==='PREVIEW'&&step.actionPath)router.push(step.actionPath);else setNotice('Link copiado. O envio é feito por você.')
   }
  }catch(reason){setError(copied?'Link copiado, mas não foi possível registrar esta etapa. Atualize e tente novamente.':reason instanceof Error?reason.message:'Não foi possível concluir esta etapa.')}
  finally{busy.current=false;setWorking(null)}
 }
 return <section className={styles.page} aria-label="Checklist da minha página" aria-busy={loading||undefined}>
  <WorkspaceActions label="Ações do checklist"><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Voltar à edição</ButtonLink><Button variant="secondary" disabled={loading||working!==null} aria-label="Atualizar checklist" onClick={()=>void load()}><ActionIcon name="refresh"/></Button></WorkspaceActions>
  {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status" className={styles.notice}>{notice}</p>:null}
  {value?.reasons.length?<p className={styles.reasons}><Text value={value.reasons.join(' ')} pending={loading}/></p>:null}
  {loading?<SkeletonRegion label="Carregando checklist"><ChecklistContent value={value??placeholder} pending disabled working={null} onAction={()=>{}}/></SkeletonRegion>:value?<ChecklistContent value={value} pending={false} disabled={Boolean(error)||working!==null} working={working} onAction={step=>void act(step)}/>:null}
 </section>
}
