import {promises as dns} from 'node:dns'
import {safeFetch,defaultPinnedConnect,type SafeFetchDeps} from './safe-fetch'
export type OwnershipFetch=(url:string)=>Promise<string|null>
export async function fetchOwnershipFile(url:string,deps?:SafeFetchDeps){
 const stub=process.env.E2E_AVAILABILITY_STUB_URL
 if(process.env.NODE_ENV==='dev'&&stub&&new URL(url).hostname==='example.com'){
  const target=new URL(stub)
  if(target.protocol==='http:'&&['127.0.0.1','localhost'].includes(target.hostname)){const response=await fetch(new URL('/ownership-file',target),{signal:AbortSignal.timeout(5000)});return response.ok?response.text():null}
 }
 const transport=deps??{resolve:async hostname=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  try{return (await Promise.race([dns.lookup(hostname,{all:true}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('dns timeout')),5000)})])).map(row=>row.address)}finally{clearTimeout(timer)}
 },connect:defaultPinnedConnect}
 const response=await safeFetch(url,{...transport,connect:async target=>{const response=await transport.connect(target);if(response.status>=300&&response.status<400)throw new Error('Redirecionamento não permitido na comprovação');return response}})
 if(response.status!==200)return null
 const text=await response.text();return text.length<=4096?text:null
}

import {resolveTxt} from 'node:dns/promises'
export type OwnershipResolve=(name:string)=>Promise<string[]>
export async function resolveOwnershipTxt(name:string,resolver:typeof resolveTxt=resolveTxt):Promise<string[]>{
 const stub=process.env.E2E_AVAILABILITY_STUB_URL
 if(process.env.NODE_ENV==='dev'&&stub&&name==='_temlinkaqui-verification.example.com'){
  const target=new URL(stub)
  if(target.protocol==='http:'&&['127.0.0.1','localhost'].includes(target.hostname)){
   const response=await fetch(new URL('/ownership-file',target),{signal:AbortSignal.timeout(5000)})
   return response.ok?[await response.text()]:[]
  }
 }
 let timer:ReturnType<typeof setTimeout>|undefined
 try{
  const records=await Promise.race([resolver(name),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('DNS timeout')),5000)})])
  return records.map(parts=>parts.join(''))
 }catch(reason){
  if(reason instanceof Error&&'code' in reason&&['ENODATA','ENOTFOUND'].includes(String(reason.code)))return []
  throw reason
 }finally{clearTimeout(timer)}
}
