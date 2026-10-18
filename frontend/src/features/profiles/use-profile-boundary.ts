'use client'
import {useEffect} from 'react'
import type {PublicProfile} from './profile-contract'
/** Shared server-derived timer. Browser wall-clock never grants visibility. */
export function useProfileBoundary(profile:PublicProfile,refresh:()=>Promise<void>){
 useEffect(()=>{
  if(profile.restricted||!profile.serverNow)return
  const boundaries=[profile.nextBoundary,profile.measurement?.expiresAt].filter((value):value is string=>Boolean(value))
  if(!boundaries.length)return
  const delay=Math.max(0,Math.min(...boundaries.map(value=>new Date(value).getTime()))-new Date(profile.serverNow).getTime()),started=performance.now()
  const timer=setTimeout(()=>void refresh(),Math.min(2147483647,Math.max(250,delay-1000)))
  const visible=()=>{if(document.visibilityState==='visible'&&performance.now()-started>=Math.max(0,delay-1000))void refresh()}
  document.addEventListener('visibilitychange',visible)
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visible)}
 },[profile,refresh])
}
