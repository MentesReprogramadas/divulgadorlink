import type { PrismaClient } from '@prisma/client'
import { expect, it, vi } from 'vitest'
import { resolveAffiliateInviteDestination } from './invite-destination'

function fixture() {
  const instance={id:'instance',tenantId:'tenant',enabled:true}
  const segment={id:'segment',tenantId:'tenant',enabled:true,joinMode:'REDIRECT',capacity:10,updatedAt:new Date(0),instance,instanceLinks:[],groups:[{id:'group',jid:'123@g.us',capacity:10,instance}]}
  const db={affiliateSegment:{findFirst:vi.fn().mockResolvedValue(segment)},affiliateGroup:{count:vi.fn().mockResolvedValue(1)},affiliateInstance:{count:vi.fn().mockResolvedValue(1)}}
  const port={status:vi.fn(async()=>({state:'open'})),group:vi.fn(async()=>({jid:'123@g.us',name:'Group',participantCount:3,description:'',imageUrl:null})),invite:vi.fn(async()=> 'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'),create:vi.fn(),groups:vi.fn(),picture:vi.fn(),describe:vi.fn(),send:vi.fn()}
  return {db,segment,port,resolve:()=>resolveAffiliateInviteDestination(db as unknown as PrismaClient,'tenant','natal',()=>port)}
}

it('resolve destino existente somente com ocupação viva e guardas finais, sem atualizar ou provisionar',async()=>{
  const {resolve,db,port}=fixture()
  expect(await resolve()).toEqual({url:'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'})
  expect(db.affiliateSegment.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{tenantId:'tenant',slug:'natal',enabled:true,joinMode:'REDIRECT'}}))
  expect(port.group).toHaveBeenCalledWith('123@g.us')
  expect(port.create).not.toHaveBeenCalled()
})
it('faz leituras independentes em paralelo e só libera após todas validarem',async()=>{
  const {resolve,port}=fixture()
  let release!:(value:{state:string})=>void
  port.status.mockImplementation(()=>new Promise(done=>{release=done}))
  const result=resolve()
  await vi.waitFor(()=>expect(port.group).toHaveBeenCalledOnce())
  expect(port.invite).toHaveBeenCalledOnce()
  release({state:'open'})
  expect(await result).toHaveProperty('url')
})
it('retorna ao fluxo POST para SCREEN, grupo cheio, ocupação desconhecida ou instância fechada',async()=>{
  for(const state of ['screen','full','unknown','closed','disabled','instance-disabled','invalid-url'] as const){
    const {resolve,db,port}=fixture()
    if(state==='screen')db.affiliateSegment.findFirst.mockResolvedValue(null)
    if(state==='full')port.group.mockResolvedValue({jid:'123@g.us',name:'Group',participantCount:10,description:'',imageUrl:null})
    if(state==='unknown')port.group.mockRejectedValue(new Error('unavailable'))
    if(state==='closed')port.status.mockResolvedValue({state:'close'})
    if(state==='disabled')db.affiliateGroup.count.mockResolvedValue(0)
    if(state==='instance-disabled')db.affiliateInstance.count.mockResolvedValue(0)
    if(state==='invalid-url')port.invite.mockResolvedValue('https://evil.test/redirect')
    expect(await resolve()).toBeNull()
    expect(port.create).not.toHaveBeenCalled()
  }
})
