'use client'
import { Checkbox } from '@/components/ui/checkbox'
import {useState} from 'react'
import {Field,Select} from '@/components/ui/input'
import {WorkspaceActions,WorkspaceFilters} from '@/components/layout/workspace-controls'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Pagination} from '@/components/ui/pagination'
import {EmptyState} from '@/components/feedback/empty-state'
import type {ImportEntry} from './import-contract'
import type {ProfileContent} from '@/features/profiles/profile-contract'
import styles from './import.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function ImportReviewList({entries,groups,onSelect,onEdit}:{entries:ImportEntry[];groups:ProfileContent['categories'];onSelect:(line:number,value:boolean)=>void;onEdit:(entry:ImportEntry,trigger:HTMLElement)=>void}){
 const [filter,setFilter]=useState(''),[page,setPage]=useState(1),filtered=entries.filter(entry=>!filter||entry.status===filter),pages=Math.max(1,Math.ceil(filtered.length/5)),current=Math.min(page,pages)
 return <div className={styles.page}><WorkspaceFilters label="Filtros da revisão"><Field label="Situação do endereço" hint="Edite os títulos sugeridos e os grupos. A análise de conteúdo acontece ao publicar."><Select value={filter} onChange={event=>{setFilter(event.target.value);setPage(1)}}><option value="">Todos os endereços</option><option value="READY">Prontos para revisar</option><option value="INVALID">Endereços inválidos</option><option value="DUPLICATE">Repetidos</option></Select></Field></WorkspaceFilters>
 <div className={styles.list}>{filtered.slice((current-1)*5,current*5).map(entry=><article className={styles.card} aria-label={'Linha '+entry.line} key={entry.line}><div className={styles.row}><div className={styles.rowInfo}>
  {entry.status==='READY'?<label className={styles.choice}><Checkbox aria-label={'Selecionar linha '+entry.line} checked={entry.selected} onChange={event=>onSelect(entry.line,event.target.checked)}/><strong>{entry.label}</strong></label>:<h2>Linha {entry.line}</h2>}
  {entry.url?<span className={styles.address}>{entry.url}</span>:null}<span className={styles.badge} data-status={entry.status}>{entry.status==='READY'?<ActionIcon name="check"/>:null}{entry.status==='READY'?'Pronto para revisar':entry.status==='INVALID'?'Endereço inválido':'Repetido'}</span>
  {entry.message?<p className={styles.muted}>{entry.message}</p>:<p className={styles.muted}>Linha {entry.line} · {entry.categoryId?groups.find(group=>group.id===entry.categoryId)?.name:entry.newCategoryName}</p>}
 </div>{entry.status==='READY'?<Button variant="secondary" aria-label={'Editar linha '+entry.line} onClick={event=>onEdit(entry,event.currentTarget)}><ActionIcon name="edit"/>Editar</Button>:null}</div><LiquidLens radius={16} /></article>)}</div>
 {!filtered.length?<EmptyState>Nenhum endereço com esse filtro. Escolha outra situação.</EmptyState>:null}
 <WorkspaceActions><Pagination page={current} pages={pages} onPage={setPage}/></WorkspaceActions></div>
}
