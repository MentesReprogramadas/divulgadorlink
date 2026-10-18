'use client'
import {Field,Input,Select} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import type {ProfileContent} from '../profile-contract'
import type {ProfileSearchQuery} from '../profile-search-contract'
import styles from './profile-search.module.css'
export function ProfileSearchControls({query,groups,pending,onQuery,onSubmit,onClear}:{query:ProfileSearchQuery;groups:ProfileContent['categories'];pending:boolean;onQuery?:(query:ProfileSearchQuery)=>void;onSubmit?:()=>void;onClear?:()=>void}){
 const shown=groups.filter(group=>group.visible),unknown=query.categoryId&&!shown.some(group=>group.id===query.categoryId)
 return <form className={styles.controls} role="search" aria-label="Busca nesta página" onSubmit={event=>{event.preventDefault();onSubmit?.()}}><div className={styles.fields}>
  <Field label="Buscar nesta página" icon={<ActionIcon name="search"/>}><Input type="search" maxLength={100} value={query.q} disabled={pending} onChange={event=>onQuery?.({...query,q:event.target.value,cursor:null})} placeholder="Nome do link ou grupo"/></Field>
  <Field label="Grupo de links" icon={<ActionIcon name="folder"/>}><Select value={query.categoryId??''} disabled={pending} onChange={event=>onQuery?.({...query,categoryId:event.target.value||null,cursor:null})}><option value="">Todos os grupos</option>{unknown?<option value={query.categoryId!}>Grupo não encontrado</option>:null}{shown.map(group=><option value={group.id} key={group.id}>{group.name}</option>)}</Select></Field>
 </div><div className={styles.actions}>{query.q||query.categoryId||query.cursor?<Button type="button" variant="secondary" disabled={pending} onClick={onClear}><ActionIcon name="resetFilters"/>Limpar filtros</Button>:null}<Button type="submit" loading={pending}><ActionIcon name="search"/>Buscar</Button></div></form>
}
