'use client'
import {cloneElement,useState,type ReactElement} from 'react'
import {Tabs} from '@/components/ui/tabs'
import {AdminContentReviewQueue} from './admin-review-queue'
import {LinkMediaQueue} from '@/features/link-media/link-media-queue'
export function ModerationWorkspace({links,linkId,initialTab='links'}:{links:ReactElement<{actionsTarget?:HTMLElement|null}>;linkId?:string;initialTab?:'links'|'attachments'}){
 const [tab,setTab]=useState<string>(initialTab),[actionsTarget,setActionsTarget]=useState<HTMLDivElement|null>(null)
 return <Tabs label="Tipo de publicação" value={tab} onChange={setTab} actions={<div ref={setActionsTarget}/>} items={[
  {id:'links',label:'Links',icon:'link',content:cloneElement(links,{actionsTarget})},
  {id:'attachments',label:'Anexos',icon:'image',content:<LinkMediaQueue linkId={linkId} actionsTarget={actionsTarget}/>},
  {id:'profiles',label:'Minha página',icon:'pageSummary',content:<AdminContentReviewQueue kind="PROFILE" actionsTarget={actionsTarget}/>},
  {id:'redirects',label:'Links permanentes',icon:'permanentLink',content:<AdminContentReviewQueue kind="REDIRECT" actionsTarget={actionsTarget}/>},
 ]}/>
}
