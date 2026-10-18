'use client'
import {useState} from 'react'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {FormSteps} from '@/components/ui/form-steps'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Badge} from '@/components/ui/badge'
import {ProfileView} from '@/features/profiles/components/profile-view'
import {templateDemonstration} from './template-contract'
import type {ProfileTemplate} from './template-contract'
import styles from './templates.module.css'
export type TemplatePreviewDialogProps={template:ProfileTemplate;configured:boolean;unpublished:boolean;pending:boolean;error:string;trigger?:HTMLElement|null;onApply:(preserveContent:boolean,confirmedReplacement:boolean)=>void;onClose:()=>void}
export function TemplatePreviewDialog({template,configured,unpublished,pending,error,trigger,onApply,onClose}:TemplatePreviewDialogProps){
  const [step,setStep]=useState(0),[preserve,setPreserve]=useState(true),[confirmed,setConfirmed]=useState(false)
  const replacement=configured&&!preserve,ready=!replacement||confirmed
  const description='Prévia fictícia do modelo '+template.title+'. Grupos: '+template.groups.map(group=>group.name).join(', ')+'. Botões: '+template.groups.flatMap(group=>group.links.map(link=>link.label)).join(', ')+'.'
  return <OverlayDialog open title={template.title} onClose={onClose} returnFocusTo={trigger} closeDisabled={pending}><div className={styles.dialog} aria-busy={pending||undefined}>
    <FormSteps labels={['Prévia','Aplicar']} current={step} onBack={pending?undefined:setStep}/>
    {step===0?<><Badge tone="neutral">Demonstração com exemplos</Badge><div className={styles.demo} role="img" tabIndex={0} aria-label={description}><div inert><ProfileView content={templateDemonstration(template)} heading="h3" embedded/></div></div></>:<><p className={styles.note}>O modelo muda o rascunho. A página pública só muda depois de publicar.</p>{configured?<label className={styles.check}><input type="checkbox" checked={preserve} disabled={pending} onChange={event=>{setPreserve(event.target.checked);setConfirmed(false)}}/>Manter meus grupos e links</label>:<p className={styles.note}>Os exemplos ficam ocultos até você configurar seus endereços.</p>}{configured&&preserve?<p className={styles.note}>Apenas as cores e o estilo serão aplicados.</p>:null}{replacement?<div className={styles.warning}><p>Seus grupos e links serão substituídos. Nome, endereço, descrição e foto serão mantidos.</p>{unpublished?<p>As alterações ainda não publicadas nesses grupos e links também serão substituídas.</p>:null}<label className={styles.check}><input type="checkbox" required disabled={pending} checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>Confirmo a substituição dos grupos e links<span aria-hidden="true" className={styles.required}/></label></div>:null}</>}
    {error?<p className={styles.error} role="alert">{error}</p>:null}
    <div className={styles.actions}>{step===0?<Button type="button" onClick={()=>setStep(1)}><ActionIcon name="next"/>Continuar</Button>:<><Button type="button" variant="secondary" disabled={pending} onClick={()=>setStep(0)}><ActionIcon name="back"/>Voltar à prévia</Button><Button type="button" disabled={pending||!ready} loading={pending} onClick={()=>onApply(preserve,replacement&&confirmed)}><ActionIcon name="save"/>Aplicar ao rascunho</Button></>}</div>
  </div></OverlayDialog>
}
