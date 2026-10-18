'use client'
import {useEffect,useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import {DiscoveryFields} from './discovery-fields'
import {discoveryParams,emptyDiscovery,type DiscoveryValues} from './discovery-contract'
import styles from './discovery.module.css'
export function DiscoveryFilters({initial,onPending}:{initial:DiscoveryValues;onPending?:(pending:boolean)=>void}){
 const [value,setValue]=useState(initial),[pending,startTransition]=useTransition(),router=useRouter()
 useEffect(()=>{onPending?.(pending)},[pending,onPending])
 useEffect(()=>{setValue(initial)},[initial])
 function apply(next:DiscoveryValues){
  const url=new URL(location.href);for(const key of ['cityId','languageTag','modality','cursor'])url.searchParams.delete(key)
  discoveryParams(next).forEach((item,key)=>url.searchParams.set(key,item))
  if(url.pathname+url.search===location.pathname+location.search)return
  startTransition(()=>router.push(url.pathname+url.search))
 }
 const active=Object.values(value).some(Boolean)
 return <form className={`${styles.form} ${styles.filtersForm}`} aria-label="Filtrar catálogo" onSubmit={event=>{event.preventDefault();apply(value)}}>
  <WorkspaceActions>{active?<Button type="button" variant="secondary" disabled={pending} onClick={()=>{const next=emptyDiscovery();setValue(next);apply(next)}}><ActionIcon name="resetFilters"/>Limpar filtros</Button>:null}<Button type="submit" loading={pending}><ActionIcon name="filter"/>Aplicar filtros</Button></WorkspaceActions>
  <DiscoveryFields value={value} onChange={setValue} disabled={pending} mode="filters"/>
 </form>
}
