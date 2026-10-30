import { describe, expect, it, vi } from 'vitest'
import { AffiliateEvolution } from './evolution'

describe('Evolution membership baseline transport',()=>{
  it('requests the official read-only endpoint and returns only canonical identity',async()=>{
    const transport=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({participants:[{id:'123@lid',phoneNumber:'5511999999999',name:'private'}]})))
    const evolution=new AffiliateEvolution({baseUrl:'https://evolution.example.test',instance:'Natal 01',apiKey:'fixture'},transport)
    expect(await evolution.participants('123@g.us')).toEqual(['123@lid'])
    expect(String(transport.mock.calls[0]![0])).toBe('https://evolution.example.test/group/participants/Natal%2001?groupJid=123%40g.us')
    expect(transport.mock.calls[0]![1]?.method).toBe('GET')
  })
  it('fails closed when the snapshot is missing participants or has malformed identities',async()=>{
    for(const value of [{},{participants:[{id:'raw-phone'}]},{participants:null}]) {
      const evolution=new AffiliateEvolution({baseUrl:'https://evolution.example.test',instance:'one',apiKey:'fixture'},async()=>new Response(JSON.stringify(value)))
      await expect(evolution.participants('123@g.us')).rejects.toMatchObject({status:503})
    }
  })
})
