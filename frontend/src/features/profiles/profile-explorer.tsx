'use client'
import {useButtonTest} from './use-button-test'
import {privateProfileAvatar} from './profile-api'
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
import {pageText} from '@/domain/public-page-locale'
import styles from './components/profile-search.module.css'
import {useProfileInteraction} from '@/features/profile-interaction/use-profile-interaction'
type Navigation='push'|'replace'|'refresh'|'page'|'history'
function writePublicQuery(slug:string,query:ProfileSearchQuery,method:'pushState'|'replaceState'){
 const url=new URL(window.location.href);url.pathname=document.body.dataset.personalHost==='true'?'/':'/p/'+encodeURIComponent(slug)
 const explicitLocale=url.searchParams.has('locale')
 for(const name of ['q','categoryId','cursor','locale'])url.searchParams.delete(name)
 profileSearchParams(query).forEach((value,name)=>{if(name!=='locale'||explicitLocale)url.searchParams.set(name,value)})
 window.history[method](null,'',url.pathname+url.search+url.hash)
}
export function ProfileExplorer({initial,source,pending=false,initialNotice=''}:{initial:Extract<ProfileSearchPage,{restricted:false}>;source:ProfileSearchSource;pending?:boolean;initialNotice?:string}){
 const [profile,setProfile]=useState<ProfileSearchPage>(initial),[query,setQuery]=useState(initial.search.filters),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(initialNotice),[announced,setAnnounced]=useState(false)
 const debounce=useRef<ReturnType<typeof setTimeout>|null>(null)
 const current=useRef(initial.search.filters),sequence=useRef(0),active=useRef<{key:string;controller:AbortController}|null>(null),root=useRef<HTMLDivElement>(null),focusResults=useRef(false)
 const publicSlug=source.kind==='public'?source.slug:null,previewAt=source.kind==='preview'?source.at:undefined
 const origin=useMemo<ProfileSearchSource>(()=>publicSlug===null?{kind:'preview',at:previewAt}:{kind:'public',slug:publicSlug},[publicSlug,previewAt])
 const request=useCallback(async function fetchPage(next:ProfileSearchQuery,mode:Navigation='push',restarted=false):Promise<void>{
  if(debounce.current){clearTimeout(debounce.current);debounce.current=null}
  const key=JSON.stringify(next);if(active.current?.key===key)return
  active.current?.controller.abort();const controller=new AbortController(),id=++sequence.current;active.current={key,controller};current.current=next
  setLoading(true);setError('');setNotice(restarted?'Os resultados mudaram. Mostrando a primeira página.':'')
  if(mode==='history'||restarted)setQuery(next)
  try{
   const received=await loadProfileSearch(origin,next,controller.signal);if(id!==sequence.current)return
   setProfile(received);setAnnounced(true)
   if(!received.restricted){
    current.current=received.search.filters;if(mode!=='refresh')setQuery(received.search.filters)
    if(origin.kind==='preview'){const url=new URL(window.location.href);if(received.search.filters.locale)url.searchParams.set('locale',received.search.filters.locale);else url.searchParams.delete('locale');window.history.replaceState(null,'',url.pathname+url.search)}
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
 const test=useButtonTest(root,origin.kind==='public'?origin.slug:null,profile.restricted?initial:profile,pending||loading||Boolean(error)||profile.restricted)
 useProfileInteraction(root,profile.restricted?undefined:profile.measurement,origin.kind!=='public'||pending||loading||test.loading||Boolean(error))
 useEffect(()=>()=>{if(debounce.current)clearTimeout(debounce.current);sequence.current++;active.current?.controller.abort();active.current=null},[])
 useEffect(()=>{if(origin.kind==='public')writePublicQuery(origin.slug,initial.search.filters,'replaceState')},[origin,initial.search.filters])
 useEffect(()=>{
  if(origin.kind!=='public')return
  const back=()=>{try{void request(readProfileSearch(new URLSearchParams(location.search)),'history')}catch(reason){setError(reason instanceof Error?reason.message:'Confira os filtros.')}}
  window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back)
 },[origin,request])
 useLayoutEffect(()=>{if(!loading&&!error&&focusResults.current){focusResults.current=false;root.current?.querySelector<HTMLElement>('article a[href]')?.focus()}},[loading,error,profile])
 if(profile.restricted)return <ProfileAgeGate/>
 function changeQuery(next:ProfileSearchQuery,immediate=false){
  if(debounce.current)clearTimeout(debounce.current)
  active.current?.controller.abort();active.current=null;sequence.current++;current.current=next
  setQuery(next);setError('');setLoading(true)
  if(immediate)void request(next)
  else debounce.current=setTimeout(()=>void request(next),350)
 }
 const t=(text:string)=>pageText(profile.uiLocale??profile.locale,text)
 const blocked=pending||loading||test.loading,avatarUrl=profile.avatarAssetId?(origin.kind==='public'?'/bff/v1/profiles/'+encodeURIComponent(origin.slug)+'/avatar/'+profile.avatarAssetId:privateProfileAvatar(profile.avatarAssetId)):undefined
 const visibleProfile=error?{...profile,items:[],channelGroups:[],contentBlocks:[]}:profile
 const controls=profile.appearance?.searchEnabled===true?<ProfileSearchControls locale={profile.uiLocale??profile.locale} query={query} groups={profile.search.groups} pending={pending} searching={loading} onQuery={changeQuery} onSubmit={()=>void request({...query,cursor:null})} onClear={()=>changeQuery({...emptyProfileQuery(),...(query.locale?{locale:query.locale}:{})},true)}/>:undefined
 const navigation=<div lang={profile.uiLocale??profile.locale} className={styles.actions}>{profile.search.filters.cursor?<Button variant="secondary" disabled={pending||loading||Boolean(error)} onClick={()=>void request({...current.current,cursor:null},'page')}><ActionIcon name="back"/>{t('Voltar ao início')}</Button>:null}{profile.search.nextCursor?<Button disabled={pending||loading||Boolean(error)} onClick={()=>void request({...current.current,cursor:profile.search.nextCursor},'page')}><ActionIcon name="next"/>{t('Próximos links')}</Button>:null}</div>
 return <div ref={root}><ProfileView mediaUrls={origin.kind==='public'?undefined:Object.fromEntries((profile.contentBlocks??[]).flatMap(block=>block.type==='IMAGE'?[[block.assetId,privateProfileAvatar(block.assetId)]]:[]))} contactPreview={source.kind==='preview'} content={test.assignment?{...visibleProfile,items:visibleProfile.items.map(item=>item.id===test.assignment!.blockId?{...item,label:test.assignment!.label}:item)}:visibleProfile} pending={blocked} avatarUrl={avatarUrl} controls={controls} navigation={navigation} empty={error?<></>:<EmptyState>{t('Nenhum link encontrado.')}</EmptyState>} notice={<>{error?<ErrorState retryLabel={t('Tentar de novo')} message={t(error)} onRetry={()=>void request(current.current,'refresh')}/>:null}{notice?<p className={styles.notice} role="status">{t(notice)}</p>:null}</>}/><span className={styles.announcement} role="status" aria-label={t('Resultado da busca')}>{announced&&!loading&&!error?t('Links atualizados.') :''}</span></div>
}
