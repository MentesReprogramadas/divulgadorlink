import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { env } from '@/env'
import { readAffiliateGroupPolicy, runAffiliateGroupPolicies, saveAffiliateGroupPolicy } from './group-policy'
import type { AffiliateWhatsApp } from '@/adapters/affiliates/evolution'
import { groupPolicyHash } from '@/domain/affiliates/group-policy'
import { prepareFirstAffiliateGroup } from './invitations'
import { resolveAffiliateInviteDestination } from './invite-destination'
import {baselineAffiliateMembership,recordAffiliateMembership} from './membership'
import {recordConversionIntent} from './conversions'

const url=process.env.AFFILIATE_DATABASE_URL
if(!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Disposable local AFFILIATE_DATABASE_URL required')
const db=new PrismaClient({datasourceUrl:url}),tenantId=randomUUID(),otherTenant=randomUUID(),actorId=randomUUID()
const policy={enabled:true,disappearingSeconds:604800 as const,joinApproval:true,autoApproveDelaySeconds:10}
const now=new Date('2026-10-30T15:00:00Z')
let groupId:string,segmentId:string
const port=()=>({status:vi.fn(async()=>({state:'open'})),group:vi.fn(),groups:vi.fn(),invite:vi.fn(),create:vi.fn(),picture:vi.fn(),describe:vi.fn(),send:vi.fn(),setDisappearingMessages:vi.fn(async()=>{}),groupAdmissionCapabilities:vi.fn(async()=>({joinApproval:true})),setJoinApproval:vi.fn(async()=>{}),pendingJoinRequests:vi.fn(async()=>['5511999999999@s.whatsapp.net']),approveJoinRequest:vi.fn(async()=>{})}) satisfies AffiliateWhatsApp
beforeAll(async()=>{
  env.WEBHOOK_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64')
  await db.tenant.createMany({data:[{id:tenantId,host:tenantId+'.test',name:'Policy'},{id:otherTenant,host:otherTenant+'.test',name:'Other'}]})
  await db.user.create({data:{id:actorId,tenantId,name:'Admin',role:'ADMIN',passwordHash:'fixture'}})
})
beforeEach(async()=>{
  await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}})
  const instance=await db.affiliateInstance.create({data:{tenantId,name:'Fixture'}})
  const segment=await db.affiliateSegment.create({data:{tenantId,name:'Pets',slug:'pets',instanceId:instance.id,groupPolicyEnabled:true,groupAutoApproveDelaySeconds:10}});segmentId=segment.id
  groupId=(await db.affiliateGroup.create({data:{tenantId,segmentId,instanceId:instance.id,jid:'123@g.us',name:'Pets #1',sequence:1,groupPolicyNextRunAt:now}})).id
})
afterAll(async()=>{
  await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}});await db.auditLog.deleteMany({where:{tenantId}});await db.user.deleteMany({where:{tenantId}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await db.$disconnect()
})
it('observa pedidos existentes e aguarda no mínimo 10 segundos; confirma apenas uma vez',async()=>{
  const remote=port()
  await runAffiliateGroupPolicies(db,()=>remote,now)
  expect(remote.setDisappearingMessages).toHaveBeenCalledWith('123@g.us',604800)
  expect(remote.setJoinApproval).toHaveBeenCalledWith('123@g.us',true)
  const request=await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId}})
  expect(request.encryptedJid).not.toContain('5511999999999')
  expect(request.eligibleAt.getTime()-request.firstSeenAt.getTime()).toBe(10000)
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+9000))
  expect(remote.approveJoinRequest).not.toHaveBeenCalled()
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+12000))
  expect(remote.approveJoinRequest).toHaveBeenCalledOnce()
  expect(await db.affiliateGroupAdmission.findUniqueOrThrow({where:{id:request.id}})).toMatchObject({state:'APPROVED',encryptedJid:null})
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+300000))
  expect(remote.approveJoinRequest).toHaveBeenCalledOnce()
  expect(remote.setJoinApproval).toHaveBeenCalledOnce()
})
it('serializa edição de política e ingresso usando segment antes de group, sem deadlock ou perda de qualificação',async()=>{
  const group=await db.affiliateGroup.findUniqueOrThrow({where:{id:groupId}}),origin=`https://${tenantId}.test`
  const previousPixel=process.env.META_PIXEL_ID
  process.env.META_PIXEL_ID='123'
  await db.config.create({data:{tenantId,key:'AFFILIATE_META_CONVERSIONS',value:JSON.stringify({enabled:true,pixelId:'123',segmentIds:[segmentId],allowedOrigins:[origin]})}})
  await baselineAffiliateMembership(db,tenantId,groupId,env.WEBHOOK_ENCRYPTION_KEY,async()=>[],new Date(now.getTime()-2000))
  await recordConversionIntent(db,{id:tenantId,host:`${tenantId}.test`},'pets',{phone:'11999991234',marketingConsent:true,sourceUrl:origin+'/'},'fixture-agent',origin,new Date(now.getTime()-1000))
  let segmentLocked!:()=>void,continuePolicy!:()=>void
  const locked=new Promise<void>(resolve=>{segmentLocked=resolve}),release=new Promise<void>(resolve=>{continuePolicy=resolve})
  const policyDb=db.$extends({query:{affiliateSegment:{async updateMany({args,query}) {
    const result=await query(args)
    segmentLocked()
    await release
    return result
  }}}}) as unknown as PrismaClient
  const saving=saveAffiliateGroupPolicy(policyDb,tenantId,actorId,segmentId,policy)
  let recording:ReturnType<typeof recordAffiliateMembership>|undefined
  try {
    await locked
    recording=recordAffiliateMembership(db,tenantId,group.instanceId,{instance:'Fixture',jid:group.jid,action:'add',participants:['5511999991234@s.whatsapp.net'],occurredAt:now},env.WEBHOOK_ENCRYPTION_KEY,now)
    // Hold the policy's segment lock until membership is actually waiting for that lock.
    await vi.waitFor(async()=>{
      const waiting=await db.$queryRaw<{pid:number}[]>`SELECT pid FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%affiliate_segments%FOR UPDATE%'`
      expect(waiting.length).toBeGreaterThan(0)
    })
    continuePolicy()
    expect(await Promise.all([saving,recording])).toEqual([{saved:true},'accepted'])
    expect(await db.affiliateConversionOutbox.count({where:{kind:'QUALIFIED_GROUP_LEAD',intent:{tenantId,segmentId}}})).toBe(1)
    expect(await db.affiliateMembershipDaily.findFirstOrThrow({where:{tenantId,groupId}})).toMatchObject({joins:1})
  } finally {
    continuePolicy()
    await Promise.allSettled(recording?[saving,recording]:[saving])
    await db.config.deleteMany({where:{tenantId,key:'AFFILIATE_META_CONVERSIONS'}})
    if(previousPixel===undefined)delete process.env.META_PIXEL_ID
    else process.env.META_PIXEL_ID=previousPixel
  }
})
it('não acessa conexão fechada, segmentos sem política ou pausados',async()=>{
  const remote=port();remote.status.mockResolvedValue({state:'close'})
  await runAffiliateGroupPolicies(db,()=>remote,now)
  expect(remote.pendingJoinRequests).not.toHaveBeenCalled();expect(remote.setJoinApproval).not.toHaveBeenCalled()
  expect(await db.affiliateGroup.findUniqueOrThrow({where:{id:groupId}})).toMatchObject({groupPolicyState:'WAITING_CONNECTION'})
  await db.affiliateSegment.update({where:{id:segmentId},data:{groupPolicyEnabled:false}})
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+600000))
  expect(remote.status).toHaveBeenCalledOnce()
})
it('registra extensão ausente sem simular aprovação nem alterar configuração parcialmente',async()=>{
  const remote=port();remote.groupAdmissionCapabilities.mockResolvedValue({joinApproval:false})
  await runAffiliateGroupPolicies(db,()=>remote,now)
  expect(remote.setDisappearingMessages).not.toHaveBeenCalled();expect(remote.pendingJoinRequests).not.toHaveBeenCalled()
  expect(await db.affiliateGroup.findUniqueOrThrow({where:{id:groupId}})).toMatchObject({groupPolicyState:'UNSUPPORTED',groupPolicyErrorCode:'admission_extension_required',groupPolicyAppliedHash:null})
})
it('serializa workers concorrentes e não repete aprovação de resposta incerta',async()=>{
  const remote=port()
  await Promise.all([runAffiliateGroupPolicies(db,()=>remote,now),runAffiliateGroupPolicies(db,()=>remote,now)])
  expect(remote.setJoinApproval).toHaveBeenCalledOnce()
  remote.approveJoinRequest.mockRejectedValue(new Error('uncertain'))
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+12000))
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+600000))
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+8*86400000))
  expect(remote.approveJoinRequest).toHaveBeenCalledOnce()
  expect(await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId}})).toMatchObject({state:'UNCERTAIN',encryptedJid:null})
})
it('retira pedido cancelado e reinicia prazo de nova solicitação',async()=>{
  const remote=port();await runAffiliateGroupPolicies(db,()=>remote,now)
  remote.pendingJoinRequests.mockResolvedValue([])
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+12000))
  expect(await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId}})).toMatchObject({state:'WITHDRAWN',encryptedJid:null})
  remote.pendingJoinRequests.mockResolvedValue(['5511999999999@s.whatsapp.net'])
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+300000))
  expect(remote.approveJoinRequest).not.toHaveBeenCalled()
  expect((await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId}})).eligibleAt.getTime()).toBeGreaterThanOrEqual(now.getTime()+310000)
})
it('isola leitura/escrita por tenant, valida atraso e audita a configuração',async()=>{
  await expect(readAffiliateGroupPolicy(db,otherTenant,segmentId)).rejects.toMatchObject({status:404})
  await expect(saveAffiliateGroupPolicy(db,otherTenant,actorId,segmentId,policy)).rejects.toMatchObject({status:404})
  await expect(saveAffiliateGroupPolicy(db,tenantId,actorId,segmentId,{...policy,autoApproveDelaySeconds:0})).rejects.toThrow()
  await saveAffiliateGroupPolicy(db,tenantId,actorId,segmentId,{...policy,enabled:false})
  expect(await readAffiliateGroupPolicy(db,tenantId,segmentId)).toMatchObject({enabled:false,autoApproveDelaySeconds:10,groups:[{groupPolicyState:'PAUSED'}]})
  expect(await db.auditLog.count({where:{tenantId,action:'affiliate.group_policy.updated'}})).toBeGreaterThan(0)
  expect(groupPolicyHash(policy)).toBe(groupPolicyHash({...policy,autoApproveDelaySeconds:240}))
})
it('bloqueia convite de grupo existente até aplicar a política e configura grupos futuros antes do convite',async()=>{
  const remote=port()
  expect(await resolveAffiliateInviteDestination(db,tenantId,'pets',()=>remote)).toBeNull()
  expect(remote.invite).not.toHaveBeenCalled()
  await db.affiliateGroup.deleteMany({where:{tenantId}})
  await db.affiliateInstance.updateMany({where:{tenantId},data:{ownerPhone:'5511888888888'}})
  remote.groupAdmissionCapabilities.mockResolvedValue({joinApproval:false})
  await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>remote)).rejects.toMatchObject({status:503})
  expect(remote.create).not.toHaveBeenCalled()
  remote.groupAdmissionCapabilities.mockResolvedValue({joinApproval:true})
  remote.create.mockResolvedValue('456@g.us')
  remote.group.mockResolvedValue({jid:'456@g.us',name:'Pets #1',participantCount:1,description:'',imageUrl:null})
  remote.invite.mockResolvedValue('https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
  await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>remote)).resolves.toHaveProperty('url')
  expect(remote.setJoinApproval.mock.invocationCallOrder[0]).toBeLessThan(remote.invite.mock.invocationCallOrder[0])
  expect(await db.affiliateGroup.findFirstOrThrow({where:{tenantId}})).toMatchObject({groupPolicyAppliedHash:groupPolicyHash(policy),groupPolicyState:'ACTIVE'})
})
it('sincroniza descrição uma vez na conexão aberta mesmo com extensão ausente, e respeita pausa concorrente',async()=>{
  await db.affiliateSegment.update({where:{id:segmentId},data:{description:'Descrição Pets aprovada'}})
  const remote=port();remote.groupAdmissionCapabilities.mockResolvedValue({joinApproval:false})
  await runAffiliateGroupPolicies(db,()=>remote,now)
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+300000))
  expect(remote.describe).toHaveBeenCalledExactlyOnceWith('123@g.us','Descrição Pets aprovada')
  expect(await db.affiliateGroup.findUniqueOrThrow({where:{id:groupId}})).toMatchObject({groupPolicyState:'UNSUPPORTED'})
  remote.status.mockImplementation(async()=>{await db.affiliateGroup.update({where:{id:groupId},data:{enabled:false}});return {state:'open'}})
  remote.groupAdmissionCapabilities.mockClear()
  await runAffiliateGroupPolicies(db,()=>remote,new Date(now.getTime()+600000))
  expect(remote.groupAdmissionCapabilities).not.toHaveBeenCalled()
})
it.each(['duration','approval','enabled'] as const)('não libera o convite inicial quando %s muda durante a criação remota',async change=>{
  await db.affiliateGroup.deleteMany({where:{tenantId}})
  await db.affiliateInstance.updateMany({where:{tenantId},data:{ownerPhone:'5511888888888'}})
  if(change==='approval')await db.affiliateSegment.update({where:{id:segmentId},data:{groupJoinApproval:false}})
  if(change==='enabled')await db.affiliateSegment.update({where:{id:segmentId},data:{groupPolicyEnabled:false}})
  const remote=port()
  remote.create.mockImplementation(async()=>{
    await saveAffiliateGroupPolicy(db,tenantId,actorId,segmentId,{...policy,disappearingSeconds:change==='duration'?86400:policy.disappearingSeconds})
    return '456@g.us'
  })
  remote.group.mockResolvedValue({jid:'456@g.us',name:'Pets #1',participantCount:1,description:'',imageUrl:null})
  remote.invite.mockResolvedValue('https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
  await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>remote)).rejects.toMatchObject({status:409})
  const expectedHash=change==='enabled'?null:groupPolicyHash({...policy,joinApproval:change!=='approval'})
  expect(await db.affiliateGroup.findFirstOrThrow({where:{tenantId}})).toMatchObject({groupPolicyAppliedHash:expectedHash,groupPolicyState:'PENDING'})
  expect(await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})).toMatchObject({provisionState:'IDLE'})
  expect(await db.auditLog.count({where:{tenantId,action:'affiliate.group.provision_uncertain'}})).toBe(0)
  expect(await resolveAffiliateInviteDestination(db,tenantId,'pets',()=>remote)).toBeNull()
})

