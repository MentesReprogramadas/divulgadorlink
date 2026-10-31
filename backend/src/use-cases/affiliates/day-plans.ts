import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AffiliateError, offerMessage } from '@/domain/affiliates/contracts'
import { dayPlanInput, dayPlanSlots, rankDayProducts, selectDayProducts, dayPlanCandidatePool, type DayPlanInput } from '@/domain/affiliates/day-plan'
import { affiliateProductUrl } from '@/domain/affiliates/shopee'
import { suggestDayProductOrder } from '@/adapters/affiliates/openai-day-plan'
import { affiliateDayCandidates, refreshAffiliateCandidate } from './discovery'
import { affiliateEligibleGroupWhere, affiliateGroupFingerprint, approveAffiliateBroadcast } from './deliveries'
import { affiliateRevision, previewScheduledAffiliateProduct, readAffiliateProductPreview } from './product-review'
import { affiliateProductHistory } from './product-history'
import type { DiscoveryProduct } from '@/domain/affiliates/evaluation'
import { affiliateGenerationProviders } from '@/use-cases/@Affiliates/catalog'
import { isShopeeProduct } from '@/domain/affiliates/shopee'
import { sameAffiliateProduct, uniqueAffiliateProducts } from '@/domain/affiliates/product-identity'
import { affiliateProductFitsSegment, isChristmasSegment, christmasProductKind } from '@/domain/affiliates/segment-relevance'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { setTimeout as pause } from 'node:timers/promises'
import { compactAffiliateTitle } from '@/domain/affiliates/product-title'

