import { describe,it,expect } from 'vitest'
import { conversionParticipantPhone,conversionPhoneHash,normalizeConversionPhone,conversionMetaPayload,conversionIntentInput } from './conversions'
describe('conversion identity boundary',()=>{
 it('normalizes Brazilian numbers without treating LIDs or malformed identities as phone numbers',()=>{
  expect(normalizeConversionPhone('(11) 99999-1234')).toBe('5511999991234')
  expect(normalizeConversionPhone('+55 11 3333-1234')).toBe('551133331234')
  expect(normalizeConversionPhone('5511999991234<script>')).toBeNull()
  expect(conversionParticipantPhone('5511999991234@lid')).toBeNull()
  expect(conversionParticipantPhone('5511999991234:1@s.whatsapp.net')).toBeNull()
  expect(conversionParticipantPhone('5511999991234@s.whatsapp.net')).toBe('5511999991234')
 })
 it('isolates identities by tenant and segment and uses a qualified CRM stage without raw phone',()=>{
  const key=Buffer.alloc(32,42).toString('base64'),hash=conversionPhoneHash(key,'one','segment','5511999991234')
  expect(hash).not.toBe(conversionPhoneHash(key,'two','segment','5511999991234'))
  expect(hash).not.toBe(conversionPhoneHash(key,'one','other','5511999991234'))
  const payload=conversionMetaPayload({phoneSha:hash,userAgent:'test',sourceUrl:'https://example.test',pixelId:'123'},'stable-id','segment',new Date('2026-10-30T12:00:00Z'))
  expect(payload).toMatchObject({action_source:'system_generated',event_name:'QualifiedGroupLead',event_id:'stable-id',custom_data:{segment_id:'segment',event_source:'crm',lead_event_source:'Tem Link Aqui'}})
  expect(JSON.stringify(payload)).not.toContain('5511999991234')
  expect(payload.user_data).not.toHaveProperty('fbc')
  expect(payload.user_data).not.toHaveProperty('client_user_agent')
  expect(payload).not.toHaveProperty('event_source_url')
  const initial=conversionMetaPayload({phoneSha:hash,userAgent:'real-lp-agent',sourceUrl:'https://example.test/ofertas/participar/pets',pixelId:'123'},'initial-id','segment',new Date(),'INITIAL_LEAD')
  expect(initial).toMatchObject({event_name:'Lead',action_source:'website',event_source_url:'https://example.test/ofertas/participar/pets',user_data:{client_user_agent:'real-lp-agent'}})
 })
 it('does not accept manufactured fbc or consent values',()=>{
  const input={phone:'',marketingConsent:false,sourceUrl:'https://example.test'}
  expect(conversionIntentInput.safeParse(input).success).toBe(true)
  expect(conversionIntentInput.safeParse({...input,fbc:'fabricated'}).success).toBe(false)
  expect(conversionIntentInput.safeParse({...input,marketingConsent:'true'}).success).toBe(false)
 })
})
