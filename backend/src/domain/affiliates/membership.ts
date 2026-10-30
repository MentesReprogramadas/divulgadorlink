import { createHmac } from 'node:crypto'
import { z } from 'zod'
import { groupJid } from './contracts'

const participant=z.string().max(100).regex(/^\d+(?::\d+)?@(lid|s\.whatsapp\.net)$/)
export const membershipParticipant=z.union([participant,z.object({id:participant})]).transform(row=>typeof row==='string'?row:row.id)
const event=z.object({event:z.literal('group-participants.update'),instance:z.string().min(1).max(200),date_time:z.iso.datetime({offset:true}),data:z.object({id:groupJid,action:z.enum(['add','remove']),participants:z.array(membershipParticipant).min(1).max(2048)})})
export function parseMembershipEvent(body:unknown,clockOffsetMinutes=0) {
  if(!Number.isInteger(clockOffsetMinutes) || Math.abs(clockOffsetMinutes)>840 || clockOffsetMinutes%15!==0) return null
  const parsed=event.safeParse(body)
  if(!parsed.success || (clockOffsetMinutes!==0 && !parsed.data.date_time.endsWith('Z'))) return null
  // Evolution 2.3.7 can label local wall time as Z; only configured authenticated providers receive this correction.
  return {instance:parsed.data.instance,jid:parsed.data.data.id,action:parsed.data.data.action,participants:[...new Set(parsed.data.data.participants)],occurredAt:new Date(Date.parse(parsed.data.date_time)+clockOffsetMinutes*60_000)}
}
function digest(master:string|undefined,parts:string[]) {
  if(!master || !/^[A-Za-z0-9+/]{43}=$/.test(master)||Buffer.from(master,'base64').length!==32) throw new Error('Membership secure configuration unavailable')
  return createHmac('sha256',Buffer.from(master,'base64')).update(JSON.stringify(parts)).digest('hex')
}
export function membershipWebhookSecret(master:string|undefined,tenantId:string,instanceId:string) {return digest(master,['affiliate-membership-webhook',tenantId,instanceId])}
export function membershipIdentity(master:string|undefined,tenantId:string,jid:string,identity:string) {return digest(master,['affiliate-membership-identity',tenantId,jid,identity])}
export function membershipTransition(previous:{present:boolean;lastEventAt:number}|null,action:'add'|'remove',at:number) {
  const present=action==='add'
  if(previous && (at<=previous.lastEventAt || previous.present===present)) return null
  return {present,joins:present&&!previous?1:0,leaves:present?0:1,rejoins:present&&previous?1:0}
}
