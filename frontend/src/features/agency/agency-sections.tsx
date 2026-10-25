'use client'
import {useRouter} from 'next/navigation'
import {Field,Select} from '@/components/ui/input'
import {ActionIcon} from '@/components/ui/action-icon'
import {Skeleton,SkeletonField} from '@/components/feedback/skeleton'
import {selectWorkspace} from '@/features/workspace-team/workspace-access'
import styles from './agency.module.css'
import {LiquidLens} from '@/components/ui/liquid-lens'
const sections=[{id:'clients',label:'Páginas que gerencio',icon:'clientPortfolio',href:'/painel/clientes'},{id:'access',label:'Acessos por página',icon:'agencyAccess',href:'/painel/clientes/acessos'},{id:'transfers',label:'Transferir página',icon:'ownershipTransfer',href:'/painel/clientes/transferencias'}] as const
export function AgencySections({value,onError}:{value:'clients'|'access'|'transfers';onError:(message:string)=>void}){
 const router=useRouter()
 function navigate(id:string){const target=sections.find(row=>row.id===id);if(!target)return;const go=async()=>{if(target.id==='transfers'){await selectWorkspace(null,target.href);return}router.push(target.href)};void go().catch(reason=>onError(reason instanceof Error?reason.message:'Não foi possível abrir a área.'))}
 return <div className={styles.navigation}><nav className={styles.sections} aria-label="Outras páginas">{sections.map(section=><a key={section.id} href={section.href} aria-current={value===section.id?'page':undefined} className={styles.section} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();navigate(section.id)}}><ActionIcon name={section.icon}/>{section.label}<LiquidLens radius={16}/></a>)}</nav><div className={styles.sectionSelect}><Field label="Outras páginas"><Select value={value} onChange={event=>navigate(event.target.value)}>{sections.map(section=><option key={section.id} value={section.id}>{section.label}</option>)}</Select></Field></div></div>
}
export function AgencySectionsSkeleton(){return <div className={styles.navigation}><div className={styles.sections} aria-hidden="true">{sections.map(section=><span className={styles.section} key={section.id}><Skeleton width="80%" height="1.2rem"/><LiquidLens radius={16}/></span>)}</div><div className={styles.sectionSelect}><SkeletonField label="Outras páginas"/></div></div>}
