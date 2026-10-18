'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorState } from '@/components/feedback/error-state'
import { ProfileView } from './components/profile-view'
import { ProfileAgeGate } from './profile-age-gate'
import { publicProfileRequest } from './profile-api'
import { useProfileBoundary } from './use-profile-boundary'
import type { PublicProfile } from './profile-contract'

/** Initial content is server-rendered. Future destinations never reach this component. */
export function ProfileLive({initial,slug,avatarUrl}:{initial:PublicProfile;slug:string;avatarUrl?:string}) {
  const [profile,setProfile]=useState(initial),[pending,setPending]=useState(false),[error,setError]=useState(''),busy=useRef(false),mounted=useRef(true)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
  const refresh=useCallback(async()=>{
    if(busy.current)return
    busy.current=true;setPending(true);setError('')
    try{const result=await publicProfileRequest(slug);if(mounted.current){setProfile(result);setPending(false)}}catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Não foi possível atualizar os links.')}finally{busy.current=false}
  },[slug])
  useProfileBoundary(profile,refresh)
  const notice=error?<ErrorState message={error} onRetry={()=>void refresh()}/>:undefined
  return profile.restricted?<>{notice}<ProfileAgeGate/></>:<ProfileView content={profile} pending={pending} avatarUrl={avatarUrl} notice={notice}/>
}
