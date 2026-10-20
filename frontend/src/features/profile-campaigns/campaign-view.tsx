'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {api} from '@/lib/api'
import {profileRequest} from '@/features/profiles/profile-api'
import {ProfileView} from '@/features/profiles/components/profile-view'
import {ProfileAgeGate} from '@/features/profiles/profile-age-gate'
import {useProfileBoundary} from '@/features/profiles/use-profile-boundary'
import {useProfileInteraction} from '@/features/profile-interaction/use-profile-interaction'
import {ErrorState} from '@/components/feedback/error-state'
import type {CampaignPublic} from './campaign-contract'
export function CampaignView({initial,slug,campaignSlug,previewId}:{initial:CampaignPublic;slug:string;campaignSlug?:string;previewId?:string}){
 const [content,setContent]=useState(initial),[pending,setPending]=useState(false),[error,setError]=useState(''),root=useRef<HTMLDivElement>(null),busy=useRef(false),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const refresh=useCallback(async()=>{
  if(busy.current)return;busy.current=true;setPending(true);setError('')
  try{let value:CampaignPublic;if(previewId)value=await profileRequest('/campaigns/'+encodeURIComponent(previewId)+'/preview');else{const response=await api<CampaignPublic&{message?:string}>('/v1/profiles/'+encodeURIComponent(slug)+'/campaigns/'+encodeURIComponent(campaignSlug??''),{cache:'no-store'});if(response.status!==200)throw new Error(response.body.message??'A campanha não está disponível.');value=response.body}if(alive.current)setContent(value)}
  catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Não foi possível atualizar a campanha.')}
  finally{busy.current=false;if(alive.current)setPending(false)}
 },[slug,campaignSlug,previewId])
 useProfileBoundary(content,refresh);useProfileInteraction(root,content.restricted?undefined:content.measurement,Boolean(previewId)||pending||Boolean(error))
 if(content.restricted)return <ProfileAgeGate/>
 const parent=content.parentSlug??slug,avatarUrl=content.avatarAssetId?'/bff/v1/profiles/'+encodeURIComponent(parent)+'/avatar/'+content.avatarAssetId:undefined
 return <div ref={root}><ProfileView content={content} avatarUrl={avatarUrl} pending={pending||Boolean(error)} notice={error?<ErrorState message={error} onRetry={()=>void refresh()}/>:undefined}/></div>
}