const groupsSchema=z.array(z.object({id:z.string(),name:z.string()}))
const candidateSchema=z.object({id:z.string(),catalogId:z.string(),title:z.string(),priceCents:z.number().int().positive(),oldPriceCents:z.number().int().positive().nullable(),imageUrl:z.string().nullable(),productUrl:z.string(),checkedAt:z.iso.datetime()}).passthrough()
const contextSchema=z.object({role:z.enum(['CORE','RELATED']),framing:z.enum(['THEME','GIFT','COMPANION']),reason:z.string().min(5).max(300)})
const planContext=(value:Prisma.JsonValue)=>contextSchema.safeParse((value as Record<string,Prisma.JsonValue>)?.planContext)
const snapshotSchema=z.object({previewToken:z.string(),sentCount:z.number().int().nonnegative(),product:candidateSchema,title:z.string(),titleSource:z.enum(['OPENAI','ORIGINAL']).optional(),message:z.string(),affiliateUrl:z.string(),planContext:contextSchema.optional()})
const entryTitle=(value:Prisma.JsonValue)=>{const ready=snapshotSchema.safeParse(value),candidate=candidateSchema.safeParse(value);return ready.success?ready.data.product.title:candidate.success?candidate.data.title:''}
const preparationError=(error:unknown)=>error instanceof AffiliateError||error instanceof AffiliateCatalogError?error.message:error instanceof z.ZodError?'A loja retornou dados incompletos deste produto. Confira o anúncio antes de tentar novamente.':'Não foi possível conferir este produto. Abra o anúncio ou tente novamente mais tarde.'
const json=(value:unknown)=>value as Prisma.InputJsonValue
const lockSegment=async(tx:Prisma.TransactionClient,tenantId:string,segmentId:string)=>{
  await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id = ${segmentId} AND "tenantId" = ${tenantId} FOR UPDATE`
}
const planPorts={candidates:async(db:PrismaClient,tenantId:string,segmentId:string)=>{
  const [products,providers]=await Promise.all([affiliateDayCandidates(db,tenantId,segmentId),affiliateGenerationProviders(db,tenantId)])
  return products.filter(p=>providers[isShopeeProduct(p.id)?'SHOPEE':'MERCADO_LIVRE'])
},order:suggestDayProductOrder,prepare:previewScheduledAffiliateProduct,refresh:refreshAffiliateCandidate}
export type DayPlanPorts=typeof planPorts
async function prepareWithRetry(ports:DayPlanPorts,...args:Parameters<DayPlanPorts['prepare']>){
  for(let attempt=0;;attempt++){
    try{return await ports.prepare(...args)}catch(error){
      if(attempt>=2||!(error instanceof AffiliateCatalogError)||![429,502,503].includes(error.status))throw error
      await pause(attempt?3000:1000)
    }
  }
}

export async function createAffiliateDayPlan(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,raw:DayPlanInput){
  const input=dayPlanInput.parse(raw)
  dayPlanSlots(input,input.itemIds?.length??input.count)
  return db.$transaction(async tx=>{
    await lockSegment(tx,tenantId,segmentId)
    const old=await tx.affiliateScheduleBatch.findUnique({where:{tenantId_idempotencyKey:{tenantId,idempotencyKey:input.idempotencyKey}}})
    if(old){if(old.segmentId!==segmentId||old.actorId!==actorId||JSON.stringify(dayPlanInput.parse(old.config))!==JSON.stringify(input))throw new AffiliateError(409,'Esta solicitação já pertence a outro lote.');return {id:old.id,status:old.status}}
    if(!await tx.affiliateSegment.count({where:{tenantId,id:segmentId,enabled:true}}))throw new AffiliateError(404,'Segmentação ativa não encontrada.')
    const groups=await tx.affiliateGroup.findMany({where:affiliateEligibleGroupWhere(tenantId,segmentId),select:{id:true,name:true},orderBy:{sequence:'asc'}})
    if(!groups.length)throw new AffiliateError(409,'Conecte ao menos um grupo ativo para agendar.')
    if(await tx.affiliateScheduleBatch.count({where:{tenantId,segmentId,status:'BUILDING',expiresAt:{gt:new Date()}}}))throw new AffiliateError(409,'Um lote já está sendo preparado nesta segmentação. Confira a agenda.')
    const batch=await tx.affiliateScheduleBatch.create({data:{tenantId,segmentId,actorId,idempotencyKey:input.idempotencyKey,mode:input.itemIds?'MANUAL':'AUTO',config:json(input),groupHash:affiliateGroupFingerprint(groups),groups:json(groups),expiresAt:new Date(Date.now()+15*60000)}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.schedule.draft',entityType:'AffiliateScheduleBatch',entityId:batch.id,after:{mode:batch.mode,day:input.day}}})
    return {id:batch.id,status:batch.status}
  },{timeout:15000})
}

export async function buildAffiliateDayPlan(db:PrismaClient,scope?:{tenantId:string;id:string},ports=planPorts){
  await db.affiliateScheduleBatch.updateMany({where:{status:'BUILDING',expiresAt:{lte:new Date()},...(scope?{tenantId:scope.tenantId,id:scope.id}:{})},data:{status:'FAILED',error:'A preparação expirou. Gere outro lote.',leaseToken:null,leaseExpiresAt:null}})
  const now=new Date(),where={status:'BUILDING',expiresAt:{gt:now},...(scope?{tenantId:scope.tenantId,id:scope.id}:{}),OR:[{leaseExpiresAt:null},{leaseExpiresAt:{lte:now}}]}
  const batch=await db.affiliateScheduleBatch.findFirst({where,orderBy:{createdAt:'asc'}})
  if(!batch)return 0
  const token=randomUUID(),guard={id:batch.id,tenantId:batch.tenantId,status:'BUILDING',leaseToken:token}
  if(!(await db.affiliateScheduleBatch.updateMany({where:{...where,id:batch.id},data:{leaseToken:token,leaseExpiresAt:new Date(Date.now()+240000)}})).count)return 0
  try{
    const input=dayPlanInput.parse(batch.config),persisted=await db.affiliateScheduledOffer.count({where:{batchId:batch.id,tenantId:batch.tenantId}})
    const segment=await db.affiliateSegment.findFirstOrThrow({where:{id:batch.segmentId,tenantId:batch.tenantId},include:{discovery:{select:{terms:true}}}})
    if(!persisted){
    const available=await ports.candidates(db,batch.tenantId,batch.segmentId)
    const eligible=(input.itemIds?available.filter(p=>input.itemIds!.includes(p.id)&&p.decision!=='DISCARDED'&&!available.some(other=>!!other.pendingCount&&sameAffiliateProduct(p,other))):rankDayProducts(available)).filter(p=>affiliateProductFitsSegment(segment,p.title))
    const order=input.itemIds?[]:await ports.order(dayPlanCandidatePool(eligible),undefined,segment,input.count)
    const selected=input.itemIds?input.itemIds.map(id=>{const product=eligible.find(p=>p.id===id);if(!product)throw new AffiliateError(409,'Um produto selecionado foi descartado ou possui envio pendente. Refaça o lote.');return product}):selectDayProducts(eligible,segment,input.count,order)
    if(input.itemIds&&uniqueAffiliateProducts(selected).length!==selected.length)throw new AffiliateError(409,'Há anúncios do mesmo produto na seleção. Escolha somente uma oferta de cada produto.')
    if(!selected.length)throw new AffiliateError(409,'Nenhuma oferta disponível. Aguarde a coleta ou confira os envios pendentes.')
    const slots=dayPlanSlots(input,selected.length)
    // Persist identities before provider calls so a restarted builder resumes the same draft.
    await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM affiliate_schedule_batches WHERE id = ${batch.id} AND "tenantId" = ${batch.tenantId} FOR UPDATE`
      if(!await tx.affiliateScheduleBatch.count({where:guard}))throw new AffiliateError(409,'Lote cancelado durante a preparação.')
      const existing=await tx.affiliateScheduledOffer.count({where:{batchId:batch.id,tenantId:batch.tenantId}})
      if(!existing){
        await tx.affiliateScheduledOffer.createMany({data:selected.map((p,i)=>({tenantId:batch.tenantId,batchId:batch.id,itemId:p.id,position:i,scheduledAt:slots[i],snapshot:json(p)}))})
        await tx.affiliateScheduleBatch.updateMany({where:guard,data:{source:order.length&&selected.every(p=>'planContext' in p&&order.some(item=>item.id===p.id&&item.context===p.planContext))?'OPENAI':'RULES'}})
      }
    })
    }
    const entries=await db.affiliateScheduledOffer.findMany({where:{batchId:batch.id,tenantId:batch.tenantId,state:'BUILDING'},orderBy:{position:'asc'}})
    for(const entry of entries){
      if(!(await db.affiliateScheduleBatch.updateMany({where:{...guard,expiresAt:{gt:new Date()}},data:{leaseExpiresAt:new Date(Date.now()+240000)}})).count)return 1
        try{
          const context=planContext(entry.snapshot)
          const result=await prepareWithRetry(ports,db,batch.tenantId,batch.actorId,batch.segmentId,entry.itemId,context.success?context.data:undefined)
          if(batch.mode==='AUTO'&&!sameAffiliateProduct({id:'expected',catalogId:'expected',title:entryTitle(entry.snapshot)},{id:'fresh',catalogId:'fresh',title:result.product.title}))throw new AffiliateError(409,'O produto mudou na loja. Refaça o lote para analisar o contexto novamente.')
          const prepared=await db.affiliateScheduledOffer.findMany({where:{batchId:batch.id,tenantId:batch.tenantId,state:'READY'},select:{snapshot:true}})
          if(prepared.some(e=>{const old=snapshotSchema.safeParse(e.snapshot);return old.success&&sameAffiliateProduct(old.data.product,result.product)})){await db.affiliateScheduledOffer.updateMany({where:{id:entry.id,state:'BUILDING',batch:{...guard}},data:{state:'CANCELLED',error:'Outra oferta deste produto já está neste lote.'}});continue}
          const payload=readAffiliateProductPreview(result.previewToken,batch.tenantId,batch.actorId,batch.segmentId)
          if(payload.groupHash!==batch.groupHash)throw new AffiliateError(409,'Os destinos mudaram. Refaça o lote.')
          const previous=entry.snapshot as unknown as DiscoveryProduct
          await db.affiliateScheduledOffer.updateMany({where:{id:entry.id,state:'BUILDING',batch:{...guard}},data:{state:'READY',snapshot:json({previewToken:result.previewToken,product:result.product,title:result.title,titleSource:result.titleSource,message:result.message,affiliateUrl:result.affiliateUrl,sentCount:previous.sentCount??0,...(context.success?{planContext:context.data}:{})})}})
        }catch(error){await db.affiliateScheduledOffer.updateMany({where:{id:entry.id,state:'BUILDING',batch:{...guard}},data:{state:'FAILED',error:preparationError(error)}})}
    }
    if(batch.mode==='AUTO'){
      const prepared=await db.affiliateScheduledOffer.findMany({where:{tenantId:batch.tenantId,batchId:batch.id,state:'READY'},orderBy:{position:'asc'},select:{id:true,snapshot:true}})
      const related=prepared.filter(e=>planContext(e.snapshot).data?.role==='RELATED'),core=prepared.length-related.length
      const remove=related.slice(Math.max(0,core-1))
      if(remove.length)await db.affiliateScheduledOffer.updateMany({where:{tenantId:batch.tenantId,batchId:batch.id,id:{in:remove.map(e=>e.id)},state:'READY',batch:{...guard}},data:{state:'CANCELLED',error:'Preservamos a predominância do tema após falhas na conferência.'}})
    }
    const ready=await db.affiliateScheduledOffer.count({where:{batchId:batch.id,tenantId:batch.tenantId,state:'READY'}})
    await db.affiliateScheduleBatch.updateMany({where:guard,data:{status:ready?'DRAFT':'FAILED',leaseToken:null,leaseExpiresAt:null,error:ready?(ready<input.count?`${ready} de ${input.count} ofertas prontas. Mantivemos a coerência do segmento e a variedade, sem repetir produtos para completar o lote.`:null):'Não foi possível preparar ofertas. Confira as integrações e tente novamente.',expiresAt:new Date(Date.now()+15*60000)}})
  }catch(error){await db.affiliateScheduleBatch.updateMany({where:guard,data:{status:'FAILED',leaseToken:null,leaseExpiresAt:null,error:error instanceof AffiliateError?error.message:'Não foi possível montar o lote. Tente novamente.'}})}
  return 1
}

