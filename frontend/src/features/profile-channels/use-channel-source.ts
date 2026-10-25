'use client'
import {useRef} from 'react'
import {profileRequest,profileScope} from '@/features/profiles/profile-api'
import {redirectRequest} from '@/features/redirects/redirect-api'
import type {ChannelSource} from './channel-contract'

/** Retries reuse the same F12 request, even if binding the source later fails. */
export function useChannelSource(resourceId?:string){
 const target=useRef(resourceId)
 const attempt=useRef<{fields:string;key:string;revisionId?:string}|null>(null)
 async function create(label:string,destinationUrl:string,requiresAge:boolean){
  if(target.current)throw new Error('Peça ao proprietário para criar ou atualizar o link permanente. Você pode selecionar um link permanente aprovado ou adicionar um link à página.')
  const fields=JSON.stringify({label,destinationUrl,requiresAge})
  if(attempt.current?.fields!==fields)attempt.current={fields,key:crypto.randomUUID()}
  const current=attempt.current!
  if(!current.revisionId){
   const result=await redirectRequest<{destinationRevision:{id:string}}>('',{method:'POST',body:JSON.stringify({label,destinationUrl,requiresAge,expectedRevision:0,requestKey:current.key})})
   current.revisionId=result.destinationRevision.id
  }
  return read(current.revisionId)
 }
 async function read(id:string){return target.current?profileRequest<ChannelSource>('/channel-destinations/'+encodeURIComponent(id),profileScope(undefined,target.current)):profileRequest<ChannelSource>('/channel-destinations/'+encodeURIComponent(id))}
 return{create,read}
}
