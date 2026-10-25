'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {Button,ButtonLink} from '@/components/ui/button'
import {SubscriptionLink} from '@/features/profile-billing/billing-access'
import {ActionIcon} from '@/components/ui/action-icon'
import {Badge} from '@/components/ui/badge'
import {Field,Input,Select} from '@/components/ui/input'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import {RefreshButton} from '@/components/layout/workspace-actions'
import {Pagination} from '@/components/ui/pagination'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {ErrorState} from '@/components/feedback/error-state'
import {EmptyState} from '@/components/feedback/empty-state'
import {profileRequest} from '@/features/profiles/profile-api'
import type {ProfileRevision,ProfileRevisionDetail} from '@/features/profiles/profile-contract'
import {CampaignEditorDialog} from './campaign-editor-dialog'
import type {CampaignRow,CampaignDetail,CampaignList,CampaignEditorDraft} from './campaign-contract'
import styles from './campaign.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
const status=(row:CampaignRow)=>row.state==='ARCHIVED'?'Arquivada':row.state==='DRAFT'?'Rascunho':row.changed?'Alterações não publicadas':'Publicada'
export function CampaignScreen({pendingOnly=false}:{pendingOnly?:boolean}){
 const [list,setList]=useState<CampaignList|null>(null),[revisions,setRevisions]=useState<ProfileRevision[]>([]),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[editor,setEditor]=useState<CampaignEditorDraft|null>(null),[editorError,setEditorError]=useState(''),[confirmError,setConfirmError]=useState(''),[confirm,setConfirm]=useState<{row:CampaignRow;kind:'archive'|'delete'}|null>(null)
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('ALL'),[page,setPage]=useState(1),busy=useRef(false),focus=useRef<HTMLElement|null>(null),noticeRef=useRef<HTMLParagraphElement>(null),sequence=useRef(0)
 const load=useCallback(async()=>{if(pendingOnly)return;const id=++sequence.current;setLoading(true);setError('');try{const [next,sources]=await Promise.all([profileRequest<CampaignList>('/campaigns?'+new URLSearchParams({q:query,state:filter,page:String(page)})),profileRequest<{revisions:ProfileRevision[]}>('/campaign-sources')]);if(id===sequence.current){setList(next);setRevisions(sources.revisions)}}catch(reason){if(id===sequence.current)setError(reason instanceof Error?reason.message:'Não foi possível carregar campanhas.')}finally{if(id===sequence.current)setLoading(false)}},[pendingOnly,query,filter,page])
 useEffect(()=>{const timer=setTimeout(()=>void load(),query?300:0);return()=>{clearTimeout(timer);sequence.current++}},[load,query])
 async function openEditor(row:CampaignRow|null,trigger:HTMLElement){
  if(busy.current)return;busy.current=true;focus.current=trigger;setPending(true);setError('');setEditorError('')
  try{if(row){const value=await profileRequest<CampaignDetail>('/campaigns/'+row.id);setEditor({id:row.id,name:value.name,slug:value.slug,sourceRevisionId:value.sourceRevisionId,sourceVersion:value.sourceVersion,source:value.source,selected:value.content.items.map(item=>item.id),expectedVersion:value.version})}
   else{const revision=revisions[0];if(!revision)throw new Error('Publique sua página antes de criar uma campanha.');const source=await profileRequest<ProfileRevisionDetail>('/campaign-sources/'+revision.id);const groups=new Set(source.content.categories.filter(row=>row.visible).map(row=>row.id));setEditor({id:null,name:'',slug:'',sourceRevisionId:revision.id,sourceVersion:source.version,source:source.content,selected:source.content.items.filter(row=>row.visible&&!row.templateExample&&groups.has(row.categoryId)).map(row=>row.id),expectedVersion:0})}}
  catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível abrir a campanha.')}
  finally{busy.current=false;setPending(false)}
 }
 async function changeSource(id:string){if(!editor||busy.current)return;busy.current=true;setPending(true);setEditorError('');try{const value=await profileRequest<ProfileRevisionDetail>('/campaign-sources/'+id),groups=new Set(value.content.categories.filter(row=>row.visible).map(row=>row.id));setEditor({...editor,sourceRevisionId:id,sourceVersion:value.version,source:value.content,selected:value.content.items.filter(row=>row.visible&&!row.templateExample&&groups.has(row.categoryId)).map(row=>row.id)})}catch(reason){setEditorError(reason instanceof Error?reason.message:'Não foi possível abrir a publicação.')}finally{busy.current=false;setPending(false)}}
 async function save(){if(!editor||busy.current)return;busy.current=true;setPending(true);setEditorError('');try{await profileRequest<CampaignDetail>('/campaigns'+(editor.id?'/'+editor.id:''),{method:editor.id?'PATCH':'POST',body:JSON.stringify({name:editor.name,slug:editor.slug,itemSelection:editor.selected,...(editor.id?{expectedVersion:editor.expectedVersion}:{sourceRevisionId:editor.sourceRevisionId})})});setEditor(null);setNotice('Rascunho da campanha salvo. Confira a prévia antes de publicar.');await load()}catch(reason){setEditorError(reason instanceof Error?reason.message:'Não foi possível salvar. Seu formulário foi mantido.')}finally{busy.current=false;setPending(false)}}
 async function mutate(row:CampaignRow,kind:'publish'|'archive'|'delete'){
  if(busy.current)return;busy.current=true;setPending(true);setError('');setConfirmError('');setNotice('');let complete=false
  try{await profileRequest('/campaigns/'+row.id+(kind==='delete'?'':'/'+kind),{method:kind==='delete'?'DELETE':'POST',body:JSON.stringify({expectedVersion:row.version})});setConfirm(null);setNotice(kind==='publish'?'Campanha publicada.':kind==='archive'?'Campanha arquivada.':'Campanha excluída.');await load();complete=true}
  catch(reason){const message=reason instanceof Error?reason.message:'Não foi possível concluir.';if(kind==='publish')setError(message);else setConfirmError(message)}
  finally{busy.current=false;setPending(false);if(complete)requestAnimationFrame(()=>noticeRef.current?.focus())}
 }
 const skeleton=pendingOnly||loading,disabled=skeleton||pending,rows=list?.campaigns??[]
 const placeholders:CampaignRow[]=[{id:'loading',name:'Nome da campanha',slug:'campanha',state:'DRAFT',version:0,publishedVersion:null,sourceRevisionId:'',sourceVersion:1,changed:false,publicPath:'',createdAt:''}]
 return <section className={styles.page} aria-label="Campanhas da minha página" aria-busy={skeleton||pending}>
  <WorkspaceActions><ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Voltar à edição</ButtonLink><Button disabled={disabled||!revisions.length} onClick={event=>void openEditor(null,event.currentTarget)}><ActionIcon name="plus"/>Nova campanha</Button><RefreshButton disabled={disabled} onClick={()=>void load()}/></WorkspaceActions>
  {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status" ref={noticeRef} tabIndex={-1}>{notice}</p>:null}
  <WorkspaceFilters label="Filtrar campanhas"><Field label="Buscar campanha"><Input value={query} disabled={pendingOnly||pending} onChange={event=>{setQuery(event.target.value);setPage(1)}}/></Field><Field label="Situação"><Select value={filter} disabled={pendingOnly||pending} onChange={event=>{setFilter(event.target.value);setPage(1)}}><option value="ALL">Todas</option><option value="DRAFT">Rascunhos</option><option value="PUBLISHED">Publicadas</option><option value="ARCHIVED">Arquivadas</option></Select></Field></WorkspaceFilters>
  <ul className={styles.list}>{(skeleton?(rows.length?rows:placeholders):rows).map(row=><li key={row.id} aria-hidden={skeleton||undefined} inert={skeleton||undefined}><article className={styles.card} aria-label={row.name}>
   <div className={styles.heading}><h2 className={skeleton?styles.skeleton:undefined}>{row.name}</h2><Badge tone={row.state==='PUBLISHED'?'ok':row.state==='ARCHIVED'?'muted':'neutral'}>{status(row)}</Badge></div><p className={styles.meta}>{row.publicPath||'/p/sua-pagina/c/campanha'} · Base: publicação {row.sourceVersion}</p>
   <div className={styles.actions}><Button variant="secondary" disabled={disabled} aria-label={'Editar '+row.name} onClick={event=>void openEditor(row,event.currentTarget)}><ActionIcon name="edit"/>Editar</Button><ButtonLink variant="secondary" href={'/painel/perfil/campanhas/'+row.id+'/previa'}><ActionIcon name="preview"/>Ver prévia</ButtonLink><SubscriptionLink feature="profile.analytics" variant="secondary" href={'/painel/perfil/campanhas/'+row.id+'/metricas'}><ActionIcon name="interaction"/>Métricas</SubscriptionLink>
    {row.state==='PUBLISHED'?<>{row.changed?<Button disabled={disabled} aria-label={'Publicar '+row.name} onClick={()=>void mutate(row,'publish')}><ActionIcon name="publish"/>Publicar alterações</Button>:null}<ButtonLink variant="secondary" href={row.publicPath}><ActionIcon name="external"/>Abrir campanha</ButtonLink><Button variant="danger" disabled={disabled} aria-label={'Arquivar '+row.name} onClick={event=>{focus.current=event.currentTarget;setConfirmError('');setConfirm({row,kind:'archive'})}}><ActionIcon name="disable"/>Arquivar</Button></>:<Button disabled={disabled} aria-label={'Publicar '+row.name} onClick={()=>void mutate(row,'publish')}><ActionIcon name="publish"/>Publicar</Button>}
    {row.state!=='PUBLISHED'?<Button variant="danger" disabled={disabled} aria-label={'Excluir '+row.name} onClick={event=>{focus.current=event.currentTarget;setConfirmError('');setConfirm({row,kind:'delete'})}}><ActionIcon name="trash"/>Excluir</Button>:null}
   </div>
  <LiquidLens radius={16} /></article></li>)}</ul>
  {!skeleton&&!rows.length&&!error?<EmptyState action={!revisions.length?<ButtonLink href="/painel/perfil"><ActionIcon name="edit"/>Editar minha página</ButtonLink>:undefined}>{revisions.length?'Crie uma campanha a partir de uma publicação sua.':'Publique sua página para começar as campanhas.'}</EmptyState>:null}
  {!skeleton&&list?<Pagination variant="compact" page={page} pages={Math.ceil(list.total/list.pageSize)} onPage={setPage}/>:null}
  {editor?<CampaignEditorDialog key={editor.id??editor.sourceRevisionId} draft={editor} revisions={revisions} pending={pending} error={editorError} returnFocusTo={focus.current} onChange={setEditor} onSource={id=>void changeSource(id)} onSave={()=>void save()} onClose={()=>{if(!pending)setEditor(null)}}/>:null}
  <OverlayDialog open={Boolean(confirm)} title={confirm?.kind==='archive'?'Arquivar campanha?':'Excluir campanha?'} onClose={()=>{if(!pending)setConfirm(null)}} closeDisabled={pending} returnFocusTo={focus.current}><div className={styles.form}>{confirmError?<p role="alert">{confirmError}</p>:null}<p>{confirm?.kind==='archive'?'A campanha sairá do ar. O rascunho e as métricas serão mantidos.':'A campanha e seus dados serão removidos. Esta ação não pode ser desfeita.'}</p><div className={styles.actions}><Button variant="secondary" disabled={pending} onClick={()=>setConfirm(null)}><ActionIcon name="back"/>Cancelar</Button><Button variant="danger" disabled={pending} loading={pending} onClick={()=>{if(confirm)void mutate(confirm.row,confirm.kind)}}><ActionIcon name={confirm?.kind==='archive'?'disable':'trash'}/>{confirm?.kind==='archive'?'Confirmar arquivamento':'Excluir campanha'}</Button></div></div></OverlayDialog>
 </section>
}