export async function readAffiliateDayPlan(db:PrismaClient,tenantId:string,segmentId:string,id:string){
  const batch=await db.affiliateScheduleBatch.findFirst({where:{id,tenantId,segmentId},include:{entries:{orderBy:{position:'asc'}}}})
  if(!batch)throw new AffiliateError(404,'Lote não encontrado.')
  const groups=groupsSchema.parse(batch.groups)
  const segment=await db.affiliateSegment.findFirst({where:{id:segmentId,tenantId},include:{discovery:{select:{terms:true}}}})
  if(!segment)throw new AffiliateError(404,'Segmentação não encontrada.')
  const entries=batch.entries.filter(e=>!!e.broadcastId||affiliateProductFitsSegment(segment,entryTitle(e.snapshot))).map(entry=>{
    const snapshot=snapshotSchema.safeParse(entry.snapshot),candidate=candidateSchema.safeParse(entry.snapshot)
    return {id:entry.id,itemId:entry.itemId,position:entry.position,scheduledAt:entry.scheduledAt,state:entry.state,kind:planContext(entry.snapshot).success?(planContext(entry.snapshot).data!.role==='CORE'?'THEME':planContext(entry.snapshot).data!.framing==='GIFT'?'GIFT':'RELATED'):isChristmasSegment(segment)?christmasProductKind(entryTitle(entry.snapshot)):'THEME',error:entry.error,broadcastId:entry.broadcastId,product:snapshot.success?snapshot.data.product:candidate.success?candidate.data:undefined,title:snapshot.success?snapshot.data.title:candidate.success?compactAffiliateTitle(candidate.data.title):'Produto em preparação',titleSource:snapshot.success?snapshot.data.titleSource:undefined,message:snapshot.success?snapshot.data.message:undefined,affiliateUrl:snapshot.success?snapshot.data.affiliateUrl:undefined,sentCount:snapshot.success?snapshot.data.sentCount:0}
  })
  const included=entries.filter(e=>['READY','PENDING','PROCESSING','QUEUED'].includes(e.state))
  const deliveryStates=await db.affiliateDelivery.groupBy({by:['broadcastId','state'],where:{tenantId,broadcastId:{in:batch.entries.flatMap(e=>e.broadcastId?[e.broadcastId]:[])}},_count:true})
  const config=dayPlanInput.parse(batch.config),startOfDay=new Date(config.day+'T00:00:00-03:00'),endOfDay=new Date(startOfDay.getTime()+86400000)
  const [dailyDeliveries,dailyScheduled]=await Promise.all([
    db.affiliateDelivery.groupBy({by:['groupId'],where:{tenantId,groupId:{in:groups.map(g=>g.id)},state:{in:['PENDING','SENDING','SENT','UNCERTAIN']},broadcast:{segmentId,scheduledAt:{gte:startOfDay,lt:endOfDay}}},_count:true}),
    db.affiliateScheduledOffer.findMany({where:{tenantId,batch:{segmentId,status:'APPROVED'},state:{in:['PENDING','PROCESSING']},scheduledAt:{gte:startOfDay,lt:endOfDay}},select:{batch:{select:{groups:true}}}}),
  ])
  const dailyByGroup=groups.map(group=>({...group,messages:(dailyDeliveries.find(d=>d.groupId===group.id)?._count??0)+dailyScheduled.filter(e=>groupsSchema.parse(e.batch.groups).some(g=>g.id===group.id)).length+(batch.status==='DRAFT'?included.length:0)}))
  const intervals=included.slice(1).map((entry,i)=>Math.round((entry.scheduledAt.getTime()-included[i].scheduledAt.getTime())/60000))
  return {id:batch.id,mode:batch.mode,status:batch.status,source:batch.source,config:batch.config,expiresAt:batch.expiresAt,error:batch.error,groups,dailyByGroup,entries:entries.map(e=>({...e,counts:deliveryStates.filter(d=>d.broadcastId===e.broadcastId).map(d=>({state:d.state,count:d._count}))})),summary:{coreOffers:included.filter(e=>e.kind==='THEME').length,relatedOffers:included.filter(e=>e.kind==='GIFT'||e.kind==='RELATED').length,offers:included.length,groups:groups.length,totalMessages:included.length*groups.length,intervalMinutes:intervals.length?Math.min(...intervals):null,maxIntervalMinutes:intervals.length?Math.max(...intervals):null,firstAt:included[0]?.scheduledAt??null,lastAt:included.at(-1)?.scheduledAt??null},createdAt:batch.createdAt}
}

