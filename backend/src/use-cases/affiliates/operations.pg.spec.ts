import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { scheduleAffiliateBroadcast, runAffiliateDeliveries, resolveAffiliateDelivery } from './deliveries'
import { joinAffiliateSegment, prepareFirstAffiliateGroup, reconcileAffiliateSegment } from './invitations'
import { AffiliateProviderError, type AffiliateWhatsApp } from '@/adapters/affiliates/evolution'

const url=process.env.AFFILIATE_DATABASE_URL
if(!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local AFFILIATE_DATABASE_URL required')
const db=new PrismaClient({datasourceUrl:url}),tenantId=randomUUID(),actorId=randomUUID(),otherTenant=randomUUID()
let instanceId:string,segmentId:string,offerId:string
const remote=()=>({group:vi.fn<AffiliateWhatsApp['group']>(async(jid:string)=>({jid,name:'Natal #1',participantCount:3,description:'Natal para todos',imageUrl:null})),groups:vi.fn(async()=>[]),invite:vi.fn(async()=> 'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'),create:vi.fn(async()=> '456@g.us'),picture:vi.fn(async()=>{}),describe:vi.fn(async()=>{}),send:vi.fn<AffiliateWhatsApp['send']>(async()=> 'provider-id')}) satisfies AffiliateWhatsApp
beforeAll(async()=>{
  await db.tenant.createMany({data:[{id:tenantId,host:tenantId+'.test',name:'Affiliate fixture'},{id:otherTenant,host:otherTenant+'.test',name:'Other fixture'}]})
  await db.user.create({data:{id:actorId,tenantId,name:'Admin',role:'ADMIN',passwordHash:'fixture'}})
})
beforeEach(async()=>{
  await db.affiliateDelivery.deleteMany({where:{tenantId}});await db.affiliateBroadcast.deleteMany({where:{tenantId}});await db.affiliateOffer.deleteMany({where:{tenantId}});await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}})
  const instance=await db.affiliateInstance.create({data:{tenantId,name:'Natal 01',ownerPhone:'5511999999999'}});instanceId=instance.id
  const segment=await db.affiliateSegment.create({data:{tenantId,name:'Natal',slug:'natal',capacity:10,instanceId,autoExpand:true,description:'Natal para todos'}});segmentId=segment.id
  await db.affiliateGroup.create({data:{tenantId,segmentId,instanceId,jid:'123@g.us',name:'Natal #1',sequence:1,capacity:10,participantCount:3}})
  await db.affiliateSegment.update({where:{id:segmentId},data:{nextSequence:2}})
  const offer=await db.affiliateOffer.create({data:{tenantId,segmentId,title:'Presente de Natal',productUrl:'https://produto.mercadolivre.com.br/MLB-123',affiliateUrl:'https://meli.la/fixture',priceCents:1990}});offerId=offer.id
})
afterAll(async()=>{
  await db.affiliateDelivery.deleteMany({where:{tenantId}});await db.affiliateBroadcast.deleteMany({where:{tenantId}});await db.affiliateOffer.deleteMany({where:{tenantId}});await db.affiliateGroup.deleteMany({where:{tenantId}});await db.affiliateSegment.deleteMany({where:{tenantId}});await db.affiliateInstance.deleteMany({where:{tenantId}});await db.auditLog.deleteMany({where:{tenantId}});await db.user.deleteMany({where:{tenantId}});await db.tenant.deleteMany({where:{id:{in:[tenantId,otherTenant]}}});await db.$disconnect()
})
describe('PostgreSQL afiliados',()=>{
  it('prepara primeiro grupo explicitamente sem ligar expansão ou permitir criação pública',async()=>{
    await db.affiliateGroup.deleteMany({where:{tenantId,segmentId}})
    await db.affiliateSegment.update({where:{id:segmentId},data:{autoExpand:false,nextSequence:1,groupName:'Ofertas de Natal'}})
    const port=remote()
    await expect(joinAffiliateSegment(db,tenantId,'natal',()=>port)).rejects.toMatchObject({status:409})
    expect(port.create).not.toHaveBeenCalled()
    expect(await prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port)).toHaveProperty('url')
    expect(port.create).toHaveBeenCalledWith('Ofertas de Natal #1','Natal para todos')
    expect(await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})).toMatchObject({autoExpand:false,provisionState:'IDLE',nextSequence:2})
    expect(await db.auditLog.findFirst({where:{tenantId,actorId,entityId:segmentId,action:'affiliate.group.provisioned'}})).not.toBeNull()
    await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port)).rejects.toMatchObject({status:409})
    expect(port.create).toHaveBeenCalledOnce()
  })
  it('serializa pedidos do primeiro grupo e preserva criação incerta sem repetir',async()=>{
    await db.affiliateGroup.deleteMany({where:{tenantId,segmentId}})
    await db.affiliateSegment.update({where:{id:segmentId},data:{autoExpand:false,nextSequence:1}})
    const port=remote()
    port.create.mockImplementation(async()=>{await new Promise(resolve=>setTimeout(resolve,30));return '456@g.us'})
    const results=await Promise.allSettled([prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port),prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port)])
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1)
    expect(port.create).toHaveBeenCalledOnce()
    await db.affiliateGroup.deleteMany({where:{tenantId,segmentId}})
    await db.affiliateSegment.update({where:{id:segmentId},data:{nextSequence:1}})
    port.create.mockRejectedValue(new AffiliateProviderError(true))
    await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port)).rejects.toMatchObject({status:503})
    await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port)).rejects.toMatchObject({status:409})
    expect(port.create).toHaveBeenCalledTimes(2)
  })
  it('não prepara outro grupo quando o grupo existente está pausado nem para outro tenant',async()=>{
    const port=remote()
    await db.affiliateGroup.updateMany({where:{tenantId,segmentId},data:{enabled:false}})
    await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port)).rejects.toMatchObject({status:409})
    await expect(prepareFirstAffiliateGroup(db,otherTenant,actorId,segmentId,()=>port)).rejects.toMatchObject({status:404})
    expect(port.create).not.toHaveBeenCalled()
  })
  it('não cria grupo quando a conexão foi pausada durante a verificação',async()=>{
    await db.affiliateGroup.deleteMany({where:{tenantId,segmentId}})
    const port={...remote(),status:vi.fn(async()=>{await db.affiliateInstance.update({where:{id:instanceId},data:{enabled:false}});return {state:'open'}})}
    await expect(prepareFirstAffiliateGroup(db,tenantId,actorId,segmentId,()=>port)).rejects.toMatchObject({status:409})
    expect(port.create).not.toHaveBeenCalled()
    expect(await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})).toMatchObject({provisionState:'IDLE'})
  })
  const connectSecond=async()=>{
    const second=await db.affiliateInstance.create({data:{tenantId,name:'Reserva',ownerPhone:'5511888888888',nextSendAt:new Date(1)}})
    await db.affiliateInstance.update({where:{id:instanceId},data:{nextSendAt:new Date(0)}})
    await db.affiliateSegmentInstance.createMany({data:[{tenantId,segmentId,instanceId},{tenantId,segmentId,instanceId:second.id}]})
    return second
  }
  it('convite quente ainda verifica capacidade real e não devolve grupo cheio',async()=>{
    await db.affiliateSegment.update({where:{id:segmentId},data:{autoExpand:false}})
    const port={...remote(),status:vi.fn(async()=>({state:'open'}))}
    await joinAffiliateSegment(db,tenantId,'natal',()=>port)
    port.invite.mockClear();port.group.mockImplementation(async jid=>({jid,name:'Natal #1',participantCount:10,description:'',imageUrl:null}))
    await expect(joinAffiliateSegment(db,tenantId,'natal',()=>port)).rejects.toMatchObject({status:409})
    expect(port.invite).not.toHaveBeenCalled();expect(port.create).not.toHaveBeenCalled()
  })
  it('pausa durante retorno de convite em cache continua bloqueando o destino',async()=>{
    const port={...remote(),status:vi.fn(async()=>({state:'open'}))}
    port.invite.mockImplementation(async()=>{await db.affiliateGroup.updateMany({where:{tenantId,segmentId},data:{enabled:false}});return 'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'})
    await expect(joinAffiliateSegment(db,tenantId,'natal',()=>port)).rejects.toMatchObject({status:409})
    expect(port.create).not.toHaveBeenCalled()
  })
  it('convite quente troca conexão após falha de acesso ao grupo',async()=>{
    await connectSecond()
    const primary={...remote(),status:vi.fn(async()=>({state:'open'}))},backup={...remote(),status:vi.fn(async()=>({state:'open'}))}
    primary.group.mockRejectedValue(new AffiliateProviderError(false,403))
    expect(await joinAffiliateSegment(db,tenantId,'natal',instance=>instance.id===instanceId?primary:backup)).toHaveProperty('url')
    expect(primary.invite).not.toHaveBeenCalled();expect(backup.invite).toHaveBeenCalledOnce()
    expect(primary.create).not.toHaveBeenCalled();expect(backup.create).not.toHaveBeenCalled()
  })
  it('expansão ignora sessão aberta em cache e escolhe reserva realmente conectada',async()=>{
    const second=await connectSecond()
    await db.affiliateSegmentInstance.updateMany({where:{tenantId,segmentId,instanceId},data:{lastUsedAt:new Date(0)}})
    await db.affiliateSegmentInstance.updateMany({where:{tenantId,segmentId,instanceId:second.id},data:{lastUsedAt:new Date(1)}})
    const primary={...remote(),status:vi.fn(async(options?:{fresh:true})=>({state:options?.fresh?'close':'open'}))},backup={...remote(),status:vi.fn(async()=>({state:'open'}))}
    primary.group.mockImplementation(async jid=>({jid,name:'Natal #1',participantCount:10,description:'Natal para todos',imageUrl:null}))
    await joinAffiliateSegment(db,tenantId,'natal',instance=>instance.id===instanceId?primary:backup)
    expect(primary.status).toHaveBeenCalledWith({fresh:true});expect(primary.create).not.toHaveBeenCalled()
    expect(backup.create).toHaveBeenCalledOnce()
    expect(await db.affiliateGroup.findFirst({where:{tenantId,jid:'456@g.us'}})).toMatchObject({instanceId:second.id})
  })
  it('alterna contas selecionadas entre destinos e registra a conexão de envio',async()=>{
    const second=await connectSecond()
    await db.affiliateGroup.create({data:{tenantId,segmentId,instanceId,jid:'999@g.us',name:'Natal #2',sequence:2}})
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const primary=remote(),backup=remote()
    await runAffiliateDeliveries(db,instance=>instance.id===instanceId?primary:backup)
    expect(primary.send).toHaveBeenCalledOnce();expect(backup.send).toHaveBeenCalledOnce()
    const rows=await db.affiliateDelivery.findMany({where:{tenantId,state:'SENT'}})
    expect(new Set(rows.map(row=>row.sentViaInstanceId))).toEqual(new Set([instanceId,second.id]))
    expect(new Set(rows.map(row=>row.groupId)).size).toBe(2)
  })
  it('troca conta após falha de acesso ao grupo, antes de qualquer envio',async()=>{
    const second=await connectSecond()
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const primary=remote(),backup=remote();primary.group.mockRejectedValue(new AffiliateProviderError(false,403))
    await runAffiliateDeliveries(db,instance=>instance.id===instanceId?primary:backup)
    expect(primary.send).not.toHaveBeenCalled();expect(backup.send).toHaveBeenCalledOnce()
    expect(await db.affiliateDelivery.findFirst({where:{tenantId,state:'SENT'}})).toMatchObject({sentViaInstanceId:second.id})
  })
  it('não alterna nem duplica quando o primeiro envio ficou incerto',async()=>{
    await connectSecond()
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const primary=remote(),backup=remote();primary.send.mockRejectedValue(new AffiliateProviderError(true))
    await runAffiliateDeliveries(db,instance=>instance.id===instanceId?primary:backup)
    expect(primary.send).toHaveBeenCalledOnce();expect(backup.send).not.toHaveBeenCalled()
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'UNCERTAIN'}})).toBe(1)
  })
  it('não envia sem acesso ao grupo e adia a entrega sem marcar como enviada',async()=>{
    await connectSecond()
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const primary=remote(),backup=remote();primary.group.mockRejectedValue(new AffiliateProviderError(false,403));backup.group.mockRejectedValue(new AffiliateProviderError(false,403))
    const before=new Date()
    await runAffiliateDeliveries(db,instance=>instance.id===instanceId?primary:backup)
    expect(primary.send).not.toHaveBeenCalled();expect(backup.send).not.toHaveBeenCalled()
    const row=await db.affiliateDelivery.findFirstOrThrow({where:{tenantId}})
    expect(row).toMatchObject({state:'PENDING',errorCode:'connection_unavailable',sentViaInstanceId:null})
    expect(row.nextAttemptAt>before).toBe(true)
  })
  it('pausa durante a consulta do grupo devolve claim sem enviar nem criar incerteza',async()=>{
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const port=remote();port.group.mockImplementation(async jid=>{await db.affiliateInstance.update({where:{id:instanceId},data:{enabled:false}});return {jid,name:'Natal',participantCount:3,description:'',imageUrl:null}})
    await runAffiliateDeliveries(db,()=>port)
    expect(port.send).not.toHaveBeenCalled()
    expect(await db.affiliateDelivery.findFirst({where:{tenantId}})).toMatchObject({state:'PENDING',sentViaInstanceId:null})
  })
  it('usa reserva ativa com dona original pausada e rejeita vínculo de outro tenant',async()=>{
    const second=await connectSecond()
    await db.affiliateInstance.update({where:{id:instanceId},data:{enabled:false}})
    await expect(db.affiliateSegmentInstance.create({data:{tenantId:otherTenant,segmentId,instanceId:second.id}})).rejects.toThrow()
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const port=remote();await runAffiliateDeliveries(db,()=>port)
    expect(port.send).toHaveBeenCalledOnce()
    expect(await joinAffiliateSegment(db,tenantId,'natal',()=>port)).toHaveProperty('url')
  })
  it('expansão usa conexão saudável e mantém o criador para reconciliação',async()=>{
    const second=await connectSecond(),primary={...remote(),status:vi.fn(async()=>({state:'close'}))},backup={...remote(),status:vi.fn(async()=>({state:'open'}))}
    backup.group.mockImplementation(async jid=>({jid,name:'Natal',participantCount:jid==='123@g.us'?10:1,description:'Natal',imageUrl:null}))
    await joinAffiliateSegment(db,tenantId,'natal',instance=>instance.id===instanceId?primary:backup)
    expect(primary.create).not.toHaveBeenCalled();expect(backup.create).toHaveBeenCalledOnce()
    expect(await db.affiliateSegment.findUnique({where:{id:segmentId}})).toMatchObject({instanceId:second.id,provisionState:'IDLE'})
    expect(await db.affiliateGroup.findFirst({where:{tenantId,jid:'456@g.us'}})).toMatchObject({instanceId:second.id})
  })
  it('serializa aprovação concorrente e snapshot por grupo sem duplicar entregas',async()=>{
    const idempotencyKey=randomUUID()
    const results=await Promise.all([scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey}),scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey})])
    expect(results[0]!.id).toBe(results[1]!.id)
    expect(await db.affiliateDelivery.count({where:{tenantId}})).toBe(1)
    await expect(scheduleAffiliateBroadcast(db,otherTenant,actorId,offerId,{idempotencyKey:randomUUID()})).rejects.toThrow('não encontrada')
  })
  it('repetir falha e aprovar nova distribuição concorrem pelo mesmo lock sem duplicar destinos',async()=>{
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    await db.affiliateDelivery.updateMany({where:{tenantId},data:{state:'FAILED'}})
    const failed=await db.affiliateDelivery.findFirstOrThrow({where:{tenantId}})
    const results=await Promise.allSettled([
      scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()}),
      resolveAffiliateDelivery(db,tenantId,actorId,failed.id,{resolution:'RETRY',confirmUncertain:false}),
    ])
    expect(results.filter(row=>row.status==='fulfilled')).toHaveLength(1)
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'PENDING'}})).toBe(1)
  })
  it('rejeita repetir falha antiga com outro envio ativo, mas permite confirmar manualmente enviada',async()=>{
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    await db.affiliateDelivery.updateMany({where:{tenantId},data:{state:'FAILED'}})
    const failed=await db.affiliateDelivery.findFirstOrThrow({where:{tenantId}})
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    await expect(resolveAffiliateDelivery(db,tenantId,actorId,failed.id,{resolution:'RETRY',confirmUncertain:false})).rejects.toThrow('Outra distribuição')
    expect(await resolveAffiliateDelivery(db,tenantId,actorId,failed.id,{resolution:'SENT',confirmUncertain:false})).toEqual({saved:true})
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'PENDING'}})).toBe(1)
  })
  it('envia para todos destinos uma vez e mantém falha parcial isolada',async()=>{
    const second=await db.affiliateInstance.create({data:{tenantId,name:'Natal 02'}})
    await db.affiliateGroup.create({data:{tenantId,segmentId,instanceId:second.id,jid:'999@g.us',name:'Natal #2',sequence:2}})
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const port=remote();port.send.mockImplementation(async jid=>{if(jid==='999@g.us')throw new AffiliateProviderError(true);return 'sent-123'})
    await runAffiliateDeliveries(db,()=>port)
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'SENT'}})).toBe(1)
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'UNCERTAIN'}})).toBe(1)
    await runAffiliateDeliveries(db,()=>port)
    expect(port.send).toHaveBeenCalledTimes(2)
    const uncertain=await db.affiliateDelivery.findFirstOrThrow({where:{tenantId,state:'UNCERTAIN'}})
    await expect(resolveAffiliateDelivery(db,tenantId,actorId,uncertain.id,{resolution:'RETRY',confirmUncertain:false})).rejects.toThrow('Confira no grupo')
    await resolveAffiliateDelivery(db,tenantId,actorId,uncertain.id,{resolution:'SENT',confirmUncertain:true})
  })
  it('bloqueia snapshot editado durante preflight e deixa confirmação para nova revisão',async()=>{
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const port=remote();port.group.mockImplementation(async jid=>{await db.affiliateOffer.update({where:{id:offerId},data:{priceCents:2990}});return {jid,name:'Natal',participantCount:2,description:'',imageUrl:null}})
    await runAffiliateDeliveries(db,()=>port)
    expect(port.send).not.toHaveBeenCalled()
  })
  it('pausas não bloqueiam outras segmentações e preço expirado não envia',async()=>{
    const paused=await db.affiliateSegment.create({data:{tenantId,name:'Pausa',slug:'pausa',enabled:false}})
    const pausedOffer=await db.affiliateOffer.create({data:{tenantId,segmentId:paused.id,title:'Pausa',productUrl:'https://meli.la/fixture',affiliateUrl:'https://meli.la/fixture',priceCents:1900}})
    for(let i=0;i<21;i++){
      const group=await db.affiliateGroup.create({data:{tenantId,segmentId:paused.id,instanceId,jid:`88${i}@g.us`,name:'Pausado',sequence:i+1}})
      const broadcast=await db.affiliateBroadcast.create({data:{tenantId,segmentId:paused.id,offerId:pausedOffer.id,idempotencyKey:randomUUID(),offerUpdatedAt:pausedOffer.updatedAt,message:'Pausa'}})
      await db.affiliateDelivery.create({data:{tenantId,broadcastId:broadcast.id,groupId:group.id,nextAttemptAt:new Date(0)}})
    }
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    const port=remote();await runAffiliateDeliveries(db,()=>port)
    expect(port.send).toHaveBeenCalledOnce()
    await db.affiliateOffer.update({where:{id:offerId},data:{expiresAt:new Date(0)}})
    await expect(scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})).rejects.toThrow('vencida')
  })
  it('não reenvia envio interrompido após claim e isola FKs de tenant',async()=>{
    await scheduleAffiliateBroadcast(db,tenantId,actorId,offerId,{idempotencyKey:randomUUID()})
    await db.affiliateDelivery.updateMany({where:{tenantId},data:{state:'SENDING',lockedAt:new Date(0)}})
    const port=remote();await runAffiliateDeliveries(db,()=>port)
    expect(port.send).not.toHaveBeenCalled()
    expect(await db.affiliateDelivery.count({where:{tenantId,state:'UNCERTAIN'}})).toBe(1)
    await expect(db.affiliateGroup.create({data:{tenantId:otherTenant,segmentId,instanceId,jid:'888@g.us',name:'Wrong tenant',sequence:9}})).rejects.toThrow()
  })
  it('consulta ocupação real e não cria grupo enquanto houver vagas',async()=>{
    const port=remote()
    expect(await joinAffiliateSegment(db,tenantId,'natal',()=>port)).toHaveProperty('url')
    expect(port.create).not.toHaveBeenCalled();expect(port.group).toHaveBeenCalledWith('123@g.us')
  })
  it('serializa expansão concorrente e copia metadados e sufixo',async()=>{
    const port=remote();port.group.mockImplementation(async jid=>({jid,name:jid==='123@g.us'?'Natal #1':'Natal #2',participantCount:jid==='123@g.us'?10:1,description:'Natal para todos',imageUrl:null}))
    port.create.mockImplementation(async()=>{await new Promise(resolve=>setTimeout(resolve,80));return '456@g.us'})
    const results=await Promise.allSettled([joinAffiliateSegment(db,tenantId,'natal',()=>port),joinAffiliateSegment(db,tenantId,'natal',()=>port)])
    expect(results.filter(row=>row.status==='fulfilled')).toHaveLength(1)
    expect(port.create).toHaveBeenCalledOnce();expect(port.create).toHaveBeenCalledWith('Natal #2','Natal para todos')
    expect(await db.affiliateGroup.count({where:{tenantId}})).toBe(2)
  })
  it('cria grupos com nome público independente do tema interno da segmentação',async()=>{
    await db.affiliateSegment.update({where:{id:segmentId},data:{name:'Campanha de dezembro',groupName:'Ofertas de Natal'}})
    const port=remote();port.group.mockImplementation(async jid=>({jid,name:jid==='123@g.us'?'Grupo original':'Ofertas de Natal #2',participantCount:jid==='123@g.us'?10:1,description:'Natal para todos',imageUrl:null}))
    await joinAffiliateSegment(db,tenantId,'natal',()=>port)
    expect(port.create).toHaveBeenCalledWith('Ofertas de Natal #2','Natal para todos')
    expect(await db.affiliateGroup.findFirst({where:{tenantId,jid:'456@g.us'}})).toMatchObject({name:'Ofertas de Natal #2'})
  })
  it('falha incerta bloqueia nova criação até reconciliação explícita',async()=>{
    const port=remote();port.group.mockImplementation(async jid=>({jid,name:'Natal #1',participantCount:10,description:'',imageUrl:null}));port.create.mockRejectedValue(new AffiliateProviderError(true))
    await expect(joinAffiliateSegment(db,tenantId,'natal',()=>port)).rejects.toThrow('conferindo')
    await expect(joinAffiliateSegment(db,tenantId,'natal',()=>port)).rejects.toThrow('Outro convite')
    expect(port.create).toHaveBeenCalledOnce()
    await reconcileAffiliateSegment(db,tenantId,actorId,segmentId,{confirmAbsent:true},()=>port)
    expect((await db.affiliateSegment.findUniqueOrThrow({where:{id:segmentId}})).provisionState).toBe('IDLE')
  })
  it('falha de ocupação nunca é interpretada como todos grupos cheios',async()=>{
    const port=remote();port.group.mockRejectedValue(new AffiliateProviderError(false))
    await expect(joinAffiliateSegment(db,tenantId,'natal',()=>port)).rejects.toThrow()
    expect(port.create).not.toHaveBeenCalled()
  })
  it('reconciliação aplica descrição e foto herdadas antes de liberar grupo criado',async()=>{
    await db.affiliateSegment.update({where:{id:segmentId},data:{name:'Campanha interna',groupName:'Ofertas de Natal',provisionState:'UNCERTAIN',description:'',imageUrl:null}})
    const port=remote(),picture='https://cdn.whatsapp.net/group-avatar.jpg'
    port.group.mockImplementation(async jid=>({jid,name:jid==='456@g.us'?'Ofertas de Natal #2':'Natal #1',participantCount:jid==='456@g.us'?1:10,description:jid==='456@g.us'?'':'Descrição original',imageUrl:jid==='456@g.us'?null:picture}))
    await reconcileAffiliateSegment(db,tenantId,actorId,segmentId,{jid:'456@g.us'},()=>port)
    expect(port.describe).toHaveBeenCalledWith('456@g.us','Descrição original')
    expect(port.picture).toHaveBeenCalledWith('456@g.us',picture)
    expect((await db.affiliateGroup.findUniqueOrThrow({where:{tenantId_jid:{tenantId,jid:'456@g.us'}}})).enabled).toBe(true)
  })
})
