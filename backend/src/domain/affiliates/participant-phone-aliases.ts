import { z } from 'zod'
import { conversionParticipantPhone } from './conversions'

export type ParticipantPhoneAlias={id:string;phoneNumber:string}
const alias=z.object({id:z.string().regex(/^\d+@lid$/),phoneNumber:z.string().regex(/^\d+@s\.whatsapp\.net$/)})
export function parseParticipantPhoneAliases(value:unknown):ParticipantPhoneAlias[]|null {
  const envelope=z.object({participants:z.array(z.unknown()).max(10000)}).safeParse(value)
  if(!envelope.success)return null
  const candidates=envelope.data.participants.flatMap(row=>{const parsed=alias.safeParse(row);return parsed.success&&conversionParticipantPhone(parsed.data.phoneNumber)?[parsed.data]:[]})
  const phonesById=new Map<string,Set<string>>(),idsByPhone=new Map<string,Set<string>>()
  for(const row of candidates) {
    const phone=conversionParticipantPhone(row.phoneNumber)!
    phonesById.set(row.id,(phonesById.get(row.id)??new Set()).add(row.phoneNumber))
    idsByPhone.set(phone,(idsByPhone.get(phone)??new Set()).add(row.id))
  }
  return [...phonesById].flatMap(([id,phones])=>{
    const phoneNumber=[...phones][0]
    return phones.size===1&&idsByPhone.get(conversionParticipantPhone(phoneNumber)!)?.size===1?[{id,phoneNumber}]:[]
  })
}

// Keep only validated aliases in bounded process memory; never cache participant names or payloads.
export function createParticipantAliasCache(now:()=>number=Date.now) {
  const cache=new Map<string,{expiresAt:number;value:Promise<ParticipantPhoneAlias[]>}>()
  return async(scope:string,load:()=>Promise<ParticipantPhoneAlias[]>)=>{
    const at=now()
    for(const [key,row] of cache)if(row.expiresAt<=at)cache.delete(key)
    const existing=cache.get(scope)
    if(existing)return existing.value
    if(cache.size>=32)cache.delete(cache.keys().next().value!)
    const forget=()=>{if(cache.get(scope)?.value===value)cache.delete(scope)}
    const value=load().catch(error=>{forget();throw error})
    cache.set(scope,{expiresAt:at+5000,value})
    const expiry=setTimeout(forget,5000)
    expiry.unref()
    return value
  }
}
