import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baselineAffiliateMembership, recordAffiliateMembership, purgeAffiliateMembership } from './membership'
import { membershipIdentity, type parseMembershipEvent } from '@/domain/affiliates/membership'

const url=process.env.AFFILIATE_DATABASE_URL
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local AFFILIATE_DATABASE_URL required')
const db=new PrismaClient({datasourceUrl:url}),tenantId=randomUUID(),otherTenant=randomUUID(),key=Buffer.alloc(32,42).toString('base64')
let instanceId:string,secondId:string,groupId:string
const jid='123@g.us'
type Event=NonNullable<ReturnType<typeof parseMembershipEvent>>
const event=(action:'add'|'remove',participant:string,occurredAt=new Date(),instance='one'):Event=>({instance,jid,action,participants:[participant],occurredAt})
beforeAll(async()=>{
  await db.tenant.createMany({data:[{id:tenantId,host:tenantId+'.test',name:'membership'},{id:otherTenant,host:otherTenant+'.test',name:'other'}]})
  instanceId=(await db.affiliateInstance.create({data:{tenantId,name:'one'}})).id
  secondId=(await db.affiliateInstance.create({data:{tenantId,name:'two'}})).id
  const segment=await db.affiliateSegment.create({data:{tenantId,name:'Natal',slug:'natal',instanceLinks:{create:[{instanceId},{instanceId:secondId}]}}})
  groupId=(await db.affiliateGroup.create({data:{tenantId,segmentId:segment.id,instanceId,jid,name:'Natal',sequence:1}})).id
})
afterAll(async()=>{await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await db.$disconnect()})
describe('durable membership accounting',()=>{
  it('excludes baseline, serializes concurrent duplicates across instances, separates rejoin and tenant scope',async()=>{
    const start=new Date('2026-10-29T12:00:00Z')
    await baselineAffiliateMembership(db,tenantId,groupId,key,async()=>['111@lid'],start)
    expect(await db.affiliateMembershipDaily.count({where:{tenantId}})).toBe(0)
    const at=new Date('2026-10-29T13:00:00Z')
    const joined=event('add','222@lid',at)
    await Promise.all([recordAffiliateMembership(db,tenantId,instanceId,joined,key,at),recordAffiliateMembership(db,tenantId,secondId,{...joined,instance:'two'},key,at)])
    const later=new Date(at.getTime()+1000)
    await recordAffiliateMembership(db,tenantId,instanceId,event('remove','222@lid',later),key,later)
    const again=new Date(at.getTime()+2000)
    await recordAffiliateMembership(db,tenantId,instanceId,event('add','222@lid',again),key,again)
    await recordAffiliateMembership(db,tenantId,secondId,{...event('remove','222@lid',later),instance:'two'},key,again)
    const day=await db.affiliateMembershipDaily.findFirstOrThrow({where:{tenantId}})
    expect(day).toMatchObject({joins:1,leaves:1,rejoins:1,staleEvents:1})
    expect(await recordAffiliateMembership(db,otherTenant,instanceId,joined,key,again)).toBe('unrelated')
    expect(await db.affiliateMembershipState.findFirst({where:{tenantId,identityHash:membershipIdentity(key,tenantId,jid,'222@lid')}})).toMatchObject({present:true})
    expect(JSON.stringify(await db.affiliateMembershipState.findMany({where:{tenantId}}))).not.toContain('@lid')
  })
  it('invalid snapshots cannot mark tracking ready; baseline window and expiry are explicit',async()=>{
    const at=new Date('2026-10-30T12:00:00Z')
    await expect(baselineAffiliateMembership(db,tenantId,groupId,key,async()=>['invalid'],at)).rejects.toThrow()
    expect(await db.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId}})).toMatchObject({status:'BASELINING',lastErrorCode:'BASELINE_FAILED'})
    expect(await recordAffiliateMembership(db,tenantId,instanceId,event('add','333@lid',at),key,at)).toBe('baseline_required')
    expect(await db.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId}})).toMatchObject({receivedDuringBaseline:1})
    await baselineAffiliateMembership(db,tenantId,groupId,key,async()=>['111@lid'],at)
    await purgeAffiliateMembership(db,new Date('2027-02-01T12:00:00Z'))
    expect(await db.affiliateMembershipState.count({where:{tenantId}})).toBe(0)
    expect(await db.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId}})).toMatchObject({status:'EXPIRED'})
  })
  it('excludes the initial read window while keeping its received counter durable',async()=>{
    const at=new Date('2027-02-02T12:00:00Z')
    let finish!:(value:unknown)=>void
    const reading=new Promise<unknown>(resolve=>{finish=resolve})
    const baseline=baselineAffiliateMembership(db,tenantId,groupId,key,()=>reading,at)
    await vi.waitFor(async()=>expect(await db.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId}})).toMatchObject({status:'BASELINING'}))
    expect(await recordAffiliateMembership(db,tenantId,instanceId,event('add','444@lid',at),key,at)).toBe('baseline_required')
    finish([{id:'444@lid',phoneNumber:'5511999999999'}]);await baseline
    expect(await db.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId}})).toMatchObject({status:'READY',receivedDuringBaseline:2})
    const later=new Date(at.getTime()+1000)
    await recordAffiliateMembership(db,tenantId,instanceId,event('add','444@lid',later),key,later)
    expect(await db.affiliateMembershipDaily.findFirstOrThrow({where:{tenantId,day:new Date('2027-02-02T00:00:00Z')}})).toMatchObject({joins:0,leaves:0,rejoins:0})
  })
})
