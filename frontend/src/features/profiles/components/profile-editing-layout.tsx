'use client'
import {useId,useState,type ReactNode} from 'react'
import {ActionIcon} from '@/components/ui/action-icon'
import {LiquidLens} from '@/components/ui/liquid-lens'
import type {ProfilePresentation} from '../profile-contract'
import {ProfileDevicePreview} from './profile-device-preview'
import styles from './profile-editing-layout.module.css'

export function ProfileEditingLayout({children,content,showPreview=true,notice}:{children:ReactNode;content:ProfilePresentation;showPreview?:boolean;notice?:ReactNode}){
 const [expanded,setExpanded]=useState(false),id=useId()
 if(!showPreview)return <>{children}</>
 return <div className={styles.layout}><div className={styles.controls}>{children}</div><aside className={styles.preview} aria-label="Prévia ao vivo da página" data-expanded={expanded}><div className={styles.heading}><strong><ActionIcon name="preview"/>Prévia ao vivo</strong><span>Formato iPhone · rascunho</span></div><button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}><ActionIcon name="preview"/>{expanded?'Recolher prévia':'Ver prévia ao vivo'}<ActionIcon name={expanded?'up':'down'}/></button>{notice}<div id={id} className={styles.viewport}><ProfileDevicePreview content={content} frame="iphone"/></div><LiquidLens radius={16}/></aside></div>
}
