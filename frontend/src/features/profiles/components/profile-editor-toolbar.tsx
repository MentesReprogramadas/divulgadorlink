'use client'

import { useEffect, useRef, useState, type Ref } from 'react'
import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { Button, ButtonLink } from '@/components/ui/button'
import {useBillingAccess} from '@/features/profile-billing/billing-access'
import { ActionIcon } from '@/components/ui/action-icon'
import { RefreshButton } from '@/components/layout/workspace-actions'
import {useWorkspaceAccess} from '@/features/workspace-team/workspace-access'
import { profileEditorActions } from '../profile-editor-actions'
import { profileEditorSections, type ProfileEditorSection } from '../profile-editor-section'
import { LiquidLens } from '@/components/ui/liquid-lens'
import buttonStyles from '@/components/ui/button.module.css'
import styles from './profile-editor-toolbar.module.css'

export type ProfileTool = typeof profileEditorActions[number]['id']
type ProfileEditorToolbarProps = {
 section: ProfileEditorSection; onSection: (section: ProfileEditorSection) => void
 pending: boolean; canSave: boolean; publicPath?: string
 onAction: (action: ProfileTool) => void; onReload: () => void; onUnpublish: () => void
 collaborative?:boolean; skeleton?: boolean; groupPrimaryRef?:Ref<HTMLDivElement>; groupOptionsRef?:Ref<HTMLDivElement>
}
const ownerTools = profileEditorActions.filter(tool => tool.id !== 'preview')

