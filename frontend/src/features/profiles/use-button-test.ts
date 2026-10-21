'use client'
import {useEffect,useState,type RefObject} from 'react'
import {api} from '@/lib/api'
import {PROFILE_MEASUREMENT_CHANGED,profileMeasurementConsent} from '@/domain/profile-measurement-consent'
import type {ProfilePresentation} from './profile-contract'
import type {MeasurementDescriptor} from '@/features/profile-interaction/interaction-contract'
type Assignment={id:string;variant:0|1;revisionId:number;blockId:string;label:string}
export function useButtonTest(root:RefObject<HTMLDivElement|null>,slug:string|null,profile:ProfilePresentation&{measurement?:MeasurementDescriptor},disabled:boolean){
 const [assignment,setAssignment]=useState<Assignment|null>(null),[loading,setLoading]=useState(false),[consented,setConsented]=useState(false)
 useEffect(()=>{const update=()=>setConsented(profileMeasurementConsent());update();window.addEventListener(PROFILE_MEASUREMENT_CHANGED,update);return()=>window.removeEventListener(PROFILE_MEASUREMENT_CHANGED,update)},[])
 const descriptor=profile.measurement,eligible=Boolean(slug&&descriptor&&!disabled&&consented&&(!profile.locale||profile.locale===(profile.fallbackLocale??'pt-BR')))
 useEffect(()=>{
  let current=true;setAssignment(null);setLoading(false)
  if(!eligible||navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl)return
  setLoading(true)
  void api<{assignment:Assignment|null}>('/v1/profiles/'+encodeURIComponent(slug!)+'/button-test/assignment',{method:'POST',body:'{}'}).then(response=>{if(current&&response.status===200&&response.body.assignment?.revisionId===descriptor?.revisionId)setAssignment(response.body.assignment)}).catch(()=>{/* A failed assignment uses the original label and is excluded from the test. */}).finally(()=>{if(current)setLoading(false)})
  return()=>{current=false}
 },[eligible,slug,descriptor?.revisionId])
 useEffect(()=>{
  const element=root.current;if(!element||!assignment||!descriptor||!eligible||loading)return
  const button=element.querySelector<HTMLElement>('[data-profile-block-id="'+assignment.blockId+'"]');if(!button)return
  let alive=true,timer:ReturnType<typeof setTimeout>|undefined,exposed=false,clicked=false,exposure=Promise.resolve(false)
  const send=async(kind:'EXPOSURE'|'CLICK')=>{if(!profileMeasurementConsent())return false;try{const result=await api<{counted:boolean}>('/v1/profiles/'+encodeURIComponent(slug!)+'/button-test/events',{method:'POST',keepalive:true,body:JSON.stringify({id:assignment.id,variant:assignment.variant,revisionId:assignment.revisionId,surfaceToken:descriptor.surfaceToken,kind})});return result.status===200}catch{return false}}
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=.5&&document.visibilityState==='visible'&&!exposed&&!timer)timer=setTimeout(()=>{timer=undefined;if(!alive||document.visibilityState!=='visible'||!profileMeasurementConsent())return;exposed=true;exposure=send('EXPOSURE')},1000);else if(!entry.isIntersecting||entry.intersectionRatio<.5){clearTimeout(timer);timer=undefined}}},{threshold:[0,.5,1]});observer.observe(button)
  const click=()=>{if(!exposed||clicked||!profileMeasurementConsent())return;clicked=true;void exposure.then(ok=>{if(ok)void send('CLICK')})}
  const visibility=()=>{clearTimeout(timer);timer=undefined;if(document.visibilityState==='visible'){observer.unobserve(button);observer.observe(button)}}
  button.addEventListener('click',click);document.addEventListener('visibilitychange',visibility)
  return()=>{alive=false;observer.disconnect();clearTimeout(timer);button.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility)}
 },[assignment,descriptor,eligible,root,slug,loading])
 return{assignment:eligible?assignment:null,loading:eligible&&loading}
}
