'use client'
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {ProfileView} from './components/profile-view'
import {ProfileAgeGate} from './profile-age-gate'
import {ProfileSearchControls} from './components/profile-search-controls'
import {useProfileBoundary} from './use-profile-boundary'
import {loadProfileSearch} from './profile-search-api'
import {emptyProfileQuery,profileSearchParams,readProfileSearch,type ProfileSearchPage,type ProfileSearchQuery,type ProfileSearchSource} from './profile-search-contract'
import {ErrorState} from '@/components/feedback/error-state'
import {EmptyState} from '@/components/feedback/empty-state'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import styles from './components/profile-search.module.css'
import {useProfileInteraction} from '@/features/profile-interaction/use-profile-interaction'
type Navigation='push'|'replace'|'refresh'|'page'|'history'
function writePublicQuery(slug:string,query:ProfileSearchQuery,method:'pushState'|'replaceState'){
 const url=new URL(window.location.href);url.pathname='/p/'+encodeURIComponent(slug)
 for(const name of ['q','categoryId','cursor'])url.searchParams.delete(name)
 profileSearchParams(query).forEach((value,name)=>url.searchParams.set(name,value))
 window.history[method](null,'',url.pathname+url.search+url.hash)
}
export function ProfileExplorer({initial,source,pending=false,initialNotice=''}:{initial:Extract<ProfileSearchPage,{restricted:false}>;source:ProfileSearchSource;pending?:boolean;initialNotice?:string}){
 const [profile,setProfile]=useState<ProfileSearchPage>(initial),[query,setQuery]=useState(initial.search.filters),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(initialNotice),[announced,setAnnounced]=useState(false)
 const current=useRef(initial.search.filters),sequence=useRef(0),active=useRef<{key:string;controller:AbortController}|null>(null),root=useRef<HTMLDivElement>(null),focusResults=useRef(false)
 const publicSlug=source.kind==='public'?source.slug:null,previewAt=source.kind==='preview'?source.at:undefined
 const origin=useMemo<ProfileSearchSource>(()=>publicSlug===null?{kind:'preview',at:previewAt}:{kind:'public',slug:publicSlug},[publicSlug,previewAt])
 const request=useCallback(async function fetchPage(next:ProfileSearchQuery,mode:Navigation='push',restarted=false):Promise<void>{
  const key=JSON.stringify(next);if(active.current?.key===key)return
  active.current?.controller.abort();const controller=new AbortController(),id=++sequence.current;active.current={key,controller};current.current=next
  setLoading(true);setError('');setNotice(restarted?'Os resultados mudaram. Mostrando a primeira página.':'')
  if(mode==='history'||restarted)setQuery(next)
  try{
   const received=await loadProfileSearch(origin,next,controller.signal);if(id!==sequence.current)return
   setProfile(received);setAnnounced(true)
   if(!received.restricted){
    current.current=received.search.filters;if(mode!=='refresh')setQuery(received.search.filters)
    if(origin.kind==='public'){
     if(mode!=='history')writePublicQuery(origin.slug,received.search.filters,mode==='push'||mode==='page'?'pushState':'replaceState')
    }
   }
   focusResults.current=mode==='page'
  }catch(reason){
   if(id!==sequence.current||controller.signal.aborted)return
   if(next.cursor&&reason instanceof Error&&'status' in reason&&reason.status===409){active.current=null;await fetchPage({...next,cursor:null},'replace',true);return}
   setError(reason instanceof Error?reason.message:'Não foi possível atualizar os links.')
  }finally{if(id===sequence.current){active.current=null;setLoading(false)}}
 },[origin])
 const refresh=useCallback(async()=>{await request(current.current,'refresh')},[request])
 useProfileBoundary(profile,refresh)
 useProfileInteraction(root,profile.restricted?undefined:profile.measurement,origin.kind!=='public'||pending||loading||Boolean(error))
 useEffect(()=>()=>{sequence.current++;active.current?.controller.abort();active.current=null},[])
 useEffect(()=>{if(origin.kind==='public')writePublicQuery(origin.slug,initial.search.filters,'replaceState')},[origin,initial.search.filters])
 useEffect(()=>{
  if(origin.kind!=='public')return
  const back=()=>{try{void request(readProfileSearch(new URLSearchParams(location.search)),'history')}catch(reason){setError(reason instanceof Error?reason.message:'Confira os filtros.')}}
  window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back)
 },[origin,request])
 useLayoutEffect(()=>{if(!loading&&!error&&focusResults.current){focusResults.current=false;root.current?.querySelector<HTMLElement>('article a[href]')?.focus()}},[loading,error,profile])
 if(profile.restricted)return <ProfileAgeGate/>
 const blocked=pending||loading||Boolean(error),avatarUrl=profile.avatarAssetId?(origin.kind==='public'?'/bff/v1/profiles/'+encodeURIComponent(origin.slug)+'/avatar/':'/bff/v1/me/profile/avatar/')+profile.avatarAssetId:undefined
 const controls=<ProfileSearchControls query={query} groups={profile.search.groups} pending={pending||loading} onQuery={setQuery} onSubmit={()=>void request({...query,cursor:null})} onClear={()=>{const empty=emptyProfileQuery();setQuery(empty);void request(empty)}}/>
 const navigation=<div className={styles.actions}>{profile.search.filters.cursor?<Button variant="secondary" disabled={pending||loading} onClick={()=>void request({...current.current,cursor:null},'page')}><ActionIcon name="back"/>Voltar ao início</Button>:null}{profile.search.nextCursor?<Button disabled={pending||loading} onClick={()=>void request({...current.current,cursor:profile.search.nextCursor},'page')}><ActionIcon name="next"/>Próximos links</Button>:null}</div>
 return <div ref={root}><ProfileView content={profile} pending={blocked} avatarUrl={avatarUrl} controls={controls} navigation={navigation} empty={<EmptyState>Nenhum link encontrado.</EmptyState>} notice={<>{error?<ErrorState message={error} onRetry={()=>void request(current.current,'refresh')}/>:null}{notice?<p className={styles.notice} role="status">{notice}</p>:null}</>}/><span className={styles.announcement} role="status" aria-label="Resultado da busca">{announced&&!loading&&!error?'Links atualizados.':''}</span></div>
}
