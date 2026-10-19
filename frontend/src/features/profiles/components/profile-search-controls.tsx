'use client'
import {useId,useRef,useState} from 'react'
import {Field,Input,Select} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {OverlayDialog} from '@/components/ui/overlay-dialog'
import type {ProfileContent} from '../profile-contract'
import type {ProfileSearchQuery} from '../profile-search-contract'
import styles from './profile-search.module.css'
export function ProfileSearchControls({query,groups,pending,searching=false,embedded=false,onQuery,onSubmit,onClear}:{query:ProfileSearchQuery;groups:ProfileContent['categories'];pending:boolean;searching?:boolean;embedded?:boolean;onQuery?:(query:ProfileSearchQuery,immediate?:boolean)=>void;onSubmit?:()=>void;onClear?:()=>void}){
 const Root=embedded?'div':'form'
 const [open,setOpen]=useState(false),id=useId(),input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null)
 const shown=groups.filter(group=>group.visible),unknown=query.categoryId&&!shown.some(group=>group.id===query.categoryId)
 return <Root className={styles.controls} role="search" aria-label="Busca nesta página" aria-busy={searching||undefined} onSubmit={event=>{event.preventDefault();onSubmit?.()}}>
  <div className={styles.searchRow}><label htmlFor={id} className={styles.announcement}>Buscar nesta página</label><div className={styles.inputShell}><span className={styles.searchIcon}><ActionIcon name="search"/></span><Input ref={input} id={id} type="search" maxLength={100} value={query.q} disabled={pending} onChange={event=>onQuery?.({...query,q:event.target.value,cursor:null})} placeholder="Buscar links ou grupos"/>{query.q?<button type="button" className={styles.clearText} aria-label="Limpar texto da busca" title="Limpar texto da busca" disabled={pending} onClick={()=>{onQuery?.({...query,q:'',cursor:null},true);input.current?.focus()}}><ActionIcon name="clearSearch"/></button>:null}</div><Button ref={trigger} type="button" variant="secondary" disabled={pending} aria-label={query.categoryId?'Filtros, 1 filtro ativo':'Filtros'} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><ActionIcon name="filter"/>Filtros{query.categoryId?<span className={styles.filterCount} aria-hidden="true">1</span>:null}</Button></div>
  <OverlayDialog open={open} title="Filtros da página" onClose={()=>setOpen(false)} returnFocusTo={trigger.current}><div className={styles.filterDialog}><Field label="Grupo de links" icon={<ActionIcon name="folder"/>}><Select value={query.categoryId??''} disabled={pending} onChange={event=>onQuery?.({...query,categoryId:event.target.value||null,cursor:null},true)}><option value="">Todos os grupos</option>{unknown?<option value={query.categoryId!}>Grupo não encontrado</option>:null}{shown.map(group=><option value={group.id} key={group.id}>{group.name}</option>)}</Select></Field><p className={styles.filterHint}>Os filtros são aplicados automaticamente.</p><div className={styles.filterActions}><Button type="button" variant="secondary" disabled={pending||!(query.q||query.categoryId||query.cursor)} onClick={onClear}><ActionIcon name="resetFilters"/>Limpar filtros</Button><Button type="button" onClick={()=>setOpen(false)}><ActionIcon name="check"/>Concluir</Button></div></div></OverlayDialog>
 </Root>
}
