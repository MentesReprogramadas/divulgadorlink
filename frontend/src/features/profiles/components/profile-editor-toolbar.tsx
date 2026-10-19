'use client'

import { useEffect, useRef, useState, type Ref } from 'react'
import { TabNavigation } from '@/components/ui/tabs'
import { Button, ButtonLink } from '@/components/ui/button'
import { ActionIcon } from '@/components/ui/action-icon'
import { RefreshButton } from '@/components/layout/workspace-actions'
import { profileEditorActions } from '../profile-editor-actions'
import { profileEditorSections, type ProfileEditorSection } from '../profile-editor-section'
import styles from './profile-editor-toolbar.module.css'

export type ProfileTool = typeof profileEditorActions[number]['id']
type ProfileEditorToolbarProps = {
 section: ProfileEditorSection; onSection: (section: ProfileEditorSection) => void
 pending: boolean; canSave: boolean; publicPath?: string
 onAction: (action: ProfileTool) => void; onReload: () => void; onUnpublish: () => void
 skeleton?: boolean; groupPrimaryRef?:Ref<HTMLDivElement>; groupOptionsRef?:Ref<HTMLDivElement>
}
const tools = profileEditorActions.filter(tool => tool.id !== 'preview')

/** Measures the actual controls so only the actions that fit remain beside the tabs. */
export function ProfileEditorToolbar({section,onSection,pending,canSave,publicPath,onAction,onReload,onUnpublish,skeleton=false,groupPrimaryRef,groupOptionsRef}:ProfileEditorToolbarProps) {
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
 const disabled=(tool:typeof tools[number])=>pending||(tool.requiresDraft&&!canSave)
 function run(action:ProfileTool){if(menu.current)menu.current.open=false;onAction(action)}
 return <div ref={root} className={styles.toolbar} aria-label="Navegação e ações da minha página">
  <div data-editor-tabs className={styles.tabs}><TabNavigation value={section} onChange={onSection} label="Seções da minha página" idPrefix={skeleton?'page-editor-pending':'page-editor'} items={profileEditorSections}/></div>
  <div className={styles.actions}>
   {tools.slice(0,visible).map(tool=><Button key={tool.id} variant={tool.variant} disabled={disabled(tool)} onClick={()=>run(tool.id)}><ActionIcon name={tool.icon}/>{tool.label}</Button>)}
   <div data-fixed-actions className={styles.fixed}>
    {section==='groups'?<div ref={groupPrimaryRef} className={styles.groupPrimary}/>:null}
    <Button variant={section==='groups'?'secondary':'primary'} aria-label="Ver prévia" title="Ver prévia" disabled={pending||!canSave} onClick={()=>run('preview')}><ActionIcon name="preview"/>{section==='groups'?'Prévia':'Ver prévia'}</Button>
    <RefreshButton disabled={pending} onClick={onReload}/>
    <details ref={menu} className={styles.menu} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus()}}}>
     <summary aria-label="Mais opções da página" aria-disabled={skeleton||undefined} onClick={event=>{if(skeleton)event.preventDefault()}}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary>
     <div className={styles.popup}>
      {section==='groups'?<div ref={groupOptionsRef} className={styles.groupOptions}/>:null}
      {tools.slice(visible).map(tool=><Button key={tool.id} variant="ghost" disabled={disabled(tool)} onClick={()=>run(tool.id)}><ActionIcon name={tool.icon}/>{tool.label}</Button>)}
      {publicPath?<div className={styles.publication}><ButtonLink variant="ghost" href={publicPath}><ActionIcon name="external"/>Abrir minha página</ButtonLink><Button variant="danger" disabled={pending} onClick={()=>{if(menu.current)menu.current.open=false;onUnpublish()}}><ActionIcon name="disable"/>Retirar do ar</Button></div>:null}
      {!publicPath&&visible===tools.length?<span className={styles.empty}>Todas as ações estão na barra.</span>:null}
     </div>
    </details>
   </div>
  </div>
  <div ref={measure} className={styles.measure} aria-hidden="true" inert>{tools.map(tool=><Button key={tool.id} variant={tool.variant} tabIndex={-1}><ActionIcon name={tool.icon}/>{tool.label}</Button>)}</div>
 </div>
}