/** Measures the actual controls so only the actions that fit remain beside the tabs. */
export function ProfileEditorToolbar({section,onSection,pending,canSave,publicPath,onAction,onReload,onUnpublish,skeleton=false,collaborative=false,groupPrimaryRef,groupOptionsRef}:ProfileEditorToolbarProps) {
 const billing=useBillingAccess(),metricsLocked=Boolean(billing.state&&!billing.state.capabilities.includes('profile.analytics'))
 const access=useWorkspaceAccess(!collaborative&&!skeleton)
 const readonly=Boolean(access.context?.ownerId&&!access.context.grants?.page?.write)
 const tools=collaborative||readonly?[]:ownerTools
 const sections=profileEditorSections.map(item=>item.id==='content'&&billing.state&&!billing.state.capabilities.includes('profile.richBlocks')?{...item,icon:'subscriptionLock' as const}:item).filter(item=>item.id==='content'? !collaborative:item.id==='contact'? !collaborative&&(!access.context?.ownerId||Boolean(access.context.grants?.page?.write&&access.context.grants?.contacts?.read)):item.id==='discovery'?!collaborative&&!readonly:true)
 const root=useRef<HTMLDivElement>(null), measure=useRef<HTMLDivElement>(null), menu=useRef<HTMLDetailsElement>(null)
 const [visible,setVisible]=useState(0)
 useEffect(()=>{
  const element=root.current, ruler=measure.current
  if(!element||!ruler)return
  const update=()=>{
   if(element.clientWidth===0){setVisible(0);return}
   const tabs=element.querySelector<HTMLElement>('[data-editor-tabs]')!, fixed=element.querySelector<HTMLElement>('[data-fixed-actions]')!
   const widths=Array.from(ruler.querySelectorAll('button')).map(button=>button.getBoundingClientRect().width)
   const rowGap=parseFloat(getComputedStyle(element).columnGap)||0
   const actionGap=parseFloat(getComputedStyle(fixed.parentElement!).columnGap)||0
   const stacked=tabs.getBoundingClientRect().width+fixed.getBoundingClientRect().width+rowGap>element.clientWidth
   let available=element.clientWidth-(stacked?0:tabs.getBoundingClientRect().width+rowGap)-fixed.getBoundingClientRect().width, count=0
   for(const width of widths){if(width+actionGap>available)break;available-=width+actionGap;count++}
   setVisible(count)
  }
  update(); void document.fonts?.ready.then(update)
  if(typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(update);observer.observe(element)
  element.querySelectorAll('[data-editor-tabs], [data-fixed-actions]').forEach(child=>observer.observe(child))
  return()=>observer.disconnect()
 },[])
 useEffect(()=>{
  const close=(event:PointerEvent)=>{if(menu.current?.open&&!menu.current.contains(event.target as Node))menu.current.open=false}
  document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)
 },[])
 useEffect(()=>{
  const element=menu.current
  if(!element)return
  const position=()=>{
   if(!element.open)return
   const trigger=element.querySelector('summary'),popup=element.querySelector<HTMLElement>('[data-profile-menu-popup]'),contents=element.querySelector<HTMLElement>('[data-profile-menu-content]')
   if(!trigger||!popup||!contents)return
   const viewport=window.visualViewport,top=viewport?.offsetTop??0,bottom=top+(viewport?.height??window.innerHeight),box=trigger.getBoundingClientRect()
   const below=Math.max(0,bottom-box.bottom-20),above=Math.max(0,box.top-top-20)
   const side=below>=contents.scrollHeight+16||below>=above?'bottom':'top'
   popup.dataset.side=side
   popup.style.setProperty('--profile-menu-height',`${Math.floor(side==='bottom'?below:above)}px`)
   const left=viewport?.offsetLeft??0,right=left+(viewport?.width??window.innerWidth),width=popup.getBoundingClientRect().width
   const aligned=box.right-width,inside=Math.min(Math.max(aligned,left+12),right-width-12)
   popup.style.setProperty('--profile-menu-shift',`${Math.round(inside-aligned)}px`)
  }
  element.addEventListener('toggle',position);window.addEventListener('resize',position);document.addEventListener('scroll',position,true)
  window.visualViewport?.addEventListener('resize',position);window.visualViewport?.addEventListener('scroll',position)
  position()
  return()=>{element.removeEventListener('toggle',position);window.removeEventListener('resize',position);document.removeEventListener('scroll',position,true);window.visualViewport?.removeEventListener('resize',position);window.visualViewport?.removeEventListener('scroll',position)}
 },[visible,publicPath,section,tools.length])
 const disabled=(tool:typeof tools[number])=>pending||(tool.requiresDraft&&!canSave)
 function run(action:ProfileTool){if(menu.current)menu.current.open=false;onAction(action)}
 return <div ref={root} className={styles.toolbar} aria-label="Navegação e ações da minha página">
  <div data-editor-tabs className={styles.tabs}><ResponsiveTabs value={section} onChange={onSection} label="Seções da minha página" idPrefix={skeleton?'page-editor-pending':'page-editor'} items={sections}/></div>
  <div className={styles.actions}>
   {tools.slice(0,visible).map(tool=><Button key={tool.id} variant={tool.variant} disabled={disabled(tool)} onClick={()=>run(tool.id)}><ActionIcon name={tool.id==='metrics'&&metricsLocked?'subscriptionLock':tool.icon}/>{tool.label}</Button>)}
   <div data-fixed-actions className={styles.fixed}>
    {section==='groups'?<div ref={groupPrimaryRef} className={styles.groupPrimary}/>:null}
    {readonly?<ButtonLink href="/painel/perfil/previa"><ActionIcon name="preview"/>Ver prévia</ButtonLink>:<Button variant={section==='groups'?'secondary':'primary'} aria-label="Ver prévia" title="Ver prévia" disabled={pending||!canSave} onClick={()=>run('preview')}><ActionIcon name="preview"/>{section==='groups'?'Prévia':'Ver prévia'}</Button>}
    <RefreshButton disabled={pending} onClick={onReload}/>
    <details ref={menu} className={styles.menu} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus()}}}>
     <summary aria-label="Mais opções da página" aria-disabled={skeleton||undefined} onClick={event=>{if(skeleton)event.preventDefault()}}><LiquidLens radius={12}/><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary>
     <div className={styles.popup} data-profile-menu-popup><LiquidLens radius={12}/><div className={styles.popupContent} data-profile-menu-content role="group" aria-label="Ferramentas da página" tabIndex={0}>
      {section==='groups'?<div ref={groupOptionsRef} className={styles.groupOptions}/>:null}
      {tools.slice(visible).map(tool=><Button key={tool.id} variant="ghost" disabled={disabled(tool)} onClick={()=>run(tool.id)}><ActionIcon name={tool.id==='metrics'&&metricsLocked?'subscriptionLock':tool.icon}/>{tool.label}</Button>)}
      {publicPath?<div className={styles.publication}><ButtonLink variant="ghost" href={publicPath}><ActionIcon name="external"/>Abrir minha página</ButtonLink><Button variant="danger" disabled={pending} onClick={()=>{if(menu.current)menu.current.open=false;onUnpublish()}}><ActionIcon name="disable"/>Retirar do ar</Button></div>:null}
      {!publicPath&&visible===tools.length?<span className={styles.empty}>Todas as ações estão na barra.</span>:null}
     </div></div>
    </details>
   </div>
  </div>
  {/* Same Button geometry, with no optical clients mounted in the invisible ruler. */}
  <div ref={measure} className={styles.measure} aria-hidden="true" inert>{tools.map(tool=><button key={tool.id} type="button" data-variant={tool.variant} className={`button button-${tool.variant} ${buttonStyles.root}`} tabIndex={-1}><span className={buttonStyles.content}><ActionIcon name={tool.id==='metrics'&&metricsLocked?'subscriptionLock':tool.icon}/>{tool.label}</span></button>)}</div>
 </div>
}