export async function approveAffiliateDayPlan(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,id:string){
  return db.$transaction(async tx=>{
    await lockSegment(tx,tenantId,segmentId)
    await tx.$queryRaw`SELECT id FROM affiliate_schedule_batches WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`
    const batch=await tx.affiliateScheduleBatch.findFirst({where:{id,tenantId,segmentId},include:{entries:true}})
    if(!batch)throw new AffiliateError(404,'Lote não encontrado.')
    if(batch.actorId!==actorId)throw new AffiliateError(403,'Este rascunho pertence a outro administrador.')
    if(batch.status==='APPROVED')return {id,status:batch.status}
    if(batch.status!=='DRAFT'||batch.expiresAt<=new Date())throw new AffiliateError(409,'O rascunho expirou ou não está pronto. Gere outro lote.')
    const segment=await tx.affiliateSegment.findFirst({where:{id:segmentId,tenantId,enabled:true},include:{discovery:{select:{terms:true}}}})
    const groups=await tx.affiliateGroup.findMany({where:affiliateEligibleGroupWhere(tenantId,segmentId),select:{id:true}})
    if(!segment||affiliateGroupFingerprint(groups)!==batch.groupHash)throw new AffiliateError(409,'A segmentação ou os destinos mudaram. Gere outro lote.')
    const outside=batch.entries.filter(e=>!affiliateProductFitsSegment(segment,entryTitle(e.snapshot)))
    const entries=batch.entries.filter(e=>e.state==='READY'&&!outside.some(o=>o.id===e.id))
    if(!entries.length)throw new AffiliateError(409,'Selecione ao menos uma oferta no lote.')
    if(batch.mode==='AUTO'){
      const related=entries.filter(e=>planContext(e.snapshot).data?.role==='RELATED'||!planContext(e.snapshot).success&&isChristmasSegment(segment)&&christmasProductKind(entryTitle(e.snapshot))==='GIFT').length
      if(related&&related>=entries.length-related)throw new AffiliateError(409,'O núcleo do segmento precisa predominar. Remova complementos ou refaça o lote para a IA analisar a composição novamente.')
    }
    if(uniqueAffiliateProducts(entries.map(e=>snapshotSchema.parse(e.snapshot).product)).length!==entries.length)throw new AffiliateError(409,'Este lote contém ofertas do mesmo produto. Refaça o planejamento para variar os produtos.')
    const activeBroadcasts=await tx.affiliateBroadcast.findMany({where:{tenantId,segmentId,deliveries:{some:{state:{in:['PENDING','SENDING','UNCERTAIN']}}}},select:{id:true}})
    const pending=await tx.affiliateScheduledOffer.findMany({where:{tenantId,batch:{segmentId,status:'APPROVED'},OR:[{state:{in:['PENDING','PROCESSING']}},{state:'QUEUED',broadcastId:{in:activeBroadcasts.map(b=>b.id)}}]},select:{snapshot:true}})
    for(const entry of entries){
      const product=snapshotSchema.parse(entry.snapshot).product
      if(pending.some(other=>{const value=snapshotSchema.safeParse(other.snapshot);return value.success&&sameAffiliateProduct(value.data.product,product)}))throw new AffiliateError(409,'Este produto já está em outra agenda pendente. Remova a repetição antes de aceitar.')
      const snapshot=snapshotSchema.parse(entry.snapshot),payload=readAffiliateProductPreview(snapshot.previewToken,tenantId,actorId,segmentId)
      if(entry.scheduledAt<=new Date(Date.now()+60000))throw new AffiliateError(409,'Um horário já passou ou está muito próximo. Gere outro lote com início futuro.')
      if(segment.updatedAt.toISOString()!==payload.segmentRevision||await affiliateRevision(tx,tenantId,entry.itemId)!==payload.affiliateRevision||offerMessage({...payload,note:''})!==payload.message)throw new AffiliateError(409,'A configuração ou a mensagem mudou. Gere outro lote.')
      const [history]=await affiliateProductHistory(tx,tenantId,segmentId,[{...payload,id:entry.itemId,catalogId:entry.itemId,imageUrl:payload.imageUrl??null}])
      if(history.pendingCount)throw new AffiliateError(409,'Uma oferta já tem envio pendente ou incerto. Remova-a ou refaça o lote.')
      if((await tx.affiliateProductDecision.findUnique({where:{tenantId_segmentId_itemId:{tenantId,segmentId,itemId:entry.itemId}}}))?.decision==='DISCARDED')throw new AffiliateError(409,'Uma oferta foi descartada. Refaça o lote.')
    }
    await tx.affiliateScheduledOffer.updateMany({where:{batchId:id,tenantId,id:{in:outside.map(e=>e.id)},state:{in:['READY','BUILDING','FAILED']}},data:{state:'CANCELLED',error:'Produto fora do tema da segmentação.'}})
    await tx.affiliateScheduledOffer.updateMany({where:{batchId:id,tenantId,id:{in:entries.map(e=>e.id)},state:'READY'},data:{state:'PENDING'}})
    await tx.affiliateScheduleBatch.update({where:{id},data:{status:'APPROVED'}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.schedule.approved',entityType:'AffiliateScheduleBatch',entityId:id,after:{offers:entries.length,groups:groups.length}}})
    return {id,status:'APPROVED'}
  },{timeout:20000})
}

export async function retryAffiliateDayPlan(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,id:string,entryId?:string){
  return db.$transaction(async tx=>{
    await lockSegment(tx,tenantId,segmentId)
    await tx.$queryRaw`SELECT id FROM affiliate_schedule_batches WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`
    const batch=await tx.affiliateScheduleBatch.findFirst({where:{id,tenantId,segmentId},include:{entries:true}})
    if(!batch)throw new AffiliateError(404,'Lote não encontrado.')
    if(batch.actorId!==actorId)throw new AffiliateError(403,'Este rascunho pertence a outro administrador.')
    if(batch.status==='BUILDING')return {id,status:batch.status}
    if(!['DRAFT','FAILED'].includes(batch.status))throw new AffiliateError(409,'Confira falhas antes de aceitar o lote. Para ofertas já agendadas, prepare um novo lote.')
    const segment=await tx.affiliateSegment.findFirst({where:{id:segmentId,tenantId,enabled:true},include:{discovery:{select:{terms:true}}}})
    const groups=await tx.affiliateGroup.findMany({where:affiliateEligibleGroupWhere(tenantId,segmentId),select:{id:true}})
    if(!segment||affiliateGroupFingerprint(groups)!==batch.groupHash)throw new AffiliateError(409,'A segmentação ou os destinos mudaram. Gere outro lote.')
    const entries=batch.entries.filter(e=>e.state==='FAILED'&&(!entryId||e.id===entryId)&&affiliateProductFitsSegment(segment,entryTitle(e.snapshot)))
    if(!entries.length)throw new AffiliateError(409,'Nenhuma falha disponível para conferir neste lote.')
    if(entries.some(e=>e.scheduledAt<=new Date(Date.now()+60000)))throw new AffiliateError(409,'O horário desta oferta já passou ou está próximo. Prepare um novo lote com início futuro.')
    await tx.affiliateScheduledOffer.updateMany({where:{tenantId,batchId:id,id:{in:entries.map(e=>e.id)},state:'FAILED',broadcastId:null},data:{state:'BUILDING',error:null}})
    await tx.affiliateScheduleBatch.update({where:{id},data:{status:'BUILDING',error:null,leaseToken:null,leaseExpiresAt:null,expiresAt:new Date(Date.now()+15*60000)}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.schedule.retry',entityType:'AffiliateScheduleBatch',entityId:id,after:{entries:entries.map(e=>e.id)}}})
    return {id,status:'BUILDING'}
  },{timeout:15000})
}

export async function cancelAffiliateDayPlan(db:PrismaClient,tenantId:string,actorId:string,segmentId:string,id:string,entryId?:string){
  return db.$transaction(async tx=>{
    await lockSegment(tx,tenantId,segmentId)
    await tx.$queryRaw`SELECT id FROM affiliate_schedule_batches WHERE id = ${id} AND "tenantId" = ${tenantId} FOR UPDATE`
    const batch=await tx.affiliateScheduleBatch.findFirst({where:{id,tenantId,segmentId},include:{entries:{where:entryId?{id:entryId}:{}}}})
    if(!batch)throw new AffiliateError(404,'Lote não encontrado.')
    if(entryId&&batch.status!=='DRAFT')throw new AffiliateError(409,'Remova itens somente antes de aceitar. Para interromper, cancele as pendências do lote.')
    if(entryId&&!batch.entries.length)throw new AffiliateError(404,'Oferta não encontrada neste lote.')
    await tx.affiliateDelivery.updateMany({where:{tenantId,broadcastId:{in:batch.entries.flatMap(e=>e.broadcastId?[e.broadcastId]:[])},state:'PENDING'},data:{state:'CANCELLED',errorCode:'schedule_cancelled'}})
    await tx.affiliateScheduledOffer.updateMany({where:{tenantId,batchId:id,...(entryId?{id:entryId}:{}),state:{in:['BUILDING','READY','PENDING','PROCESSING']}},data:{state:'CANCELLED',leaseToken:null,leaseExpiresAt:null}})
    if(!entryId)await tx.affiliateScheduleBatch.update({where:{id},data:{status:'CANCELLED',leaseToken:null,leaseExpiresAt:null}})
    await tx.auditLog.create({data:{tenantId,actorId,action:'affiliate.schedule.cancelled',entityType:'AffiliateScheduleBatch',entityId:id,after:{entryId:entryId??null}}})
    return {saved:true}
  })
}

export async function runAffiliateDayPlans(db:PrismaClient,ports=planPorts,scope?:{tenantId:string;batchId:string},now=new Date()){
  const due={...(scope?{tenantId:scope.tenantId,batchId:scope.batchId}:{}),batch:{status:'APPROVED'},scheduledAt:{lte:now},OR:[{state:'PENDING'},{state:'PROCESSING',leaseExpiresAt:{lte:now}}]}
  const entries=await db.affiliateScheduledOffer.findMany({where:due,include:{batch:true},orderBy:{scheduledAt:'asc'},take:3})
  for(const entry of entries){
    const token=randomUUID(),guard={id:entry.id,tenantId:entry.tenantId,state:'PROCESSING',leaseToken:token}
    if(!(await db.affiliateScheduledOffer.updateMany({where:{...due,id:entry.id},data:{state:'PROCESSING',leaseToken:token,leaseExpiresAt:new Date(Date.now()+180000)}})).count)continue
    try{
      if(now.getTime()-entry.scheduledAt.getTime()>30*60000)throw new AffiliateError(409,'Horário passou há mais de 30 minutos. Reagende esta oferta.')
      const snapshot=snapshotSchema.parse(entry.snapshot),payload=readAffiliateProductPreview(snapshot.previewToken,entry.tenantId,entry.batch.actorId,entry.batch.segmentId)
      const earlier=await db.affiliateScheduledOffer.findMany({where:{tenantId:entry.tenantId,batchId:entry.batchId,position:{lt:entry.position},state:{in:['PENDING','PROCESSING','QUEUED']}},select:{snapshot:true}})
      if(earlier.some(e=>{const previous=snapshotSchema.safeParse(e.snapshot);return previous.success&&sameAffiliateProduct(previous.data.product,snapshot.product)}))throw new AffiliateError(409,'Outra oferta deste produto já está na agenda. Escolha um produto diferente.')
      const theme=await db.affiliateSegment.findFirst({where:{id:entry.batch.segmentId,tenantId:entry.tenantId},include:{discovery:{select:{terms:true}}}})
      if(!theme||!affiliateProductFitsSegment(theme,snapshot.product.title))throw new AffiliateError(409,'Produto fora do tema da segmentação. Escolha uma oferta para Pets.')
      const product=await ports.refresh(db,entry.tenantId,{...snapshot.product,sourceTerm:'Agenda',sourcePage:1} as DiscoveryProduct)
      if(product.id!==entry.itemId||product.title!==snapshot.product.title||affiliateProductUrl(product.productUrl).href!==affiliateProductUrl(payload.productUrl).href||product.priceCents!==payload.priceCents||product.oldPriceCents!==payload.oldPriceCents||(product.reportedDiscountPercent??null)!==(payload.reportedDiscountPercent??null)||product.imageUrl!==payload.imageUrl)throw new AffiliateError(409,'Preço, desconto ou anúncio mudou. Revise e agende novamente.')
      if(Date.now()-new Date(product.checkedAt).getTime()>5*60000||new Date(product.checkedAt)>new Date())throw new AffiliateError(409,'Não foi possível confirmar um preço recente. Revise e agende novamente.')
      await db.$transaction(async tx=>{
        await lockSegment(tx,entry.tenantId,entry.batch.segmentId)
        await tx.$queryRaw`SELECT id FROM affiliate_schedule_batches WHERE id = ${entry.batchId} AND "tenantId" = ${entry.tenantId} FOR UPDATE`
        if(!await tx.affiliateScheduledOffer.count({where:{...guard,batch:{status:'APPROVED'}}}))return
        const segment=await tx.affiliateSegment.findFirst({where:{tenantId:entry.tenantId,id:entry.batch.segmentId,enabled:true}})
        if(!segment||segment.updatedAt.toISOString()!==payload.segmentRevision||await affiliateRevision(tx,entry.tenantId,entry.itemId)!==payload.affiliateRevision)throw new AffiliateError(409,'A segmentação ou a conta de afiliados mudou. Revise o lote.')
        if(!await tx.user.count({where:{id:entry.batch.actorId,tenantId:entry.tenantId,role:'ADMIN',status:'ACTIVE'}}))throw new AffiliateError(403,'O administrador responsável não está ativo. Revise o lote.')
        if((await tx.affiliateProductDecision.findUnique({where:{tenantId_segmentId_itemId:{tenantId:entry.tenantId,segmentId:entry.batch.segmentId,itemId:entry.itemId}}}))?.decision==='DISCARDED')throw new AffiliateError(409,'Oferta descartada depois do agendamento.')
        if(offerMessage({...payload,note:''})!==payload.message)throw new AffiliateError(409,'O formato da mensagem mudou. Revise o lote.')
        const existing=await tx.affiliateBroadcast.findUnique({where:{tenantId_idempotencyKey:{tenantId:entry.tenantId,idempotencyKey:`schedule:${entry.id}`}}})
        if(existing){await tx.affiliateScheduledOffer.updateMany({where:guard,data:{state:'QUEUED',broadcastId:existing.id,leaseToken:null,leaseExpiresAt:null}});return}
        const offer=await tx.affiliateOffer.create({data:{tenantId:entry.tenantId,segmentId:entry.batch.segmentId,itemId:entry.itemId,title:payload.title,productUrl:payload.productUrl,affiliateUrl:payload.affiliateUrl,priceCents:payload.priceCents,oldPriceCents:payload.oldPriceCents,reportedDiscountPercent:payload.reportedDiscountPercent??null,oldPriceEstimated:payload.oldPriceEstimated??false,imageUrl:payload.imageUrl,checkedAt:new Date(product.checkedAt),expiresAt:new Date(entry.scheduledAt.getTime()+30*60000)}})
        const broadcast=await approveAffiliateBroadcast(tx,entry.tenantId,entry.batch.actorId,offer.id,{idempotencyKey:`schedule:${entry.id}`,expectedGroupHash:entry.batch.groupHash,approvedMessage:payload.message,sourceTitle:snapshot.product.title})
        const decision={decision:'SENT',reason:'Envio de lote agendado aprovado.',actorId:entry.batch.actorId,broadcastId:broadcast.id,priceCents:payload.priceCents}
        await tx.affiliateProductDecision.upsert({where:{tenantId_segmentId_itemId:{tenantId:entry.tenantId,segmentId:entry.batch.segmentId,itemId:entry.itemId}},create:{tenantId:entry.tenantId,segmentId:entry.batch.segmentId,itemId:entry.itemId,...decision},update:decision})
        await tx.affiliateScheduledOffer.updateMany({where:guard,data:{state:'QUEUED',broadcastId:broadcast.id,leaseToken:null,leaseExpiresAt:null}})
      },{timeout:15000})
    }catch(error){await db.affiliateScheduledOffer.updateMany({where:guard,data:{state:'FAILED',error:error instanceof AffiliateError?error.message:'Não foi possível reconferir o produto. Revise e agende novamente.',leaseToken:null,leaseExpiresAt:null}})}
  }
  return entries.length
}
