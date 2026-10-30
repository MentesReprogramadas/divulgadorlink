import { createHash, randomUUID } from 'node:crypto'
import type { AffiliateInstance, PrismaClient } from '@prisma/client'
import { AffiliateProviderError, type AffiliateWhatsApp } from '@/adapters/affiliates/evolution'
import { AffiliateError } from '@/domain/affiliates/contracts'
import { admissionJid, groupPolicyHash, groupPolicyInput, segmentGroupPolicy, type AffiliateGroupPolicy } from '@/domain/affiliates/group-policy'
import { openWebhookSecret, sealWebhookSecret } from '@/lib/webhook-secret'
import { env } from '@/env'
import { affiliateEvolution } from './instances'

type Factory = (instance:AffiliateInstance)=>AffiliateWhatsApp
export async function requireGroupPolicyProvider(port:AffiliateWhatsApp) {
  if(!port.setDisappearingMessages || !port.setJoinApproval || !port.pendingJoinRequests || !port.approveJoinRequest || !port.groupAdmissionCapabilities || !(await port.groupAdmissionCapabilities()).joinApproval)throw new AffiliateError(503,'A política do grupo aguarda a extensão de aprovação da Evolution.')
}
export async function applyGroupPolicy(port:AffiliateWhatsApp,jid:string,policy:AffiliateGroupPolicy) {
  await requireGroupPolicyProvider(port)
  await port.setDisappearingMessages!(jid,policy.disappearingSeconds)
  await port.setJoinApproval!(jid,policy.joinApproval)
}
export async function readAffiliateGroupPolicy(db:PrismaClient,tenantId:string,segmentId:string) {
  const segment=await db.affiliateSegment.findFirst({where:{id:segmentId,tenantId},select:{groupPolicyEnabled:true,groupDisappearingSeconds:true,groupJoinApproval:true,groupAutoApproveDelaySeconds:true}})
  if(!segment)throw new AffiliateError(404,'Segmentação não encontrada.')
  const groups=await db.affiliateGroup.findMany({where:{tenantId,segmentId},select:{id:true,name:true,groupPolicyState:true,groupPolicyErrorCode:true,groupPolicyNextRunAt:true}})
  return {enabled:segment.groupPolicyEnabled,disappearingSeconds:segment.groupDisappearingSeconds,joinApproval:segment.groupJoinApproval,autoApproveDelaySeconds:segment.groupAutoApproveDelaySeconds,groups}
}
export async function saveAffiliateGroupPolicy(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,input:AffiliateGroupPolicy) {
  const policy=groupPolicyInput.parse(input)
  return db.$transaction(async tx=>{
    const changed=await tx.affiliateSegment.updateMany({where:{id:segmentId,tenantId},data:{groupPolicyEnabled:policy.enabled,groupDisappearingSeconds:policy.disappearingSeconds,groupJoinApproval:policy.joinApproval,groupAutoApproveDelaySeconds:policy.autoApproveDelaySeconds}})
    if(!changed.count)throw new AffiliateError(404,'Segmentação não encontrada.')
    await tx.affiliateGroup.updateMany({where:{tenantId,segmentId},data:{groupPolicyState:policy.enabled?'PENDING':'PAUSED',groupPolicyErrorCode:null,groupPolicyAppliedHash:null,groupPolicyNextRunAt:new Date(),groupPolicyLeaseToken:null,groupPolicyLeaseExpiresAt:null}})
    // A policy edit never shortens an already pending admission's safety delay.
    const eligibleAt=new Date(Date.now()+policy.autoApproveDelaySeconds*1000)
    await tx.affiliateGroupAdmission.updateMany({where:{tenantId,group:{segmentId},state:'PENDING',eligibleAt:{lt:eligibleAt}},data:{eligibleAt}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.group_policy.updated',entityType:'AffiliateSegment',entityId:segmentId,after:policy}})
    return {saved:true}
  })
}

// Database leases isolate concurrent worker processes; no request connects or restarts WhatsApp.
export async function runAffiliateGroupPolicies(db:PrismaClient,factory:Factory=affiliateEvolution,now=new Date()) {
  const cycleStartedAt=Date.now()
  const groups=await db.affiliateGroup.findMany({where:{enabled:true,segment:{enabled:true,groupPolicyEnabled:true},groupPolicyNextRunAt:{lte:now},OR:[{groupPolicyLeaseExpiresAt:null},{groupPolicyLeaseExpiresAt:{lte:now}}]},include:{segment:true,instance:true},orderBy:[{groupPolicyNextRunAt:'asc'},{id:'asc'}],take:10})
  let processed=0
  for(const group of groups) {
    const token=randomUUID(),where={id:group.id,tenantId:group.tenantId,enabled:true,segment:{enabled:true,groupPolicyEnabled:true},groupPolicyNextRunAt:{lte:now},OR:[{groupPolicyLeaseExpiresAt:null},{groupPolicyLeaseExpiresAt:{lte:now}}]}
    if(!(await db.affiliateGroup.updateMany({where,data:{groupPolicyLeaseToken:token,groupPolicyLeaseExpiresAt:new Date(now.getTime()+300_000)}})).count)continue
    let state='ACTIVE',errorCode:string|null=null
    try {
      const policy=segmentGroupPolicy(group.segment)
      const port=factory(group.instance)
      if(!group.instance.enabled || !port.status || (await port.status({fresh:true})).state!=='open') {state='WAITING_CONNECTION';errorCode='connection_unavailable';continue}
      const current=()=>db.affiliateGroup.count({where:{id:group.id,tenantId:group.tenantId,enabled:true,instanceId:group.instanceId,groupPolicyLeaseToken:token,instance:{enabled:true},segment:{enabled:true,description:group.segment.description,groupPolicyEnabled:true,groupDisappearingSeconds:policy.disappearingSeconds,groupJoinApproval:policy.joinApproval,groupAutoApproveDelaySeconds:policy.autoApproveDelaySeconds}}})
      if(!await current())continue
      const descriptionHash=createHash('sha256').update(group.segment.description).digest('hex')
      if(group.segment.description && group.groupDescriptionAppliedHash!==descriptionHash) {
        await port.describe(group.jid,group.segment.description)
        if(!await current())continue
        await db.affiliateGroup.updateMany({where:{id:group.id,tenantId:group.tenantId,groupPolicyLeaseToken:token},data:{groupDescriptionAppliedHash:descriptionHash}})
      }
      const hash=groupPolicyHash(policy)
      if(group.groupPolicyAppliedHash!==hash) {
        if(!port.setDisappearingMessages) {state='UNSUPPORTED';errorCode='ephemeral_unsupported';continue}
        // Capability comes from an authenticated extension endpoint, never a guessed upstream route.
        if(!port.groupAdmissionCapabilities || !(await port.groupAdmissionCapabilities()).joinApproval) {state='UNSUPPORTED';errorCode='admission_extension_required';continue}
        await port.setDisappearingMessages(group.jid,policy.disappearingSeconds)
        if(!await current())continue
        await port.setJoinApproval!(group.jid,policy.joinApproval)
        await db.affiliateGroup.updateMany({where:{id:group.id,tenantId:group.tenantId,groupPolicyLeaseToken:token},data:{groupPolicyAppliedHash:hash}})
      }
      if(!policy.joinApproval)continue
      if(!port.pendingJoinRequests || !port.approveJoinRequest) {state='UNSUPPORTED';errorCode='admission_extension_required';continue}
      const pending=[...new Set((await port.pendingJoinRequests(group.jid)).map(jid=>admissionJid.parse(jid)))].slice(0,10000)
      const observedAt=new Date(now.getTime()+Math.max(0,Date.now()-cycleStartedAt))
      const hashes=pending.map(jid=>createHash('sha256').update(`${group.tenantId}:${group.id}:${jid}`).digest('hex'))
      await db.affiliateGroupAdmission.updateMany({where:{tenantId:group.tenantId,groupId:group.id,state:{in:['PENDING','APPROVING','UNCERTAIN','APPROVED']},participantHash:{notIn:hashes}},data:{state:'WITHDRAWN',encryptedJid:null}})
      await db.affiliateGroupAdmission.updateMany({where:{tenantId:group.tenantId,groupId:group.id,state:'APPROVING'},data:{state:'UNCERTAIN',encryptedJid:null}})
      for(let index=0;index<pending.length;index++) {
        const participantHash=hashes[index],context=`affiliate-admission:${group.tenantId}:${group.id}:${participantHash}`
        const data={tenantId:group.tenantId,groupId:group.id,participantHash,encryptedJid:sealWebhookSecret(pending[index],env.WEBHOOK_ENCRYPTION_KEY,context),firstSeenAt:observedAt,eligibleAt:new Date(observedAt.getTime()+policy.autoApproveDelaySeconds*1000),state:'PENDING'}
        await db.affiliateGroupAdmission.upsert({where:{groupId_participantHash:{groupId:group.id,participantHash}},create:data,update:{}})
        await db.affiliateGroupAdmission.updateMany({where:{tenantId:group.tenantId,groupId:group.id,participantHash,state:'WITHDRAWN'},data})
      }
      const due=await db.affiliateGroupAdmission.findMany({where:{tenantId:group.tenantId,groupId:group.id,state:'PENDING',eligibleAt:{lte:now}},take:20,orderBy:{eligibleAt:'asc'}})
      for(const request of due) {
        if(!await current())break
        if(!(await db.affiliateGroupAdmission.updateMany({where:{id:request.id,tenantId:group.tenantId,state:'PENDING'},data:{state:'APPROVING'}})).count)continue
        try {
          const context=`affiliate-admission:${group.tenantId}:${group.id}:${request.participantHash}`
          const jid=admissionJid.parse(openWebhookSecret(request.encryptedJid!,env.WEBHOOK_ENCRYPTION_KEY,context))
          await port.approveJoinRequest(group.jid,jid)
          await db.affiliateGroupAdmission.updateMany({where:{id:request.id,tenantId:group.tenantId,state:'APPROVING'},data:{state:'APPROVED',encryptedJid:null}})
        } catch {await db.affiliateGroupAdmission.updateMany({where:{id:request.id,tenantId:group.tenantId,state:'APPROVING'},data:{state:'UNCERTAIN',encryptedJid:null}});errorCode='admission_response_uncertain';state='ATTENTION'}
      }
      if(await db.affiliateGroupAdmission.count({where:{tenantId:group.tenantId,groupId:group.id,state:'UNCERTAIN'}})) {state='ATTENTION';errorCode='admission_response_uncertain'}
      processed++
    } catch(error) {state='ERROR';errorCode=error instanceof AffiliateProviderError&&[404,405,501].includes(error.providerStatus??0)?'admission_extension_required':'provider_rejected'}
    finally {
      await db.affiliateGroup.updateMany({where:{id:group.id,tenantId:group.tenantId,groupPolicyLeaseToken:token},data:{groupPolicyState:state,groupPolicyErrorCode:errorCode,groupPolicyNextRunAt:new Date(now.getTime()+(state==='ACTIVE'?30_000:300_000)),groupPolicyLeaseToken:null,groupPolicyLeaseExpiresAt:null}})
    }
  }
  // Keep uncertain hashes until the request disappears: deleting them would silently authorize a retry.
  const expired={firstSeenAt:{lt:new Date(now.getTime()-7*86400_000)}}
  await db.affiliateGroupAdmission.updateMany({where:{...expired,state:{in:['APPROVING','UNCERTAIN']}},data:{state:'UNCERTAIN',encryptedJid:null}})
  await db.affiliateGroupAdmission.deleteMany({where:{...expired,state:{notIn:['APPROVING','UNCERTAIN']}}})
  return processed
}
