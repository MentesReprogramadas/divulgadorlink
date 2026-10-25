'use client'
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react'
import {ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Field,Select} from '@/components/ui/input'
import {EmptyState} from '@/components/feedback/empty-state'
import {ErrorState} from '@/components/feedback/error-state'
import {SkeletonRegion} from '@/components/feedback/skeleton'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import {RefreshButton} from '@/components/layout/workspace-actions'
import {profileRequest} from '@/features/profiles/profile-api'
import {hasUnpublishedProfile} from '@/features/profiles/profile-diff'
import type {ProfileState} from '@/features/profiles/profile-contract'
import {applyProfileTemplate,loadProfileTemplates} from './template-api'
import type {ProfileTemplate} from './template-contract'
import {TemplateGrid} from './template-grid'
import {TemplatesSkeleton} from './templates-skeleton'
import {TemplatePreviewDialog} from './template-preview-dialog'
import styles from './templates.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function TemplatesScreen(){
  const [templates,setTemplates]=useState<ProfileTemplate[]>([]),[state,setState]=useState<ProfileState|null>(null),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(''),[dialogError,setDialogError]=useState(''),[notice,setNotice]=useState('')
  const [activity,setActivity]=useState(''),[selected,setSelected]=useState<ProfileTemplate|null>(null),[pending,setPending]=useState(false),busy=useRef(false),trigger=useRef<HTMLElement|null>(null),status=useRef<HTMLParagraphElement>(null)
  const load=useCallback(async()=>{
    setError('');setRefreshing(true)
    try{const [profile,models]=await Promise.all([profileRequest<ProfileState>(''),loadProfileTemplates()]);setState(profile);setTemplates(models)}catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível carregar os modelos.')}finally{setLoading(false);setRefreshing(false)}
  },[])
  useEffect(()=>{void load()},[load])
  useLayoutEffect(()=>{if(notice)status.current?.focus()},[notice])
  async function apply(preserveContent:boolean,confirmedReplacement:boolean){
    if(busy.current||!selected||!state?.draft)return
    busy.current=true;setPending(true);setDialogError('')
    try{const kept=preserveContent&&(state.draft.categories.length>0||state.draft.items.length>0);const next=await applyProfileTemplate(selected.versionId,preserveContent,state.draft.version,confirmedReplacement);if(!next.draft)throw new Error('O servidor não confirmou o rascunho. Recarregue os dados.');setState(next);setSelected(null);setNotice(kept?'Estilo aplicado ao rascunho. Seus grupos e links foram mantidos.':'Modelo aplicado ao rascunho. Configure os endereços dos exemplos antes de publicar.')}
    catch(reason){setDialogError(reason instanceof Error?reason.message:'Não foi possível aplicar. Seu rascunho foi mantido.')}
    finally{busy.current=false;setPending(false)}
  }
  if(loading)return <TemplatesSkeleton/>
  const filtered=templates.filter(template=>!activity||template.activity===activity),configured=Boolean(state?.draft&&(state.draft.categories.length||state.draft.items.length))
  const grid=<TemplateGrid templates={filtered} loading={refreshing} disabled={pending} onPreview={(template,button)=>{trigger.current=button;setSelected(template);setDialogError('')}}/>
  return <section className={styles.page} aria-label="Modelos da minha página"><WorkspaceActions><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Voltar à edição</ButtonLink>{notice?<ButtonLink href="/painel/perfil/previa"><ActionIcon name="preview"/>Ver prévia</ButtonLink>:null}<RefreshButton disabled={pending||refreshing} onClick={()=>void load()}/></WorkspaceActions>
    {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p ref={status} tabIndex={-1} role="status" className={styles.notice}>{notice}<LiquidLens radius={16} /></p>:null}
    {state?.draft?<><WorkspaceFilters label="Filtros de modelos"><Field label="Tipo de página"><Select value={activity} disabled={refreshing||pending} onChange={event=>setActivity(event.target.value)}><option value="">Todos os modelos</option>{templates.map(template=><option key={template.versionId} value={template.activity}>{template.title}</option>)}</Select></Field></WorkspaceFilters>{!filtered.length&&!error?<EmptyState>Não há modelos para esta seleção.</EmptyState>:refreshing?<SkeletonRegion label="Atualizando modelos">{grid}</SkeletonRegion>:grid}</>:!error?<EmptyState action={<ButtonLink href="/painel/perfil"><ActionIcon name="edit"/>Criar minha página</ButtonLink>}>Complete o nome e o endereço da página para aplicar um modelo.</EmptyState>:null}
    {selected?<TemplatePreviewDialog key={selected.versionId} template={selected} configured={configured} unpublished={Boolean(state?.draft&&hasUnpublishedProfile(state.draft,state.publishedContent??null))} pending={pending} error={dialogError} trigger={trigger.current} onClose={()=>{if(!busy.current)setSelected(null)}} onApply={(preserve,confirmed)=>void apply(preserve,confirmed)}/>:null}
  </section>
}
