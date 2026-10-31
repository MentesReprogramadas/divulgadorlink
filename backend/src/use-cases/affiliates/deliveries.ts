import type { Prisma, PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { AffiliateError, offerIsCurrent, offerMessage } from '@/domain/affiliates/contracts'
import { AffiliateProviderError, type AffiliateWhatsApp } from '@/adapters/affiliates/evolution'
import { affiliateEvolution } from './instances'

export async function scheduleAffiliateBroadcast(db:PrismaClient,tenantId:string,actorId:string,offerId:string,input:{idempotencyKey:string;scheduledAt?:string}) {
  return db.$transaction(tx => approveAffiliateBroadcast(tx,tenantId,actorId,offerId,input))
}

export const affiliateEligibleGroupWhere=(tenantId:string,segmentId:string):Prisma.AffiliateGroupWhereInput=>({tenantId,segmentId,enabled:true,OR:[{segment:{instanceLinks:{some:{instance:{enabled:true}}}}},{segment:{instanceLinks:{none:{}}},instance:{enabled:true}}]})
export const affiliateGroupFingerprint=(groups:Array<{id:string}>)=>createHash('sha256').update(groups.map(group=>group.id).sort().join(',')).digest('hex')

export async function approveAffiliateBroadcast(tx:Prisma.TransactionClient,tenantId:string,actorId:string,offerId:string,input:{idempotencyKey:string;scheduledAt?:string;expectedGroupHash?:string;approvedMessage?:string}) {
    await tx.$queryRaw`SELECT id FROM affiliate_offers WHERE id = ${offerId} AND "tenantId" = ${tenantId} FOR UPDATE`
    const old = await tx.affiliateBroadcast.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:input.idempotencyKey}}})
    if (old) {if(old.offerId !== offerId) throw new AffiliateError(409,'Esta chave já pertence a outra oferta.');return old}
    const offer = await tx.affiliateOffer.findFirst({where:{id:offerId,tenantId},include:{segment:true}})
    const now = new Date(),scheduledAt = input.scheduledAt ? new Date(input.scheduledAt):now
    if (!offer) throw new AffiliateError(404,'Oferta não encontrada.')
    if (!offer.segment.enabled || !offerIsCurrent(offer,now)) throw new AffiliateError(409,'Oferta pausada, vencida ou com preço sem revisão há mais de 24 horas.')
    if (scheduledAt < new Date(now.getTime()-60_000) || scheduledAt > new Date(now.getTime()+24*60*60_000) || (offer.expiresAt && scheduledAt >= offer.expiresAt)) throw new AffiliateError(400,'Agende dentro das próximas 24 horas e da validade da oferta.')
    const active = await tx.affiliateDelivery.findFirst({where:{tenantId,broadcast:{offerId},state:{in:['PENDING','SENDING','UNCERTAIN']}}})
    if (active) throw new AffiliateError(409,'Esta oferta já possui uma distribuição em andamento ou incerta.')
    const groups = await tx.affiliateGroup.findMany({where:affiliateEligibleGroupWhere(tenantId,offer.segmentId)})
    if(input.expectedGroupHash && affiliateGroupFingerprint(groups)!==input.expectedGroupHash) throw new AffiliateError(409,'Os grupos de destino mudaram. Atualize a prévia para revisar os destinatários.')
    if (!groups.length) throw new AffiliateError(409,'Conecte ao menos um grupo ativo à segmentação.')
    // product-review validates approvedMessage against its signed preview before entering this function.
    const broadcast = await tx.affiliateBroadcast.create({data:{tenantId,segmentId:offer.segmentId,offerId,idempotencyKey:input.idempotencyKey,message:input.approvedMessage??offerMessage(offer),offerUpdatedAt:offer.updatedAt,imageUrl:offer.imageUrl,productSnapshot:{itemId:offer.itemId,productUrl:offer.productUrl,checkedAt:offer.checkedAt.toISOString(),title:offer.title,priceCents:offer.priceCents,oldPriceCents:offer.oldPriceCents,reportedDiscountPercent:offer.reportedDiscountPercent,oldPriceEstimated:offer.oldPriceEstimated,imageUrl:offer.imageUrl,affiliateUrl:offer.affiliateUrl},scheduledAt}})
    await tx.affiliateDelivery.createMany({data:groups.map(group=>({tenantId,broadcastId:broadcast.id,groupId:group.id,nextAttemptAt:scheduledAt}))})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.broadcast.approved',entityType:'AffiliateBroadcast',entityId:broadcast.id,after:{groups:groups.length,scheduledAt:scheduledAt.toISOString()}}})
    return broadcast
}

