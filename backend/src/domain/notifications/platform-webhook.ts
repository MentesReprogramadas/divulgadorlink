import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { assertPublicHttps } from '@/domain/links/public-address'
export const webhookTypes = ['contact.received','link.approved','campaign.ended'] as const
export const webhookEndpointInput=z.object({url:z.string().url().max(2048).superRefine((url,ctx)=>{try{assertPublicHttps(url)}catch{ctx.addIssue({code:'custom',message:'Use um endereço HTTPS público, sem credenciais e na porta padrão.'})}}),eventTypes:z.array(z.enum(webhookTypes)).min(1).max(3).refine(types=>new Set(types).size===types.length),enabled:z.boolean()}).strict()
export function webhookSignature(secret:string,timestamp:string,body:string){return createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')}
export function verifyWebhook(secret:string,timestamp:string,body:string,signatures:string,now=new Date()){
 if(!/^\d{10}$/.test(timestamp)||Math.abs(now.getTime()/1000-Number(timestamp))>300)return false
 const expected=Buffer.from(webhookSignature(secret,timestamp,body),'hex')
 return signatures.split(',').some(part=>{const match=/^v1=([a-f0-9]{64})$/.exec(part.trim());return Boolean(match&&timingSafeEqual(expected,Buffer.from(match[1],'hex')))})
}
export function webhookBackoff(attempt:number){return [0,15000,60000,300000,900000][Math.min(4,Math.max(0,(attempt-1)%5))]}
