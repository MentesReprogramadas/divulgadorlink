import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { membershipIdentity, membershipParticipant, membershipTransition, type parseMembershipEvent } from '@/domain/affiliates/membership'
import { AffiliateError } from '@/domain/affiliates/contracts'
import { correlateConversionJoin, type ScopedParticipantAliases } from './conversions'

const retentionMs=90*24*60*60*1000
type MembershipEvent=NonNullable<ReturnType<typeof parseMembershipEvent>>
export async function baselineAffiliateMembership(db:PrismaClient,tenantId:string,groupId:string,master:string|undefined,fetchParticipants:()=>Promise<unknown>,now?:Date) {
  const startedAt=now??new Date()
  // Validate the key before touching tracking or requesting personal data.
  membershipIdentity(master,tenantId,'baseline','validation')
  await db.$transaction(async tx=>{
    const groups=await tx.$queryRaw<{id:string}[]>`SELECT id FROM affiliate_groups WHERE id=${groupId} AND "tenantId"=${tenantId} FOR UPDATE`
    if(!groups.length) throw new AffiliateError(404,'Grupo não encontrado.')
    const existing=await tx.affiliateMembershipTracking.findUnique({where:{groupId}})
    if(existing?.status==='BASELINING' && !existing.lastErrorCode && existing.startedAt.getTime()>startedAt.getTime()-60_000) throw new AffiliateError(409,'Aguarde a leitura inicial em andamento.')
    await tx.affiliateMembershipTracking.upsert({where:{groupId},create:{groupId,tenantId,startedAt},update:{status:'BASELINING',startedAt,lastErrorCode:null,expiresAt:null}})
    await tx.affiliateMembershipState.deleteMany({where:{tenantId,groupId}})
  })
  try {
    const raw=await fetchParticipants()
    const participants=z.array(membershipParticipant).max(10000).parse(raw)
    const completedAt=now??new Date()
    await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "groupId" FROM affiliate_membership_tracking WHERE "groupId"=${groupId} AND "tenantId"=${tenantId} FOR UPDATE`
      const current=await tx.affiliateMembershipTracking.findUniqueOrThrow({where:{groupId}})
      if(current.startedAt.getTime()!==startedAt.getTime()) throw new AffiliateError(409,'A leitura inicial foi substituída.')
      const group=await tx.affiliateGroup.findFirstOrThrow({where:{id:groupId,tenantId},select:{jid:true}})
      await tx.affiliateMembershipState.deleteMany({where:{tenantId,groupId}})
      const hashes=[...new Set(participants.map(identity=>membershipIdentity(master,tenantId,group.jid,identity)))]
      if(hashes.length) await tx.affiliateMembershipState.createMany({data:hashes.map(identityHash=>({tenantId,groupId,identityHash,present:true,lastEventAt:completedAt}))})
      await tx.affiliateMembershipTracking.update({where:{groupId},data:{status:'READY',baselineAt:completedAt,expiresAt:new Date(completedAt.getTime()+retentionMs),lastErrorCode:null}})
    })
    return {ready:true,baselineAt:completedAt.toISOString(),participants:participants.length}
  } catch(error) {
    await db.affiliateMembershipTracking.updateMany({where:{groupId,tenantId,startedAt},data:{lastErrorCode:'BASELINE_FAILED'}})
    // Schema errors contain the rejected input. Never expose them to HTTP logging.
    if(error instanceof AffiliateError) throw error
    throw new AffiliateError(503,'Não foi possível concluir a leitura inicial dos participantes.')
  }
}

export async function recordAffiliateMembership(db:PrismaClient,tenantId:string,instanceId:string,event:MembershipEvent,master:string|undefined,receivedAt=new Date(),aliases?:ScopedParticipantAliases|null) {
  return db.$transaction(async tx=>{
    const group=await tx.affiliateGroup.findFirst({where:{tenantId,jid:event.jid,enabled:true,segment:{enabled:true},OR:[{instanceId},{segment:{instanceId}},{segment:{instanceLinks:{some:{instanceId,tenantId}}}}]}})
    const instance=await tx.affiliateInstance.findFirst({where:{id:instanceId,tenantId,name:event.instance,enabled:true},select:{id:true}})
    if(!group || !instance) return 'unrelated'
    // Policy updates lock segment before groups; correlation must keep the same order even before opt-in.
    await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id=${group.segmentId} AND "tenantId"=${tenantId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM affiliate_groups WHERE id=${group.id} AND "tenantId"=${tenantId} FOR UPDATE`
    const tracking=await tx.affiliateMembershipTracking.upsert({where:{groupId:group.id},create:{tenantId,groupId:group.id,status:'UNCONFIGURED',lastReceivedAt:receivedAt},update:{lastReceivedAt:receivedAt}})
    if(tracking.status!=='READY' || !tracking.expiresAt || tracking.expiresAt<=receivedAt) {
      await tx.affiliateMembershipTracking.update({where:{groupId:group.id},data:{receivedDuringBaseline:{increment:event.participants.length},...(tracking.expiresAt && tracking.expiresAt<=receivedAt?{status:'EXPIRED'}:{})}})
      return 'baseline_required'
    }
    const day=new Date(receivedAt.toISOString().slice(0,10)+'T00:00:00Z')
    let joins=0,leaves=0,rejoins=0,staleEvents=0
    for(const identity of event.participants) {
      const identityHash=membershipIdentity(master,tenantId,event.jid,identity),where={tenantId_groupId_identityHash:{tenantId,groupId:group.id,identityHash}}
      const previous=await tx.affiliateMembershipState.findUnique({where})
      if(previous && previous.lastEventAt.getTime()===event.occurredAt.getTime() && previous.present===(event.action==='add')) continue
      if(event.occurredAt>new Date(receivedAt.getTime()+5*60_000) || event.occurredAt<=tracking.baselineAt! || (previous && event.occurredAt<=previous.lastEventAt)) {staleEvents++;continue}
      const change=membershipTransition(previous?{present:previous.present,lastEventAt:previous.lastEventAt.getTime()}:null,event.action,event.occurredAt.getTime())
      if(!change) {
        if(previous) await tx.affiliateMembershipState.update({where,data:{lastEventAt:event.occurredAt}})
        continue
      }
      joins+=change.joins;leaves+=change.leaves;rejoins+=change.rejoins
      const scopedAliases=aliases?.tenantId===tenantId&&aliases.groupId===group.id&&aliases.segmentId===group.segmentId&&aliases.baselineAt.getTime()===tracking.baselineAt?.getTime()&&Math.abs(aliases.resolvedAt.getTime()-receivedAt.getTime())<=5000?aliases.aliases:[]
      const phoneAlias=scopedAliases.find(row=>row.id===identity)?.phoneNumber
      const knownAlias=phoneAlias?await tx.affiliateMembershipState.findUnique({where:{tenantId_groupId_identityHash:{tenantId,groupId:group.id,identityHash:membershipIdentity(master,tenantId,event.jid,phoneAlias)}}}):null
      if(change.joins&&!knownAlias) await correlateConversionJoin(tx,{tenantId,segmentId:group.segmentId,groupId:group.id,identity,occurredAt:event.occurredAt,receivedAt,master,phoneAlias})
      await tx.affiliateMembershipState.upsert({where,create:{tenantId,groupId:group.id,identityHash,present:change.present,lastEventAt:event.occurredAt},update:{present:change.present,lastEventAt:event.occurredAt}})
    }
    await tx.affiliateMembershipDaily.upsert({where:{tenantId_groupId_day:{tenantId,groupId:group.id,day}},create:{tenantId,groupId:group.id,day,joins,leaves,rejoins,staleEvents},update:{joins:{increment:joins},leaves:{increment:leaves},rejoins:{increment:rejoins},staleEvents:{increment:staleEvents}}})
    return 'accepted'
  },{timeout:20_000})
}

export async function purgeAffiliateMembership(db:PrismaClient,now=new Date()) {
  return db.$transaction(async tx=>{
    const expired=await tx.affiliateMembershipTracking.findMany({where:{expiresAt:{lte:now}},select:{groupId:true,tenantId:true}})
    for(const row of expired) {
      await tx.$queryRaw`SELECT "groupId" FROM affiliate_membership_tracking WHERE "groupId"=${row.groupId} AND "tenantId"=${row.tenantId} FOR UPDATE`
      const current=await tx.affiliateMembershipTracking.findUnique({where:{groupId:row.groupId}})
      if(!current?.expiresAt || current.expiresAt>now) continue
      await tx.affiliateMembershipState.deleteMany({where:row})
      await tx.affiliateMembershipTracking.update({where:{groupId:row.groupId},data:{status:'EXPIRED'}})
    }
    return expired.length
  })
}