export async function runAffiliateDeliveries(db:PrismaClient,ports?: (instance:Parameters<typeof affiliateEvolution>[0])=>AffiliateWhatsApp,now = new Date(),scope?:{tenantId:string;broadcastId:string}) {
  await db.affiliateDelivery.updateMany({where:{...(scope?{tenantId:scope.tenantId,broadcastId:scope.broadcastId}:{}),state:'SENDING',lockedAt:{lt:new Date(now.getTime()-120_000)}},data:{state:'UNCERTAIN',errorCode:'worker_interrupted'}})
  const pending = {enabled:true,segment:{enabled:true},deliveries:{some:{state:'PENDING',nextAttemptAt:{lte:now},...(scope?{tenantId:scope.tenantId,broadcastId:scope.broadcastId}:{})}}} satisfies Prisma.AffiliateGroupWhereInput
  const instances = await db.affiliateInstance.findMany({where:{...(scope?{tenantId:scope.tenantId}:{}),enabled:true,nextSendAt:{lte:now},OR:[{segmentLinks:{some:{segment:{enabled:true,groups:{some:pending}}}}},{groups:{some:{...pending,segment:{enabled:true,instanceLinks:{none:{}}}}}}]},orderBy:[{nextSendAt:'asc'},{id:'asc'}],take:20})
  const unavailable = new Set<string>()
  let attempted = 0
  // Select after each attempt so two healthy accounts distribute distinct destinations.
  for (const instance of instances) {
    const routing = {OR:[{segment:{instanceLinks:{some:{instanceId:instance.id}}}},{instanceId:instance.id,segment:{instanceLinks:{none:{}}}}]} satisfies Prisma.AffiliateGroupWhereInput
    const row = await db.affiliateDelivery.findFirst({where:{tenantId:instance.tenantId,...(scope?{broadcastId:scope.broadcastId}:{}),state:'PENDING',nextAttemptAt:{lte:now},group:{enabled:true,segment:{enabled:true},...routing}},orderBy:{nextAttemptAt:'asc'},include:{group:{include:{segment:true}},broadcast:{include:{offer:true}}}})
    if (!row) continue
    attempted++
    const {group,broadcast} = row
    if (!offerIsCurrent(broadcast.offer,now) || broadcast.offerUpdatedAt.getTime() !== broadcast.offer.updatedAt.getTime()) {await db.affiliateDelivery.updateMany({where:{id:row.id,state:'PENDING'},data:{state:'FAILED',errorCode:'offer_expired_or_changed'}});continue}
    const leaseAt = new Date(),leaseUntil = new Date(leaseAt.getTime()+55_000)
    const lease = await db.affiliateInstance.updateMany({where:{id:instance.id,tenantId:row.tenantId,enabled:true,nextSendAt:{lte:leaseAt}},data:{nextSendAt:leaseUntil}})
    if (!lease.count) continue
    try {
      let whatsapp:AffiliateWhatsApp
      try {
        whatsapp = ports?.(instance) ?? affiliateEvolution(instance)
        if (whatsapp.status && (await whatsapp.status()).state!=='open') throw new AffiliateError(503,'Conexão indisponível.')
        await whatsapp.group(group.jid)
      } catch {unavailable.add(row.id);continue}
      const sendAt = new Date()
      const claimed = await db.affiliateDelivery.updateMany({where:{id:row.id,state:'PENDING',group:{enabled:true,segment:{enabled:true},...routing},broadcast:{offer:{status:'DRAFT',updatedAt:broadcast.offerUpdatedAt,checkedAt:{gte:new Date(sendAt.getTime()-24*60*60_000),lte:sendAt},OR:[{expiresAt:null},{expiresAt:{gt:sendAt}}]}}},data:{state:'SENDING',lockedAt:sendAt,errorCode:null,sentViaInstanceId:instance.id}})
      if (!claimed.count) continue
      if (!await db.affiliateInstance.count({where:{id:instance.id,tenantId:row.tenantId,enabled:true}})) {
        await db.affiliateDelivery.updateMany({where:{id:row.id,state:'SENDING',lockedAt:sendAt},data:{state:'PENDING',lockedAt:null,sentViaInstanceId:null,errorCode:'connection_unavailable',nextAttemptAt:new Date(now.getTime()+60_000)}})
        continue
      }
      try {
        const providerMessageId = await whatsapp.send(group.jid,broadcast.message,broadcast.imageUrl)
        await db.affiliateDelivery.updateMany({where:{id:row.id,state:'SENDING'},data:{state:'SENT',providerMessageId,errorCode:null}})
      } catch (error) {
        const uncertain = !(error instanceof AffiliateProviderError) || error.uncertain
        await db.affiliateDelivery.updateMany({where:{id:row.id,state:'SENDING'},data:{state:uncertain?'UNCERTAIN':'FAILED',errorCode:uncertain?'provider_response_uncertain':'provider_rejected'}})
      }
      await db.affiliateSegmentInstance.updateMany({where:{tenantId:row.tenantId,segmentId:group.segmentId,instanceId:instance.id},data:{lastUsedAt:sendAt}})
    } finally {
      await db.affiliateInstance.updateMany({where:{id:instance.id,tenantId:row.tenantId,nextSendAt:leaseUntil},data:{nextSendAt:new Date(Date.now()+3000)}})
    }
  }
  // A second account can recover a failed preflight in this run, before any send occurred.
  if(unavailable.size) await db.affiliateDelivery.updateMany({where:{id:{in:[...unavailable]},state:'PENDING'},data:{errorCode:'connection_unavailable',nextAttemptAt:new Date(now.getTime()+60_000)}})
  return attempted
}

