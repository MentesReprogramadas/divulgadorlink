'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import {ErrorState} from '@/components/feedback/error-state'
import {profileRequest,managedProfileId,profileScope} from '@/features/profiles/profile-api'
import type {ProfileDraft,ProfileState} from '@/features/profiles/profile-contract'
import {ChannelDialog,ChannelForm} from './channel-dialog'
import type {ChannelDestinationPage,ChannelGroupsResponse,PrivateChannel} from './channel-contract'

type Props={groupId:string;channelId?:string;trigger:HTMLElement;embedded?:boolean;onPendingChange?:(pending:boolean)=>void;flush:()=>Promise<ProfileDraft>;onSaved:(state:ProfileState)=>void;onClose:()=>void}
export function ProfileAccessEditor({groupId,channelId,trigger,flush,onSaved,onClose,embedded=false,onPendingChange}:Props){
 const target=useRef(managedProfileId()),scoped=useCallback(<T,>(path:string,init?:RequestInit)=>target.current?profileRequest<T>(path,profileScope(init,target.current)):init===undefined?profileRequest<T>(path):profileRequest<T>(path,init),[])
 const [data,setData]=useState<ChannelGroupsResponse|null>(null),[initial,setInitial]=useState<PrivateChannel|null>(null),[sources,setSources]=useState<ChannelDestinationPage>({items:[],nextCursor:null}),[error,setError]=useState(''),[sourceError,setSourceError]=useState(''),[sourcePending,setSourcePending]=useState(false),[retry,setRetry]=useState(0)
 const sourceBusy=useRef(false),sequence=useRef(0)
 useEffect(()=>{
  let active=true
  void (async()=>{
   try{
    await flush()
    const [groups,options]=await Promise.all([scoped<ChannelGroupsResponse>('/channel-groups'),scoped<ChannelDestinationPage>('/channel-destinations')])
    if(!active)return
    const channel=groups.groups.find(group=>group.id===groupId)?.channels.find(channel=>channel.id===channelId)
    if(channelId&&!channel)throw new Error('Este acesso mudou. Feche e abra o grupo novamente.')
    setData(groups);setSources(options);setInitial(channel??{id:crypto.randomUUID(),label:'',networkId:null,destinationRevisionId:'',paused:false,showLabel:false,available:false,destinationLabel:'Novo acesso',network:{name:'Site',slug:'site'}})
   }catch(reason){if(active)setError(reason instanceof Error?reason.message:'Não foi possível carregar o acesso.')}
  })()
  return()=>{active=false;sequence.current++}
 },[groupId,channelId,flush,retry,scoped])
 async function loadSources(cursor?:string){
  if(sourceBusy.current)return;sourceBusy.current=true;setSourcePending(true);setSourceError('');const request=++sequence.current
  try{const next=await scoped<ChannelDestinationPage>('/channel-destinations'+(cursor?'?cursor='+encodeURIComponent(cursor):''));if(sequence.current===request)setSources(previous=>cursor?{items:[...previous.items,...next.items.filter(row=>!previous.items.some(item=>item.id===row.id))],nextCursor:next.nextCursor}:next)}
  catch(reason){if(sequence.current===request)setSourceError(reason instanceof Error?reason.message:'Não foi possível carregar as opções.')}
  finally{sourceBusy.current=false;if(sequence.current===request)setSourcePending(false)}
 }
 async function save(channel:PrivateChannel){
  if(!data)return
  const current=await flush(),group=current.categories.find(group=>group.id===groupId)
  if(!group)throw new Error('O grupo não está mais disponível. Seus campos foram mantidos.')
  const previous=data.groups.find(group=>group.id===groupId)?.channels??[]
  if(!previous.some(row=>row.id===channel.id)&&previous.length>=8)throw new Error('Cada grupo permite até 8 acessos à comunidade.')
  const channels=previous.some(row=>row.id===channel.id)?previous.map(row=>row.id===channel.id?channel:row):[...previous,channel]
  const result=await scoped<ProfileState>('/channel-groups/'+groupId,{method:'PUT',body:JSON.stringify({expectedVersion:current.version,name:group.name,visible:group.visible,channels:channels.map(({id,label,networkId,destinationRevisionId,paused,showLabel})=>({id,label,networkId,destinationRevisionId,paused,showLabel}))})})
  onSaved(result)
 }
 const Form=embedded?ChannelForm:ChannelDialog
 if(data&&initial)return <Form sourceProfileId={target.current??undefined} onPendingChange={onPendingChange} initial={initial} destinations={sources.items} networks={data.networks} trigger={trigger} sourcePending={sourcePending} sourceError={sourceError} hasMore={Boolean(sources.nextCursor)} onRefresh={()=>void loadSources()} onLoadMore={()=>void loadSources(sources.nextCursor??undefined)} onClose={onClose} onSave={save}/>
 const feedback=error?<ErrorState message={error} onRetry={()=>{setError('');setRetry(value=>value+1)}}/>:<p role="status">Carregando convite…</p>
 if(embedded)return feedback
 return <OverlayDialog open title="Convite" returnFocusTo={trigger} onClose={onClose}>{feedback}</OverlayDialog>
}
