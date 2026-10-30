import { describe, expect, it } from 'vitest'
import { membershipIdentity, membershipWebhookSecret, parseMembershipEvent, membershipTransition } from './membership'

const key=Buffer.alloc(32,42).toString('base64')
const body={event:'group-participants.update',instance:'Natal',date_time:'2026-10-29T15:00:00.000Z',data:{id:'123@g.us',action:'add',participants:['456@lid']}}
describe('membership trust boundary',()=>{
  it('accepts strings and current Baileys contacts without converting LID to phone',()=>{
    expect(parseMembershipEvent(body)?.participants).toEqual(['456@lid'])
    expect(parseMembershipEvent({...body,data:{...body.data,participants:[{id:'456@lid',phoneNumber:'5511999999999@s.whatsapp.net'}]}})?.participants).toEqual(['456@lid'])
    expect(membershipIdentity(key,'tenant','123@g.us','456@lid')).not.toBe(membershipIdentity(key,'tenant','123@g.us','456@s.whatsapp.net'))
  })
  it('rejects unsupported actions, excessive lists, malformed identities and missing timestamps',()=>{
    for(const data of [{...body.data,action:'promote'},{...body.data,participants:['phone']},{...body.data,participants:Array(2049).fill('456@lid')}]) expect(parseMembershipEvent({...body,data})).toBeNull()
    expect(parseMembershipEvent({...body,date_time:undefined})).toBeNull()
  })
  it('domains secrets and identities by tenant, group, and instance',()=>{
    expect(membershipIdentity(key,'a','123@g.us','456@lid')).not.toBe(membershipIdentity(key,'b','123@g.us','456@lid'))
    expect(membershipWebhookSecret(key,'a','one')).not.toBe(membershipWebhookSecret(key,'a','two'))
    expect(()=>membershipWebhookSecret(undefined,'a','one')).toThrow()
  })
  it('deduplicates adds/removes and rejects late replay; rejoin stays separate',()=>{
    expect(membershipTransition(null,'add',2)).toEqual({present:true,joins:1,leaves:0,rejoins:0})
    expect(membershipTransition({present:true,lastEventAt:2},'add',3)).toBeNull()
    expect(membershipTransition({present:true,lastEventAt:2},'remove',3)).toEqual({present:false,joins:0,leaves:1,rejoins:0})
    expect(membershipTransition({present:false,lastEventAt:3},'add',4)).toEqual({present:true,joins:0,leaves:0,rejoins:1})
    expect(membershipTransition({present:true,lastEventAt:4},'remove',3)).toBeNull()
    expect(membershipTransition(null,'remove',2)).toEqual({present:false,joins:0,leaves:1,rejoins:0})
  })
})
