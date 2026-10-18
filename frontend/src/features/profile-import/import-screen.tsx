'use client'
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {FormSteps} from '@/components/ui/form-steps'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {EmptyState} from '@/components/feedback/empty-state'
import {ErrorState} from '@/components/feedback/error-state'
import {profileRequest} from '@/features/profiles/profile-api'
import type {ProfileState} from '@/features/profiles/profile-contract'
import {previewImport,confirmImport} from './import-api'
import type {ImportChoice,ImportEntry,ImportPreview,ImportResult} from './import-contract'
import {ImportSkeleton,importSteps} from './import-skeleton'
import {ImportPaste} from './import-paste'
import {ImportReviewList} from './import-review-list'
import {ImportEditDialog} from './import-edit-dialog'
import styles from './import.module.css'
export function ImportScreen(){
 const [state,setState]=useState<ProfileState|null>(null),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState(''),[needsReview,setNeedsReview]=useState(false)
 const [raw,setRaw]=useState(''),[step,setStep]=useState(0),[preview,setPreview]=useState<ImportPreview|null>(null),[entries,setEntries]=useState<ImportEntry[]>([]),[editing,setEditing]=useState<ImportEntry|null>(null),[confirmed,setConfirmed]=useState(false),[result,setResult]=useState<ImportResult|null>(null)
 const busy=useRef(false),trigger=useRef<HTMLElement|null>(null),status=useRef<HTMLDivElement>(null)
 const load=useCallback(async()=>{setLoading(true);setError('');try{setState(await profileRequest<ProfileState>(''))}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar sua página.')}finally{setLoading(false)}},[])
 useEffect(()=>{void load()},[load])
 useLayoutEffect(()=>{if(result)status.current?.focus()},[result])
 useEffect(()=>{
  if(!raw||result)return
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)
 },[raw,result])
 async function review(){
  if(busy.current)return;busy.current=true;setPending(true);setError('');setNeedsReview(false)
  try{
   const current=await profileRequest<ProfileState>('');if(!current.draft)throw new Error('Salve o nome e o endereço da página antes de importar.')
   const next=await previewImport(raw.split(/\r?\n/),current.draft.version),groups=current.draft.categories
   setState(current);setPreview(next);setEntries(next.items.map(item=>{
    const previous=item.url?entries.find(old=>old.url===item.url&&old.status==='READY'):undefined
    const categoryId=previous?.categoryId&&groups.some(group=>group.id===previous.categoryId)?previous.categoryId:previous?.newCategoryName?null:groups[0]?.id??null
    return {...item,label:previous?.label??item.suggestedTitle,categoryId,newCategoryName:categoryId?null:previous?.newCategoryName??'Importados',selected:item.status==='READY'&&(previous?.selected??true)}
   }));setConfirmed(false);setStep(1)
  }catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível revisar os endereços.')}
  finally{busy.current=false;setPending(false)}
 }
 async function apply(){
  if(busy.current||!preview||!confirmed)return;busy.current=true;setPending(true);setError('');setNeedsReview(false)
  try{
   const choices:ImportChoice[]=entries.filter(entry=>entry.selected&&entry.status==='READY').map(({line,label,categoryId,newCategoryName})=>({line,label,categoryId,newCategoryName}))
   const saved=await confirmImport(preview,choices);if(!saved.profile.draft||saved.createdIds.length!==choices.length)throw new Error('O servidor não confirmou todos os links. Tente novamente com a mesma seleção.')
   setResult(saved);setState(saved.profile);setRaw('')
  }catch(reason){setNeedsReview(reason instanceof Error&&'status' in reason&&(reason.status===409||reason.status===422));setError(reason instanceof Error?reason.message:'Não foi possível adicionar os links. Sua seleção foi mantida.')}
  finally{busy.current=false;setPending(false)}
 }
 const back=()=>{setStep(value=>Math.max(0,value-1));setConfirmed(false);setError('')},selected=entries.filter(entry=>entry.selected&&entry.status==='READY')
 if(loading)return <ImportSkeleton/>
 if(!state)return <ErrorState message={error} onRetry={()=>void load()}/>
 if(!state.draft)return <EmptyState action={<ButtonLink href="/painel/perfil"><ActionIcon name="profile"/>Criar minha página</ButtonLink>}>Salve o nome e o endereço da sua página para importar links.</EmptyState>
 return <section className={styles.page} aria-label="Importação para minha página"><WorkspaceActions><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Voltar à edição</ButtonLink></WorkspaceActions>
  {result?<><div className={styles.card} ref={status} role="status" tabIndex={-1}><p className={styles.summary}>{result.createdIds.length} {result.createdIds.length===1?'link adicionado':'links adicionados'} ao rascunho.</p><p>Confira a prévia e publique pelo editor quando estiver pronto.</p></div><WorkspaceActions><ButtonLink variant="secondary" href="/painel/perfil/previa"><ActionIcon name="preview"/>Ver prévia</ButtonLink><ButtonLink href="/painel/perfil"><ActionIcon name="edit"/>Continuar edição</ButtonLink></WorkspaceActions></>:<>
   <FormSteps labels={importSteps} current={step} onBack={pending?undefined:index=>{setStep(index);setError('');setConfirmed(false)}}/>
   {error?<div className={styles.notice} role="alert"><p className={styles.error}>{error}</p>{preview&&needsReview?<WorkspaceActions><Button variant="secondary" disabled={pending} onClick={()=>{setStep(0);setConfirmed(false);setError('')}}><ActionIcon name="refresh"/>Revisar novamente</Button></WorkspaceActions>:null}</div>:null}
   {step===0?<ImportPaste value={raw} onChange={setRaw} onReview={()=>void review()} pending={pending}/>:null}
   {step===1?<><ImportReviewList entries={entries} groups={state.draft.categories} onSelect={(line,value)=>setEntries(old=>old.map(entry=>entry.line===line?{...entry,selected:value}:entry))} onEdit={(entry,button)=>{trigger.current=button;setEditing(entry)}}/><WorkspaceActions><Button variant="secondary" onClick={back}><ActionIcon name="back"/>Corrigir endereços</Button><Button disabled={!selected.length} onClick={()=>{setConfirmed(false);setStep(2)}}><ActionIcon name="next"/>Continuar</Button></WorkspaceActions></>:null}
   {step===2?<form className={styles.page} onSubmit={event=>{event.preventDefault();void apply()}}><div className={styles.card}><p className={styles.summary}>{selected.length} {selected.length===1?'link selecionado':'links selecionados'}</p><p>Serão adicionados ao rascunho. A página pública continua como está até você publicar.</p><label className={styles.choice}><input type="checkbox" required checked={confirmed} disabled={pending} onChange={event=>setConfirmed(event.target.checked)}/><span>Revisei os títulos e grupos dos links selecionados</span><span className={styles.required} aria-hidden="true">*</span></label></div><WorkspaceActions><Button variant="secondary" type="button" disabled={pending} onClick={back}><ActionIcon name="back"/>Voltar à revisão</Button><Button type="submit" loading={pending} disabled={!confirmed||!selected.length}><ActionIcon name="importLinks"/>Adicionar ao rascunho</Button></WorkspaceActions></form>:null}
  </>}
  {editing?<ImportEditDialog key={editing.line} entry={editing} groups={state.draft.categories} trigger={trigger.current} onClose={()=>setEditing(null)} onSave={value=>{setEntries(old=>old.map(entry=>entry.line===value.line?value:entry));setEditing(null);setConfirmed(false)}}/>:null}
 </section>
}
