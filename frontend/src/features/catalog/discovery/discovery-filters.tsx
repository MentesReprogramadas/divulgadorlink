'use client'
import {useEffect,useRef,useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {DiscoveryFields} from './discovery-fields'
import {discoveryParams,emptyDiscovery,type DiscoveryValues} from './discovery-contract'
import styles from './discovery.module.css'
export function DiscoveryFilters({initial,onPending}:{initial:DiscoveryValues;onPending?:(pending:boolean)=>void}){
 const [value,setValue]=useState(initial),[reset,setReset]=useState(0),[pending,startTransition]=useTransition(),router=useRouter()
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),form=useRef<HTMLFormElement>(null)
 useEffect(()=>{onPending?.(pending)},[pending,onPending])
 useEffect(()=>{if(reset)form.current?.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus()},[reset])
 useEffect(()=>{setValue(initial)},[initial.cityId,initial.languageTag,initial.modality])
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 function apply(next:DiscoveryValues){
  const url=new URL(location.href);for(const key of ['cityId','languageTag','modality','cursor'])url.searchParams.delete(key)
  discoveryParams(next).forEach((item,key)=>url.searchParams.set(key,item))
  if(url.pathname+url.search===location.pathname+location.search)return
  startTransition(()=>router.push(url.pathname+url.search,{scroll:false}))
 }
 function change(next:DiscoveryValues){
  if(timer.current)clearTimeout(timer.current)
  setValue(next)
  if(next.languageTag!==value.languageTag||next.modality!==value.modality)apply(next)
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