const activeDrains = new WeakSet<PrismaClient>()
export async function requestAffiliateDeliveryDrain(db:PrismaClient,scope?:{tenantId:string;broadcastId:string}) {
  if(activeDrains.has(db)) return 0
  activeDrains.add(db)
  try { return await runAffiliateDeliveries(db,undefined,new Date(),scope) } finally {activeDrains.delete(db)}
}

export async function resolveAffiliateDelivery(db:PrismaClient,tenantId:string,actorId:string,id:string,input:{resolution:'SENT'|'RETRY';confirmUncertain:boolean;providerMessageId?:string}) {
  return db.$transaction(async tx => {
    const initial = await tx.affiliateDelivery.findFirst({where:{id,tenantId},include:{broadcast:{select:{offerId:true}}}})
    if (!initial) throw new AffiliateError(409,'Entrega indisponível para resolução.')
    // Approval and retry share this lock so an older failed delivery cannot race a new distribution.
    await tx.$queryRaw`SELECT id FROM affiliate_offers WHERE id = ${initial.broadcast.offerId} AND "tenantId" = ${tenantId} FOR UPDATE`
    const row = await tx.affiliateDelivery.findFirst({where:{id,tenantId}})
    if (!row || !['UNCERTAIN','FAILED'].includes(row.state)) throw new AffiliateError(409,'Entrega indisponível para resolução.')
    if (row.state === 'UNCERTAIN' && !input.confirmUncertain) throw new AffiliateError(409,'Confira no grupo e confirme a resolução da entrega incerta.')
    if (input.resolution==='RETRY' && await tx.affiliateDelivery.count({where:{tenantId,id:{not:id},groupId:row.groupId,broadcast:{offerId:initial.broadcast.offerId},state:{in:['PENDING','SENDING','UNCERTAIN']}}})) throw new AffiliateError(409,'Outra distribuição desta oferta já está ativa para este grupo. Confira o histórico antes de tentar novamente.')
    const changed = await tx.affiliateDelivery.updateMany({where:{id,tenantId,state:row.state,updatedAt:row.updatedAt},data:{state:input.resolution==='SENT'?'SENT':'PENDING',providerMessageId:input.providerMessageId ?? null,...(input.resolution==='RETRY'?{sentViaInstanceId:null}:{}),errorCode:null,lockedAt:null,nextAttemptAt:new Date()}})
    if (!changed.count) throw new AffiliateError(409,'Outra operação já resolveu esta entrega.')
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.delivery.resolved',entityType:'AffiliateDelivery',entityId:id,after:{previousState:row.state,resolution:input.resolution,confirmed:input.confirmUncertain}}})
    return {saved:true}
  })
}
