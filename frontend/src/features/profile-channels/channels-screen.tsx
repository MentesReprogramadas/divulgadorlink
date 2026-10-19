'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import {Button,ButtonLink} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Field,Input,Select} from '@/components/ui/input'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import {EmptyState} from '@/components/feedback/empty-state'
import {ErrorState} from '@/components/feedback/error-state'
import {SkeletonRegion} from '@/components/feedback/skeleton'
import {profileRequest,ProfileRequestError} from '@/features/profiles/profile-api'
import type {ProfileState} from '@/features/profiles/profile-contract'
import type {ChannelScreenEntry,ChannelGroupDraft,ChannelGroupsResponse,ChannelDestinationPage} from './channel-contract'
import {ChannelGroupEditor} from './channel-group-editor'
import {ChannelGroupsList} from './channel-groups-list'
import styles from './channels.module.css'
const emptySources:ChannelDestinationPage={items:[],nextCursor:null}
const placeholder:ChannelGroupDraft[]=[0,1].map(index=>({id:'pending-'+index,name:'Alternativas da comunidade',visible:true,channels:[0,1].map(channel=>({id:'pending-'+channel,label:'Entrar na comunidade',networkId:null,destinationRevisionId:'',paused:false,available:true,destinationLabel:'Convite aprovado',network:{name:'Canal',slug:'site'}}))}))
const initialEditor:ChannelGroupDraft={id:'pending',name:'',visible:true,channels:[]}
const noop=()=>{}
const authError=(reason:unknown)=>reason instanceof ProfileRequestError&&[401,403].includes(reason.status)
export function ChannelsScreen({entry,pendingOnly=false}:{entry?:ChannelScreenEntry;pendingOnly?:boolean}={}){
 const router=useRouter(),entryKey=entry?.kind==='EDIT'?entry.id:entry?.kind??''
 const [data,setData]=useState<ChannelGroupsResponse|null>(null),[draft,setDraft]=useState<ChannelGroupDraft|null>(null),[sources,setSources]=useState(emptySources),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[sourceError,setSourceError]=useState(''),[sourcePending,setSourcePending]=useState(false),[missingPage,setMissingPage]=useState(false),[missingGroup,setMissingGroup]=useState(false),[notice,setNotice]=useState(''),[removal,setRemoval]=useState<{group:ChannelGroupDraft;trigger:HTMLElement}|null>(null),[removeError,setRemoveError]=useState('')
 const [query,setQuery]=useState(''),[visibility,setVisibility]=useState('ALL'),[validity,setValidity]=useState('ALL'),sequence=useRef(0),sourceSequence=useRef(0),busy=useRef(false),sourceBusy=useRef(false)
 const load=useCallback(async()=>{
  const request=++sequence.current;sourceSequence.current++;setLoading(true);setError('');setMissingPage(false);setMissingGroup(false)
  try{
   const [next,options]=await Promise.all([profileRequest<ChannelGroupsResponse>('/channel-groups'),entryKey?profileRequest<ChannelDestinationPage>('/channel-destinations'):Promise.resolve(emptySources)])
   if(request!==sequence.current)return
   setData(next);setSources(options)
   if(entryKey==='NEW')setDraft({id:crypto.randomUUID(),name:'',visible:true,channels:[]})
   else if(entryKey){const group=next.groups.find(row=>row.id===entryKey);setDraft(group??null);setMissingGroup(!group)}
   return next
  }catch(reason){if(request!==sequence.current)return;if(reason instanceof ProfileRequestError&&reason.status===404){setMissingPage(true);setData(null)}else{setError(reason instanceof Error?reason.message:'Não foi possível carregar os canais.');if(authError(reason))setData(null)}}
  finally{if(request===sequence.current)setLoading(false)}
 },[entryKey])
 useEffect(()=>{if(!pendingOnly)void load();return()=>{sequence.current++;sourceSequence.current++}},[load,pendingOnly])
 async function loadSources(cursor?:string){
  if(sourceBusy.current)return;sourceBusy.current=true;const request=++sourceSequence.current;setSourcePending(true);setSourceError('')
  try{const next=await profileRequest<ChannelDestinationPage>('/channel-destinations'+(cursor?'?cursor='+encodeURIComponent(cursor):''));if(request!==sourceSequence.current)return;setSources(previous=>cursor?{items:[...previous.items,...next.items.filter(item=>!previous.items.some(current=>current.id===item.id))],nextCursor:next.nextCursor}:next)}
  catch(reason){if(request===sourceSequence.current){setSourceError(reason instanceof Error?reason.message:'Não foi possível atualizar os convites.');if(authError(reason))setData(null)}}
  finally{sourceBusy.current=false;if(request===sourceSequence.current)setSourcePending(false)}
 }
 async function save(value:ChannelGroupDraft){
  if(busy.current||!data)return;busy.current=true;setSaving(true);setError('')
  try{await profileRequest('/channel-groups/'+value.id,{method:'PUT',body:JSON.stringify({expectedVersion:data.profileVersion,name:value.name,visible:value.visible,channels:value.channels.map(({id,label,networkId,destinationRevisionId,paused,showLabel})=>({id,label,networkId,destinationRevisionId,paused,showLabel}))})});router.push('/painel/perfil/canais')}
  catch(reason){setError(reason instanceof Error?reason.message:'Não foi possível salvar. Seu rascunho foi mantido.');if(authError(reason))setData(null)}finally{busy.current=false;setSaving(false)}
 }
 async function remove(){
  if(busy.current||!data||!removal)return;busy.current=true;setSaving(true);setRemoveError('')
  try{const result=await profileRequest<ProfileState>('/channel-groups/'+removal.group.id,{method:'DELETE',body:JSON.stringify({expectedVersion:data.profileVersion})});if(!result.draft)throw new Error('Atualize a lista para confirmar a remoção.');setData({...data,profileVersion:result.draft.version,publishedVersion:result.publishedVersion,groups:data.groups.filter(group=>group.id!==removal.group.id)});setRemoval(null);setNotice('Grupo removido do rascunho.')}
  catch(reason){if(authError(reason)){setData(null);setRemoval(null);setError(reason instanceof Error?reason.message:'Entre novamente.')}else{try{const next=await profileRequest<ChannelGroupsResponse>('/channel-groups');if(!next.groups.some(group=>group.id===removal.group.id)){setData(next);setRemoval(null);setNotice('Remoção confirmada no rascunho.')}else setRemoveError(reason instanceof Error?reason.message:'Não foi possível remover.')}catch{setRemoveError(reason instanceof Error?reason.message:'Não foi possível confirmar a remoção.')}}}finally{busy.current=false;setSaving(false)}
 }
 const waiting=pendingOnly||loading,back=<ButtonLink variant="secondary" href="/painel/perfil"><ActionIcon name="back"/>Voltar à edição</ButtonLink>
 if(missingPage)return <section className={styles.page} aria-label="Canais da minha página"><WorkspaceActions>{back}</WorkspaceActions><EmptyState action={<ButtonLink href="/painel/perfil"><ActionIcon name="profile"/>Criar minha página</ButtonLink>}>Crie sua página para adicionar alternativas de acesso.</EmptyState></section>
 if(entryKey){return <section className={styles.page} aria-label="Canais da minha página" aria-busy={waiting||undefined}>{waiting?<SkeletonRegion label="Carregando grupo de canais"><ChannelGroupEditor initial={initialEditor} destinations={[]} networks={[]} pending error="" sourcePending={false} sourceError="" hasMore={false} onLoadMore={noop} onRefresh={noop} onCancel={noop} onSave={async()=>{}}/></SkeletonRegion>:missingGroup?<><WorkspaceActions><ButtonLink href="/painel/perfil/canais"><ActionIcon name="back"/>Voltar à lista</ButtonLink></WorkspaceActions><EmptyState>Este grupo não está disponível nesta conta.</EmptyState></>:data&&draft?<ChannelGroupEditor key={draft.id} initial={draft} destinations={sources.items} networks={data.networks} pending={saving} error={error} sourcePending={sourcePending} sourceError={sourceError} hasMore={Boolean(sources.nextCursor)} onLoadMore={()=>void loadSources(sources.nextCursor??undefined)} onRefresh={()=>void loadSources()} onCancel={()=>router.push('/painel/perfil/canais')} onSave={save}/>:<><WorkspaceActions>{back}</WorkspaceActions>{error?<ErrorState message={error} onRetry={()=>void load()}/>:null}</>}</section>}
 const needsPublication=Boolean(data&&data.profileVersion!==data.publishedVersion),disabled=waiting||saving||Boolean(error),filtered=(data?.groups??placeholder).filter(group=>group.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))&&(visibility==='ALL'||group.visible===(visibility==='VISIBLE'))&&(validity==='ALL'||(validity==='NEEDS_REVIEW')===(group.channels.length===0||group.channels.some(channel=>!channel.available))))
 const list=filtered.length?<ChannelGroupsList groups={filtered} published={Boolean(data&&data.profileVersion===data.publishedVersion)} pending={waiting} disabled={disabled} onRemove={(group,trigger)=>{setRemoveError('');setRemoval({group,trigger})}}/>:<EmptyState>{query||visibility!=='ALL'||validity!=='ALL'?'Nenhum grupo corresponde aos filtros.':'Reúna os canais da sua comunidade em um só grupo.'}</EmptyState>
 return <section className={styles.page} aria-label="Canais da minha página" aria-busy={waiting||undefined}><WorkspaceActions>{back}{needsPublication?<ButtonLink href="/painel/perfil/checklist"><ActionIcon name="checklist"/>Revisar página</ButtonLink>:null}<ButtonLink variant={needsPublication?'secondary':'primary'} href="/painel/perfil/canais/novo" aria-disabled={disabled||undefined} onClick={event=>{if(disabled)event.preventDefault()}}><ActionIcon name="plus"/>Novo grupo</ButtonLink><Button variant="secondary" disabled={waiting||saving} aria-label="Atualizar canais" onClick={()=>void load()}><ActionIcon name="refresh"/></Button></WorkspaceActions>
  <WorkspaceFilters label="Filtros de canais"><Field label="Buscar grupo" icon={<ActionIcon name="search"/>}><Input type="search" disabled={waiting} value={query} onChange={event=>setQuery(event.target.value)}/></Field><Field label="Exibição"><Select disabled={waiting} value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="ALL">Todos</option><option value="VISIBLE">Visíveis</option><option value="HIDDEN">Ocultos</option></Select></Field><Field label="Situação dos convites"><Select disabled={waiting} value={validity} onChange={event=>setValidity(event.target.value)}><option value="ALL">Todos</option><option value="READY">Válidos</option><option value="NEEDS_REVIEW">Revisar</option></Select></Field></WorkspaceFilters>
  {error?<ErrorState message={error} onRetry={()=>void load()}/>:null}{notice?<p role="status" className={styles.notice}>{notice}</p>:null}{waiting?<SkeletonRegion label="Carregando canais">{list}</SkeletonRegion>:data?list:null}
  {removal?<OverlayDialog open title="Remover grupo de canais" returnFocusTo={removal.trigger} closeDisabled={saving} onClose={()=>{if(!saving)setRemoval(null)}}><p>Remover este grupo do rascunho? A publicação atual continua até você publicar novamente.</p>{removeError?<p role="alert" className={styles.failure}>{removeError}</p>:null}<div className={styles.actions}><Button variant="secondary" disabled={saving} onClick={()=>setRemoval(null)}><ActionIcon name="back"/>Cancelar</Button><Button variant="danger" loading={saving} onClick={()=>void remove()}><ActionIcon name="trash"/>Remover grupo</Button></div></OverlayDialog>:null}
 </section>
}
