'use client'
import {useEffect,useState,type RefObject} from 'react'
import {api} from '@/lib/api'
import {profileMeasurementConsent,PROFILE_MEASUREMENT_CHANGED} from '@/domain/profile-measurement-consent'
import {interactionViewport,scrollReach,type MeasurementDescriptor} from './interaction-contract'
/** Only published block IDs and coarse reach leave this observer. No input/query/URL listeners. */
export function useProfileInteraction(root:RefObject<HTMLDivElement|null>,descriptor:MeasurementDescriptor|undefined,disabled:boolean){
 const [consented,setConsented]=useState(false)
 useEffect(()=>{const update=()=>setConsented(profileMeasurementConsent());update();window.addEventListener(PROFILE_MEASUREMENT_CHANGED,update);return()=>window.removeEventListener(PROFILE_MEASUREMENT_CHANGED,update)},[])
 useEffect(()=>{
  const element=root.current,privacy=navigator as Navigator&{globalPrivacyControl?:boolean}
  if(!element||!descriptor||disabled||!consented||navigator.doNotTrack==='1'||privacy.globalPrivacyControl||document.body.dataset.support==='true')return
  let alive=true
  let sessionReady=false,opening=Promise.resolve()
  const expires=performance.now()+Math.max(0,Date.parse(descriptor.expiresAt)-Date.parse(descriptor.issuedAt))
  const sent=new Set<string>(),timers=new Map<Element,ReturnType<typeof setTimeout>>()
  function send(kind:'PAGE'|'IMPRESSION'|'CLICK'|'SCROLL',blockId:string|null=null,scrollBucket:number|null=null){
   if(!alive||document.visibilityState!=='visible'||!profileMeasurementConsent()||performance.now()>=expires)return
   const viewportBucket=interactionViewport(innerWidth),key=JSON.stringify([kind,blockId,scrollBucket,viewportBucket]);if(sent.has(key))return;sent.add(key)
   const body=JSON.stringify({eventId:crypto.randomUUID(),profileId:descriptor!.profileId,revisionId:descriptor!.revisionId,surfaceToken:descriptor!.surfaceToken,kind,blockId,viewportBucket,scrollBucket})
   const dispatch=async()=>{if(!profileMeasurementConsent())return false;try{const result=await api(descriptor!.campaignId?'/v1/analytics/profiles/campaigns/'+encodeURIComponent(descriptor!.campaignId)+'/events':'/v1/analytics/profiles/events',{method:'POST',keepalive:true,body});if(result.status>=500)sent.delete(key);return result.status>=200&&result.status<300}catch{sent.delete(key);return false}}
   // Establish the session once; later clicks dispatch synchronously with keepalive before navigation.
   if(kind==='PAGE'&&!sessionReady)opening=dispatch().then(ok=>{sessionReady=ok})
   else if(sessionReady)void dispatch()
   else void opening.then(()=>{if(sessionReady)void dispatch()})
  }
  send('PAGE')
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){
   const id=(entry.target as HTMLElement).dataset.profileBlockId;if(!id)continue
   if(entry.isIntersecting&&entry.intersectionRatio>=.5&&!timers.has(entry.target))timers.set(entry.target,setTimeout(()=>{timers.delete(entry.target);send('IMPRESSION',id)},1000))
   else if(!entry.isIntersecting||entry.intersectionRatio<.5){const timer=timers.get(entry.target);if(timer)clearTimeout(timer);timers.delete(entry.target)}
  }},{threshold:[0,.5,1]})
  element.querySelectorAll('[data-profile-block-id]').forEach(node=>observer.observe(node))
  const click=(event:MouseEvent)=>{const target=event.target instanceof Element?event.target.closest<HTMLElement>('[data-profile-block-id]'):null;if(target&&element.contains(target))send('CLICK',target.dataset.profileBlockId!)}
  const scroll=()=>{const rect=element.getBoundingClientRect(),reach=scrollReach(-rect.top,innerHeight,element.scrollHeight);for(const bucket of [25,50,75,100])if(reach>=bucket)send('SCROLL',null,bucket)}
  const visible=()=>{if(document.visibilityState==='visible'){send('PAGE');scroll();element.querySelectorAll('[data-profile-block-id]').forEach(node=>{observer.unobserve(node);observer.observe(node)})}else{timers.forEach(clearTimeout);timers.clear()}}
  scroll();element.addEventListener('click',click);window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);document.addEventListener('visibilitychange',visible)
  return()=>{alive=false;observer.disconnect();timers.forEach(clearTimeout);element.removeEventListener('click',click);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);document.removeEventListener('visibilitychange',visible)}
 },[root,descriptor,disabled,consented])
}