it('processa pedidos em dez segundos sem esperar o polling antigo de trinta segundos',async()=>{
  const remote=port()
  await runAffiliateGroupPolicies(db,()=>remote,now)
  const request=await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId}})
  const group=await db.affiliateGroup.findUniqueOrThrow({where:{id:groupId}})
  expect(group.groupPolicyNextRunAt.getTime()).toBeLessThanOrEqual(now.getTime()+2000)
  await runAffiliateGroupPolicies(db,()=>remote,new Date(request.eligibleAt.getTime()-1))
  expect(remote.approveJoinRequest).not.toHaveBeenCalled()
  await runAffiliateGroupPolicies(db,()=>remote,new Date(request.eligibleAt.getTime()+2000))
  expect(remote.approveJoinRequest).toHaveBeenCalledExactlyOnceWith('123@g.us','5511999999999@s.whatsapp.net')
})

it('migra somente 120 segundos legados e pedidos pendentes, preservando configuração customizada e incerteza',async()=>{
  await db.affiliateSegment.update({where:{id:segmentId},data:{groupAutoApproveDelaySeconds:120}})
  const custom=await db.affiliateSegment.create({data:{tenantId:otherTenant,name:'Custom',slug:'custom',groupAutoApproveDelaySeconds:240}})
  const remote=port()
  await runAffiliateGroupPolicies(db,()=>remote,now)
  const request=await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId}})
  await db.affiliateGroupAdmission.create({data:{tenantId,groupId,participantHash:'uncertain-fixture',state:'UNCERTAIN',firstSeenAt:now,eligibleAt:new Date(now.getTime()+120000)}})
  await db.config.createMany({data:[{tenantId,key:'AFFILIATE_GROUP_POLICY_DEFAULTS',value:JSON.stringify({...policy,autoApproveDelaySeconds:120})},{tenantId:otherTenant,key:'AFFILIATE_GROUP_POLICY_DEFAULTS',value:JSON.stringify({...policy,autoApproveDelaySeconds:240})}]})
  try {
    const migration=readFileSync('prisma/migrations/20261031180000_affiliate_admission_ten_seconds/migration.sql','utf8')
    await db.$transaction(async tx=>{
      for(const statement of migration.replace(/\r\n/g,'\n').split(/\n\n(?=--|WITH|DO|UPDATE)/))await tx.$executeRawUnsafe(statement)
    })
    expect((await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})).groupAutoApproveDelaySeconds).toBe(10)
    expect((await db.affiliateSegment.findUniqueOrThrow({where:{id:custom.id}})).groupAutoApproveDelaySeconds).toBe(240)
    const migrated=await db.affiliateGroupAdmission.findUniqueOrThrow({where:{id:request.id}})
    expect(migrated.eligibleAt.getTime()-migrated.firstSeenAt.getTime()).toBe(10000)
    expect(migrated.state).toBe('PENDING')
    expect(await db.affiliateGroupAdmission.findFirstOrThrow({where:{participantHash:'uncertain-fixture'}})).toMatchObject({state:'UNCERTAIN',eligibleAt:new Date(now.getTime()+120000)})
    expect(JSON.parse((await db.config.findUniqueOrThrow({where:{tenantId_key:{tenantId,key:'AFFILIATE_GROUP_POLICY_DEFAULTS'}}})).value).autoApproveDelaySeconds).toBe(10)
    expect(JSON.parse((await db.config.findUniqueOrThrow({where:{tenantId_key:{tenantId:otherTenant,key:'AFFILIATE_GROUP_POLICY_DEFAULTS'}}})).value).autoApproveDelaySeconds).toBe(240)
    expect(remote.approveJoinRequest).not.toHaveBeenCalled()
  } finally {
    await db.config.deleteMany({where:{tenantId:{in:[tenantId,otherTenant]},key:'AFFILIATE_GROUP_POLICY_DEFAULTS'}})
    await db.affiliateSegment.delete({where:{id:custom.id}})
  }
})

