import {describe,it,expect,vi} from 'vitest'
import {parseParticipantPhoneAliases,createParticipantAliasCache} from './participant-phone-aliases'
describe('trusted participant aliases',()=>{
 it('accepts explicit canonical PN only, strips extra fields and deduplicates identical mappings',()=>{
  const pair={id:'123@lid',phoneNumber:'5511999991234@s.whatsapp.net'}
  expect(parseParticipantPhoneAliases({participants:[{...pair,name:'private name'},pair,{id:'5511999991234@s.whatsapp.net',phoneNumber:'123@lid'},{id:'456@lid',phoneNumber:'456'},{id:'789@lid',phoneNumber:'5511999991234@lid'}]})).toEqual([pair])
  expect(parseParticipantPhoneAliases({unknown:[]})).toBeNull()
 })
 it('drops both sides of ambiguous mappings instead of guessing from LID digits',()=>{
  expect(parseParticipantPhoneAliases({participants:[{id:'123@lid',phoneNumber:'5511999991234@s.whatsapp.net'},{id:'123@lid',phoneNumber:'5511999995678@s.whatsapp.net'}]})).toEqual([])
  expect(parseParticipantPhoneAliases({participants:[{id:'123@lid',phoneNumber:'5511999991234@s.whatsapp.net'},{id:'456@lid',phoneNumber:'5511999991234@s.whatsapp.net'}]})).toEqual([])
 })
 it('coalesces concurrent reads, expires after five seconds, isolates scopes and never caches failures',async()=>{
  let at=1000;const cache=createParticipantAliasCache(()=>at),load=vi.fn().mockResolvedValue([{id:'123@lid',phoneNumber:'5511999991234@s.whatsapp.net'}])
  await Promise.all([cache('tenant1:group',load),cache('tenant1:group',load)]);expect(load).toHaveBeenCalledTimes(1)
  await cache('tenant2:group',load);expect(load).toHaveBeenCalledTimes(2)
  at+=5001;await cache('tenant1:group',load);expect(load).toHaveBeenCalledTimes(3)
  load.mockRejectedValueOnce(new Error('private upstream failure'))
  await expect(cache('failed',load)).rejects.toThrow()
  await cache('failed',load);expect(load).toHaveBeenCalledTimes(5)
 })
})
