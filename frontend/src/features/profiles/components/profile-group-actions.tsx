'use client'
import {createPortal} from 'react-dom'
import type {MouseEvent} from 'react'
import {Button} from '@/components/ui/button'
import {ActionIcon} from '@/components/ui/action-icon'
import styles from './profile-groups.module.css'
/** Same controls and widths in the group manager and its loading composition. */
export type ProfileGroupActionHosts={primary:HTMLElement|null;secondary:HTMLElement|null}
export function ProfileGroupActions({canChoosePrimary,pending=false,onPrimary,onNewGroup,hosts}:{canChoosePrimary:boolean;pending?:boolean;onPrimary:()=>void;onNewGroup:()=>void;hosts?:ProfileGroupActionHosts}){
 function closeOptions(event:MouseEvent<HTMLButtonElement>){const menu=event.currentTarget.closest('details');if(menu){menu.open=false;menu.querySelector('summary')?.focus()}}
 const primary=<Button type="button" data-new-group aria-label="Adicionar grupo" title="Adicionar grupo" disabled={pending} onClick={onNewGroup}><ActionIcon name="plus"/>Grupo</Button>
 const secondary=<div className={styles.groupOptions} onKeyDown={event=>{if(event.key==='Escape'){const menu=event.currentTarget.closest('details');if(menu){event.preventDefault();menu.open=false;menu.querySelector('summary')?.focus()}}}}><Button type="button" variant="secondary" disabled={pending||!canChoosePrimary} onClick={event=>{closeOptions(event);onPrimary()}}><ActionIcon name="primaryLink"/>Botão principal</Button></div>
 if(hosts)return <>{hosts.primary?createPortal(primary,hosts.primary):null}{hosts.secondary?createPortal(secondary,hosts.secondary):null}</>
 return <header className={styles.sectionHeading}><h2 className={styles.srOnly}>Grupos e links</h2><div className={styles.actions}>{secondary}{primary}</div></header>
}
