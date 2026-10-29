import { expect, it, vi } from 'vitest'
import { createAffiliateInviteReadCache } from './invite-read-cache'
import { AffiliateEvolution } from './evolution'

function redis(){const values=new Map<string,string>();return {status:'ready',get:vi.fn(async(key:string)=>values.get(key)??null),set:vi.fn(async(key:string,value:string,_expiry:'EX',_ttl:number)=>{values.set(key,value);return 'OK' as const})}}

it('isola tenants e versões da conexão, limita validade e não coloca segredos nas chaves',async()=>{
  const connection=redis(),first=createAffiliateInviteReadCache('tenant-a/instance/v1/secret-a',connection),other=createAffiliateInviteReadCache('tenant-b/instance/v1/secret-a',connection),changed=createAffiliateInviteReadCache('tenant-a/instance/v2/secret-a',connection)
  await first.set('invite:123@g.us','https://chat.whatsapp.com/AbCdEf0123456789AbCdEf',30)
  expect(await first.get('invite:123@g.us')).toContain('chat.whatsapp.com')
  expect(await other.get('invite:123@g.us')).toBeNull();expect(await changed.get('invite:123@g.us')).toBeNull()
  expect(connection.set.mock.calls[0].slice(2)).toEqual(['EX',30])
  expect(connection.set.mock.calls[0][0]).not.toMatch(/secret-a|123@g.us|tenant-a/)
})

it('falha ou reconexão do Redis não espera fila offline nem impede consulta ao provedor',async()=>{
  const connection=redis(),cache=createAffiliateInviteReadCache('scope',connection)
  connection.status='reconnecting';expect(await cache.get('open')).toBeNull();await cache.set('open','1',5);expect(connection.get).not.toHaveBeenCalled();expect(connection.set).not.toHaveBeenCalled()
  connection.status='ready';connection.get.mockRejectedValue(new Error('offline'));connection.set.mockRejectedValue(new Error('offline'))
  expect(await cache.get('open')).toBeNull();await expect(cache.set('open','1',5)).resolves.toBeUndefined()
})

it('cache quente elimina leituras repetidas de sessão e convite, mas sempre consulta ocupação ao vivo',async()=>{
  const connection=redis(),cache=createAffiliateInviteReadCache('scope',connection)
  let size=3
  const transport=vi.fn<typeof fetch>(async url=>{
    const path=new URL(String(url)).pathname
    if(path.includes('connectionState'))return Response.json({instance:{state:'open'}})
    if(path.includes('inviteCode'))return Response.json({inviteCode:'AbCdEf0123456789AbCdEf'})
    return Response.json({id:'123@g.us',subject:'Natal',size})
  })
  const port=new AffiliateEvolution({baseUrl:'https://provider.test',apiKey:'private-key',instance:'Natal'},transport,cache)
  for(let i=0;i<2;i++){expect((await port.status()).state).toBe('open');expect((await port.group('123@g.us')).participantCount).toBe(size);expect(await port.invite('123@g.us')).toContain('chat.whatsapp.com');size=1024}
  expect(transport.mock.calls.filter(([url])=>String(url).includes('findGroupInfos'))).toHaveLength(2)
  expect(transport.mock.calls.filter(([url])=>String(url).includes('connectionState'))).toHaveLength(1)
  expect(transport.mock.calls.filter(([url])=>String(url).includes('inviteCode'))).toHaveLength(1)
  expect(connection.set.mock.calls.map(call=>call[3])).toEqual([5,30])
})

it('não usa destino adulterado do cache e não armazena falha ou sessão fechada',async()=>{
  const connection=redis(),cache=createAffiliateInviteReadCache('scope',connection)
  await cache.set('invite:123@g.us','https://evil.test/link',30);connection.set.mockClear()
  const transport=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({inviteCode:'AbCdEf0123456789AbCdEf'})).mockResolvedValueOnce(Response.json({instance:{state:'close'}})).mockResolvedValueOnce(Response.json({error:true}))
  const port=new AffiliateEvolution({baseUrl:'https://provider.test',apiKey:'key',instance:'Natal'},transport,cache)
  expect(await port.invite('123@g.us')).toBe('https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
  expect((await port.status()).state).toBe('close')
  await expect(port.invite('456@g.us')).rejects.toThrow()
  expect(connection.set).toHaveBeenCalledTimes(1)
})

it('provisionamento exige sessão viva mesmo com open ainda no cache',async()=>{
  const connection=redis(),cache=createAffiliateInviteReadCache('scope',connection)
  await cache.set('open','1',5)
  const transport=vi.fn<typeof fetch>().mockResolvedValue(Response.json({instance:{state:'close'}}))
  const port=new AffiliateEvolution({baseUrl:'https://provider.test',apiKey:'key',instance:'Natal'},transport,cache)
  expect((await port.status()).state).toBe('open');expect(transport).not.toHaveBeenCalled()
  expect((await port.status({fresh:true})).state).toBe('close');expect(transport).toHaveBeenCalledOnce()
})
