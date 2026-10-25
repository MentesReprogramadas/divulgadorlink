'use client'
import { Checkbox } from '@/components/ui/checkbox'
import {useRef,useState,type FormEvent} from 'react'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {Button} from '@/components/ui/button'
import {Field,Input,Select} from '@/components/ui/input'
import {ActionIcon} from '@/components/ui/action-icon'
import {FormSteps} from '@/components/ui/form-steps'
import {Pagination} from '@/components/ui/pagination'
import {EmptyState} from '@/components/feedback/empty-state'
import type {ProfileRevision} from '@/features/profiles/profile-contract'
import type {CampaignEditorDraft} from './campaign-contract'
import styles from './campaign.module.css'
import {ProfileView} from '@/features/profiles/components/profile-view'
import { LiquidLens } from '@/components/ui/liquid-lens'
type Props={draft:CampaignEditorDraft;revisions:ProfileRevision[];pending:boolean;error:string;returnFocusTo:HTMLElement|null;onChange:(next:CampaignEditorDraft)=>void;onSource:(id:string)=>void;onSave:()=>void;onClose:()=>void}
export function CampaignEditorDialog({draft,revisions,pending,error,returnFocusTo,onChange,onSource,onSave,onClose}:Props){
 const [step,setStep]=useState(0),[query,setQuery]=useState(''),[page,setPage]=useState(1),[validation,setValidation]=useState(''),form=useRef<HTMLFormElement>(null)
 const [preview,setPreview]=useState(false)
 const groups=new Set(draft.source.categories.filter(row=>row.visible).map(row=>row.id)),available=draft.source.items.filter(row=>row.visible&&!row.templateExample&&groups.has(row.categoryId)),filtered=available.filter(row=>row.label.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),visible=filtered.slice((page-1)*2,page*2)
 function submit(event:FormEvent){event.preventDefault();if(pending)return;if(step===0){setValidation('');setStep(1);return}if(!draft.selected.length){setValidation('Escolha pelo menos um link para a campanha.');return}setValidation('');onSave()}
 return <OverlayDialog open title={preview?'Prévia da publicação':draft.id?'Editar campanha':'Nova campanha'} onClose={()=>preview?setPreview(false):onClose()} closeDisabled={pending} returnFocusTo={returnFocusTo} size={preview?'wide':'default'}>
  {preview?<div className={styles.sourcePreview}><div className={styles.previewBanner}><strong>Prévia · publicação {draft.sourceVersion}</strong><Button type="button" onClick={()=>setPreview(false)}><ActionIcon name="back"/>Voltar à configuração</Button></div><div inert><ProfileView embedded heading="h3" content={draft.source}/></div></div>:null}
  <div hidden={preview}>
  <form aria-label={draft.id?'Editar campanha':'Nova campanha'} ref={form} className={styles.form} onSubmit={submit} aria-busy={pending}><FormSteps labels={['Identificação','Escolher links']} current={step} onBack={pending?undefined:setStep}/>
   {step===0?<><Field label="Nome para organizar a campanha" hint="Este nome aparece só no seu painel."><Input required maxLength={80} value={draft.name} disabled={pending} placeholder="Ex.: Campanha de outubro" onChange={event=>onChange({...draft,name:event.target.value})}/></Field>
    <Field label="Final do link da campanha" hint="3 a 40 letras minúsculas, números ou hífens, sem hífen nas pontas."><Input required minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9\x2d]{1,38}[a-z0-9]" value={draft.slug} disabled={pending} placeholder="Ex.: outubro" onChange={event=>onChange({...draft,slug:event.target.value})}/></Field>
    <div className={styles.sourceChoice}>{draft.id?<p className={styles.hint}>Base: publicação {draft.sourceVersion}. Os textos e destinos da base são preservados.</p>:<Field label="Copiar de qual publicação?"><Select required value={draft.sourceRevisionId} disabled={pending} onChange={event=>onSource(event.target.value)}>{revisions.map(row=><option key={row.id} value={row.id}>Publicação {row.version} · {new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(row.createdAt))}</option>)}</Select></Field>}
    <Button type="button" variant="secondary" aria-label="Ver prévia da publicação" title="Ver prévia da publicação" disabled={pending} onClick={()=>setPreview(true)}><ActionIcon name="preview"/>Prévia</Button></div>
   </>:<><p className={styles.hint}>URLs próprias e links permanentes são cópias; links do catálogo continuam vinculados.</p><Field label="Buscar link na publicação"><Input value={query} disabled={pending} onChange={event=>{setQuery(event.target.value);setPage(1)}}/></Field>
    <ul className={styles.selection}>{visible.map(item=><li key={item.id}><label className={styles.choice}><Checkbox checked={draft.selected.includes(item.id)} disabled={pending} aria-label={'Incluir '+item.label} onChange={event=>onChange({...draft,selected:event.target.checked?[...draft.selected,item.id]:draft.selected.filter(id=>id!==item.id)})}/><span><strong>{item.label}</strong><small>{draft.source.categories.find(row=>row.id===item.categoryId)?.name} · {item.type==='CATALOG'?'Link do catálogo':item.destination}</small></span><LiquidLens radius={16} /></label></li>)}</ul>
    {!visible.length?<EmptyState>Nenhum link com este filtro.</EmptyState>:null}<Pagination variant="compact" page={page} pages={Math.ceil(filtered.length/2)} onPage={setPage}/><p className={styles.hint}>{draft.selected.length} {draft.selected.length===1?'link selecionado':'links selecionados'}</p>
   </>}
   {error||validation?<p role="alert">{error||validation}</p>:null}
   <div className={styles.actions}>{step>0?<Button variant="secondary" disabled={pending} onClick={()=>setStep(0)}><ActionIcon name="back"/>Voltar</Button>:null}<Button type="submit" disabled={pending} loading={pending}><ActionIcon name={step===0?'next':'save'}/>{step===0?'Continuar':'Salvar rascunho'}</Button></div>
  </form>
  </div>
 </OverlayDialog>
}