it('continua aprovando novos pedidos em ATTENTION sem repetir participante incerto',async()=>{
  const remote=port()
  await runAffiliateGroupPolicies(db,()=>remote,now)
  const first=await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId}})
  remote.approveJoinRequest.mockRejectedValueOnce(new Error('uncertain'))
  await runAffiliateGroupPolicies(db,()=>remote,new Date(first.eligibleAt.getTime()+2000))
  expect(await db.affiliateGroup.findUniqueOrThrow({where:{id:groupId}})).toMatchObject({groupPolicyState:'ATTENTION'})
  const observedAt=new Date(first.eligibleAt.getTime()+4000)
  remote.pendingJoinRequests.mockResolvedValue(['5511999999999@s.whatsapp.net','5511888888888@s.whatsapp.net'])
  await runAffiliateGroupPolicies(db,()=>remote,observedAt)
  const second=await db.affiliateGroupAdmission.findFirstOrThrow({where:{tenantId,state:'PENDING'}})
  expect(second.eligibleAt.getTime()-second.firstSeenAt.getTime()).toBe(10000)
  await runAffiliateGroupPolicies(db,()=>remote,new Date(second.eligibleAt.getTime()+2000))
  expect(remote.approveJoinRequest).toHaveBeenCalledTimes(2)
  expect(remote.approveJoinRequest).toHaveBeenLastCalledWith('123@g.us','5511888888888@s.whatsapp.net')
  expect(await db.affiliateGroupAdmission.findUniqueOrThrow({where:{id:first.id}})).toMatchObject({state:'UNCERTAIN',encryptedJid:null})
  expect(await db.affiliateGroupAdmission.findUniqueOrThrow({where:{id:second.id}})).toMatchObject({state:'APPROVED',encryptedJid:null})
})
