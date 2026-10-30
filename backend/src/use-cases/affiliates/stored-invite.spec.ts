import type { PrismaClient } from '@prisma/client'
import { expect, it, vi } from 'vitest'
import { joinAffiliateSegment } from './invitations'
import { resolveAffiliateInviteDestination } from './invite-destination'

const url='https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'
function fixture() {
  const instance={id:'instance',enabled:false}
  const group={id:'group',tenantId:'tenant',updatedAt:new Date(0),jid:'123@g.us',capacity:10,participantCount:3,inviteUrl:url,instance}
  const segment={id:'segment',tenantId:'tenant',enabled:true,joinMode:'REDIRECT',capacity:10,updatedAt:new Date(0),instance,instanceLinks:[],groups:[group],autoExpand:false}
  const db={affiliateSegment:{findFirst:vi.fn().mockResolvedValue(segment)},affiliateGroup:{count:vi.fn().mockResolvedValue(1)}}
  const factory=vi.fn(()=>{throw new Error('provider offline')})
  return {db,segment,group,factory}
}
for(const mode of ['GET','POST'] as const) {
  const run=(f:ReturnType<typeof fixture>)=>mode==='GET'
    ?resolveAffiliateInviteDestination(f.db as unknown as PrismaClient,'tenant','natal',f.factory)
    :joinAffiliateSegment(f.db as unknown as PrismaClient,'tenant','natal',f.factory)
  it(`${mode}: usa convite salvo sem depender da instância ou chamar o provedor`,async()=>{
    const f=fixture()
    expect(await run(f)).toEqual({url})
    expect(f.factory).not.toHaveBeenCalled()
    expect(f.db.affiliateGroup.count).toHaveBeenCalledWith({where:{id:'group',tenantId:'tenant',enabled:true,updatedAt:f.group.updatedAt,segment:{enabled:true,updatedAt:f.segment.updatedAt,...(mode==='GET'?{joinMode:'REDIRECT'}:{})}}})
  })
  it(`${mode}: não libera convite salvo quando o grupo ou tema mudou ou foi pausado`,async()=>{
    const f=fixture();f.db.affiliateGroup.count.mockResolvedValue(0)
    if(mode==='GET')expect(await run(f)).toBeNull()
    else await expect(run(f)).rejects.toMatchObject({status:503})
  })
  it(`${mode}: não usa convite salvo inválido ou grupo com lotação registrada`,async()=>{
    for(const state of ['invalid','full','unknown'] as const) {
      const f=fixture()
      if(state==='invalid')f.group.inviteUrl='https://evil.test/invite'
      if(state==='full')f.group.participantCount=10
      if(state==='unknown')f.group.participantCount=Number.NaN
      if(mode==='GET')expect(await run(f)).toBeNull()
      else await expect(run(f)).rejects.toMatchObject({status:503})
    }
  })
}
