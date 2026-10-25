'use client'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import {Field,TextArea} from '@/components/ui/input'
import {WorkspaceActions} from '@/components/layout/workspace-controls'
import styles from './import.module.css'
import { LiquidLens } from '@/components/ui/liquid-lens'
export function ImportPaste({value='',onChange,onReview,pending=false,loading=false}:{value?:string;onChange?:(value:string)=>void;onReview?:()=>void;pending?:boolean;loading?:boolean}){
 return <form className={styles.page+' '+(loading?styles.loading:'')} onSubmit={event=>{event.preventDefault();onReview?.()}}>
  <div className={styles.card}><Field label="Endereços dos links" hint="Até 50 links HTTPS, um por linha." icon={<ActionIcon name="link"/>}><TextArea required rows={7} maxLength={105000} className={styles.paste} value={value} onChange={event=>onChange?.(event.target.value)} disabled={pending||loading} placeholder="https://seusite.com/conteudo"/></Field><p className={styles.muted}>Os links entram na sua página. Para o catálogo, use Criar link.</p><LiquidLens radius={16} /></div>
  <WorkspaceActions><Button type="submit" loading={pending} disabled={loading}><ActionIcon name="reviews"/>Revisar links</Button></WorkspaceActions>
 </form>
}
