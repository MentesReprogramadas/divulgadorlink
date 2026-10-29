'use client'
import {useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {DiscoveryFields} from './discovery-fields'
import {discoveryParams,emptyDiscovery,type DiscoveryValues} from './discovery-contract'
import styles from './discovery.module.css'
const navigationKey='catalogo.discovery.navigation'
export function DiscoveryFilters({initial,onPending}:{initial:DiscoveryValues;onPending?:(pending:boolean)=>void}){
 const [value,setValue]=useState(initial),[reset,setReset]=useState(0),[pending,setPending]=useState(false)
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),form=useRef<HTMLFormElement>(null)
 useEffect(()=>{onPending?.(pending)},[pending,onPending])
 useEffect(()=>{const settled=()=>setPending(false);window.addEventListener('pageshow',settled);return()=>window.removeEventListener('pageshow',settled)},[])
 useEffect(()=>{if(reset)form.current?.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus()},[reset])
 useEffect(()=>{setValue(initial)},[initial.cityId,initial.languageTag,initial.modality])
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 useEffect(()=>{
  let saved:{path?:unknown;control?:unknown;scroll?:unknown}|null
  try{saved=JSON.parse(sessionStorage.getItem(navigationKey)??'null')}catch{try{sessionStorage.removeItem(navigationKey)}catch{/* Browser policy may block storage. */};return}
  if(saved?.path!==location.pathname+location.search||typeof saved.control!=='number'||!Number.isInteger(saved.control)||saved.control<0||saved.control>2){try{sessionStorage.removeItem(navigationKey)}catch{/* Browser policy may block storage. */};return}
  const control=saved.control,scroll=saved.scroll
  const restore=()=>{
   const field=form.current?.querySelectorAll<HTMLElement>('[role="combobox"]')[control]
   if(!field||field.matches(':disabled,[aria-disabled="true"]'))return
   const details=form.current?.closest('details');if(details)details.open=true
   field.focus({preventScroll:true})
   if(typeof scroll==='number'&&Number.isFinite(scroll)&&scroll>=0)window.scrollTo({top:scroll})
   try{sessionStorage.removeItem(navigationKey)}catch{/* Browser policy may block storage. */}
   observer.disconnect()
  }
  const observer=new MutationObserver(restore)
  if(form.current)observer.observe(form.current,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','aria-disabled']})
  restore()
  return()=>observer.disconnect()
 },[])
 function apply(next:DiscoveryValues,control=0){
  const url=new URL(location.href);for(const key of ['cityId','languageTag','modality','cursor'])url.searchParams.delete(key)
  discoveryParams(next).forEach((item,key)=>url.searchParams.set(key,item))
  if(url.pathname+url.search===location.pathname+location.search)return
  const path=url.pathname+url.search
  setPending(true)
  try{sessionStorage.setItem(navigationKey,JSON.stringify({path,control,scroll:window.scrollY}))}catch{/* Navigation still works when browser storage is unavailable. */}
  // A document request avoids the stalled RSC transition observed when filters change.
  window.location.assign(path)
 }
 function change(next:DiscoveryValues){
  if(timer.current)clearTimeout(timer.current)
  setValue(next)
  if(next.languageTag!==value.languageTag||next.modality!==value.modality)apply(next,next.modality!==value.modality?2:1)
  else timer.current=setTimeout(()=>apply(next),350)
 }
 function clear(){if(timer.current)clearTimeout(timer.current);const next=emptyDiscovery();setValue(next);setReset(current=>current+1);apply(next)}
 const active=Object.values(value).some(Boolean)
 return <form ref={form} className={styles.filtersForm} aria-label="Filtrar catálogo" aria-busy={pending} onSubmit={event=>{event.preventDefault();if(timer.current)clearTimeout(timer.current);apply(value)}}>
  <DiscoveryFields key={reset} value={value} onChange={change} mode="filters"/>
  {active?<Button type="button" className={styles.clearFilters} variant="ghost" onClick={clear}><ActionIcon name="resetFilters"/>Limpar filtros</Button>:null}
  <span className={styles.filterStatus} role="status">{pending?'Atualizando links…':''}</span>
 </form>
}
