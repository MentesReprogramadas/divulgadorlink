import { createHash, createHmac } from 'node:crypto'
import { z } from 'zod'

export const conversionConsentVersion='affiliate-lead-qualification-v1'
export const conversionRetentionMs=7*24*60*60*1000
export const conversionConfigKey='AFFILIATE_META_CONVERSIONS'
export const conversionConfig=z.object({enabled:z.boolean(),pixelId:z.string().regex(/^\d+$/),segmentIds:z.array(z.string().min(1)).min(1),allowedOrigins:z.array(z.string().url().refine(value=>{const url=new URL(value);return url.protocol==='https:'&&url.origin===value})).min(1)}).strict()
export const conversionIntentInput=z.object({phone:z.string().max(40),marketingConsent:z.boolean(),fbclid:z.string().max(500).regex(/^[A-Za-z0-9_-]+$/).optional(),fbp:z.string().max(200).regex(/^fb\.1\.\d{13}\.[0-9]+$/).optional(),sourceUrl:z.string().url().max(2048)}).strict()
export function normalizeConversionPhone(raw:string):string|null {
  if(!/^[+\d ().-]+$/.test(raw))return null
  let digits=raw.replace(/\D/g,'')
  if(digits.length===10||digits.length===11)digits='55'+digits
  return /^55[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(digits)?digits:null
}
export function conversionParticipantPhone(identity:string) {
  const match=/^(\d+)@s\.whatsapp\.net$/.exec(identity)
  return match?normalizeConversionPhone(match[1]):null
}
export function conversionPhoneHash(master:string,tenantId:string,segmentId:string,phone:string) {
  if(!/^[A-Za-z0-9+/]{43}=$/.test(master)||Buffer.from(master,'base64').length!==32)throw new Error('Conversion secure configuration unavailable')
  return createHmac('sha256',Buffer.from(master,'base64')).update(JSON.stringify(['affiliate-conversion',tenantId,segmentId,phone])).digest('hex')
}
export const conversionMeta=z.object({phoneSha:z.string().regex(/^[a-f0-9]{64}$/),userAgent:z.string().min(1).max(512),sourceUrl:z.string().url(),pixelId:z.string(),fbp:z.string().optional(),fbc:z.string().optional()}).strict()
export function conversionMetaPayload(meta:z.infer<typeof conversionMeta>,eventId:string,segmentId:string,occurredAt:Date,kind:'INITIAL_LEAD'|'QUALIFIED_GROUP_LEAD'='QUALIFIED_GROUP_LEAD',intentId?:string) {
  const initial=kind==='INITIAL_LEAD'
  return {event_name:initial?'SubmitGroupRegistration':'QualifiedGroupLead',event_id:eventId,event_time:Math.floor(occurredAt.getTime()/1000),action_source:initial?'website':'system_generated',...(initial?{event_source_url:meta.sourceUrl}:{}),user_data:{ph:[meta.phoneSha],...(intentId?{external_id:[createHash('sha256').update(intentId).digest('hex')]}:{}),...(initial?{client_user_agent:meta.userAgent}:{}),...(meta.fbp?{fbp:meta.fbp}:{}),...(meta.fbc?{fbc:meta.fbc}:{})},custom_data:{segment_id:segmentId,...(initial?{}:{event_source:'crm',lead_event_source:'Tem Link Aqui'})}}
}
export function conversionPhoneSha(phone:string) {return createHash('sha256').update(phone).digest('hex')}
