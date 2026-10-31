import { runAffiliateDiscovery } from '@/use-cases/affiliates/discovery'
import { readAffiliateGroupPolicy, saveAffiliateGroupPolicy } from '@/use-cases/affiliates/group-policy'
import { groupPolicyInput } from '@/domain/affiliates/group-policy'
import { affiliateSegmentGroupPolicyDefaults, readAffiliateGroupPolicyDefaults, saveAffiliateGroupPolicyDefaults } from '@/use-cases/affiliates/group-policy-defaults'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { env } from '@/env'
import { AffiliateError, entityId, groupJid, offerInput, segmentInput } from '@/domain/affiliates/contracts'
import { sealWebhookSecret } from '@/lib/webhook-secret'
import { normalizeTenantHost, resolveTenant } from '@/http/tenant'
import { AffiliateProviderError } from '@/adapters/affiliates/evolution'
import { affiliateEvolution, affiliateInviteEvolution, publicInstance } from '@/use-cases/affiliates/instances'
import { assertAffiliateImage } from '@/use-cases/affiliates/images'
import { scheduleAffiliateBroadcast, resolveAffiliateDelivery, requestAffiliateDeliveryDrain } from '@/use-cases/affiliates/deliveries'
import { joinAffiliateSegment, prepareFirstAffiliateGroup, reconcileAffiliateSegment } from '@/use-cases/affiliates/invitations'
import { resolveAffiliateInviteDestination } from '@/use-cases/affiliates/invite-destination'
import { requireAffiliateAdmin } from './affiliate-access'
import { affiliateImageId } from '@/domain/affiliates/image'
import { ProfileError } from '@/domain/profiles/profile'
import { ResourceNotFoundError } from '@/use-cases/errors/resource-not-found-error'
import { readAccessUser } from '@/http/middlewares/verify-jwt'
import { measurementTrafficAllowed } from '@/domain/analytics/measurement-policy'
import { recordInviteEvent, type InviteEventKind } from '@/use-cases/affiliates/invite-metrics'
import sharp from 'sharp'
import { createHash } from 'node:crypto'

const prefix = '/admin/affiliates'
const idParam = z.object({id:entityId})
const inviteEventInput = z.object({eventId:z.uuid()}).strict()
async function captureInviteEvent(q:FastifyRequest,tenantId:string,slug:string,eventId:string|undefined,kind:InviteEventKind) {
  if(!eventId || q.supportSession || q.workspaceActor || !measurementTrafficAllowed({userAgent:q.headers['user-agent'],dnt:q.headers.dnt as string|undefined,gpc:q.headers['sec-gpc'] as string|undefined,testTraffic:(q.headers['x-test-traffic']??q.headers['x-analytics-test']) as string|undefined})) return
  try {
    const user=await readAccessUser(q)
    if(user?.tenantId===tenantId && await prisma.user.count({where:{id:user.sub,tenantId,role:'ADMIN'}})) return
    const segment=await prisma.affiliateSegment.findFirst({where:{tenantId,slug,enabled:true},select:{id:true}})
    if(segment) await recordInviteEvent(prisma,tenantId,segment.id,eventId,kind)
  } catch {q.log.warn({event:'affiliate.invite.measurement.failed'},'Falha ao contar acesso ao convite')}
}
async function run(q:FastifyRequest,r:FastifyReply,work:(tenantId:string,actorId:string)=>Promise<unknown>,publicRoute=false,publicTenantHost?:string) {
  r.header('cache-control','private, no-store').header('x-robots-tag','noindex, nofollow')
  try {
    const tenant = publicRoute ? await resolveTenant(normalizeTenantHost(publicTenantHost ?? q.headers.host ?? '')):await requireAffiliateAdmin(q,r)
    if (!tenant) return
    return await work(tenant.id,publicRoute?'':q.user.sub)
  } catch(error) {
    const status = error instanceof AffiliateError || error instanceof ProfileError ? error.status : error instanceof ResourceNotFoundError ? 404 : error instanceof z.ZodError ? 400 : error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2025','P2034'].includes(error.code) ? 409:500
    if(status===500) q.log.error({event:'affiliate.operation.failed'},'Falha na operação de afiliados')
    return r.code(status).send({message:error instanceof AffiliateError || error instanceof ProfileError ? error.message: status===400?'Confira os campos informados.':status===409?'O registro já existe ou foi alterado. Atualize a página.':status===404?'Recurso não encontrado.':'Não foi possível concluir a operação.'})
  }
}
async function audit(tx:Prisma.TransactionClient,tenantId:string,actorId:string,action:string,id:string) {
  await tx.auditLog.create({data:{tenantId,actorId,action:`affiliate.${action}`,entityType:'Affiliate',entityId:id}})
}
async function instanceFor(db:PrismaClient,tenantId:string,id:string) {
  const row = await db.affiliateInstance.findFirst({where:{id,tenantId}})
  if(!row) throw new AffiliateError(404,'Instância não encontrada.')
  return row
}
async function segmentInstances(tenantId:string,ids:string[],checkConnection:boolean) {
  const rows=await prisma.affiliateInstance.findMany({where:{tenantId,id:{in:ids},enabled:true}})
  if(rows.length!==ids.length) throw new AffiliateError(400,'Selecione conexões ativas desta conta.')
  if(checkConnection) await Promise.all(rows.map(async row=>{
    if((await affiliateEvolution(row).status()).state!=='open') throw new AffiliateError(409,`Conecte o WhatsApp de ${row.name} antes de finalizar a segmentação.`)
  }))
  return rows
}
async function affiliateSnapshot(tenantId:string,segmentId?:string) {
  const segments=await prisma.affiliateSegment.findMany({where:{tenantId,...(segmentId?{id:segmentId}:{})},orderBy:{createdAt:'desc'},take:segmentId?1:200,include:{inviteMetrics:true,_count:{select:{groups:true,offers:true}},instance:{select:{id:true,name:true}},instanceLinks:{include:{instance:{select:{id:true,name:true,enabled:true}}}}}})
  if(segmentId&&!segments.length) throw new AffiliateError(404,'Segmentação não encontrada.')
  const instanceIds=[...new Set(segments.flatMap(segment=>segment.instanceLinks.length?segment.instanceLinks.map(link=>link.instanceId):segment.instanceId?[segment.instanceId]:[]))]
  const scope={tenantId,...(segmentId?{segmentId}:{})},instanceScope={tenantId,...(segmentId?{id:{in:instanceIds}}:{})}
  const deliveryScope:Prisma.AffiliateDeliveryWhereInput={tenantId,...(segmentId?{broadcast:{segmentId}}:{})}
  const now=new Date(),currentOffer:Prisma.AffiliateOfferWhereInput={...scope,status:'DRAFT',checkedAt:{gte:new Date(now.getTime()-24*60*60_000),lte:now},OR:[{expiresAt:null},{expiresAt:{gt:now}}]}
  const [instances,groups,offers,broadcasts,deliveries,states,totals,readiness,nextOffer]=await Promise.all([
    prisma.affiliateInstance.findMany({where:instanceScope,orderBy:{createdAt:'desc'},take:200}),
    prisma.affiliateGroup.findMany({where:scope,orderBy:{createdAt:'desc'},take:500,include:{segment:{select:{id:true,name:true}},instance:{select:{id:true,name:true}}}}),
    prisma.affiliateOffer.findMany({where:scope,orderBy:{createdAt:'desc'},take:200,include:{segment:{select:{id:true,name:true}}}}),
    prisma.affiliateBroadcast.findMany({where:scope,orderBy:{createdAt:'desc'},take:100,include:{offer:{select:{id:true,title:true}},_count:{select:{deliveries:true}}}}),
    prisma.affiliateDelivery.findMany({where:deliveryScope,orderBy:{createdAt:'desc'},take:200,include:{group:{select:{id:true,name:true,jid:true}},broadcast:{select:{id:true,message:true,offer:{select:{id:true,title:true}}}}}}),
    prisma.affiliateDelivery.groupBy({by:['state'],where:deliveryScope,_count:true}),
    Promise.all([prisma.affiliateSegment.count({where:{tenantId,...(segmentId?{id:segmentId}:{})}}),prisma.affiliateGroup.count({where:scope}),prisma.affiliateInstance.count({where:instanceScope}),prisma.affiliateOffer.count({where:scope})]),
    Promise.all([prisma.affiliateGroup.count({where:{...scope,enabled:true}}),prisma.affiliateOffer.count({where:currentOffer}),prisma.affiliateDelivery.count({where:{...deliveryScope,state:{in:['PENDING','SENDING','SENT','UNCERTAIN']}}})]),
    prisma.affiliateOffer.findFirst({where:{...currentOffer,broadcasts:{none:{deliveries:{some:{state:{in:['PENDING','SENDING','SENT','UNCERTAIN']}}}}}},orderBy:{createdAt:'desc'},include:{segment:{select:{id:true,name:true}}}}),
  ])
  const count=(state:string)=>states.find(row=>row.state===state)?._count??0
  return {segments:segments.map(({instanceLinks,...segment})=>({...segment,instanceIds:instanceLinks.length?instanceLinks.map(link=>link.instanceId):segment.instanceId?[segment.instanceId]:[],instances:instanceLinks.map(link=>link.instance)})),instances:instances.map(publicInstance),groups,offers,broadcasts,deliveries,summary:{segments:totals[0],groups:totals[1],instances:totals[2],offers:totals[3],pending:count('PENDING')+count('SENDING'),sent:count('SENT'),uncertain:count('UNCERTAIN'),failed:count('FAILED')},readiness:{activeGroups:readiness[0],currentOffers:readiness[1],approvedDeliveries:readiness[2],nextOffer},limits:{segments:segmentId?1:200,instances:200,groups:500,offers:200,broadcasts:100,deliveries:200}}
}
export async function registerAffiliateRoutes(app:FastifyInstance) {
  app.get(prefix+'/group-policy-defaults',(q,r)=>run(q,r,async tenantId=>{const policy=await readAffiliateGroupPolicyDefaults(prisma,tenantId);return {configured:policy!==null,policy}}))
  app.put(prefix+'/group-policy-defaults',(q,r)=>run(q,r,(tenantId,actorId)=>saveAffiliateGroupPolicyDefaults(prisma,tenantId,actorId,groupPolicyInput.parse(q.body))))
  app.get(prefix+'/deliveries',(q,r)=>run(q,r,async tenantId=>{
    const query=z.object({state:z.enum(['UNCERTAIN','FAILED','PENDING','SENDING','SENT']).optional(),segmentId:entityId.optional(),cursor:entityId.optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict().parse(q.query)
    if(query.segmentId&&!await prisma.affiliateSegment.count({where:{tenantId,id:query.segmentId}})) throw new AffiliateError(404,'Segmentação não encontrada.')
    const scope:Prisma.AffiliateDeliveryWhereInput={tenantId,...(query.segmentId?{broadcast:{segmentId:query.segmentId}}:{})}
    const cursor=query.cursor?await prisma.affiliateDelivery.findFirst({where:{...scope,id:query.cursor},select:{id:true,createdAt:true}}):null
    if(query.cursor&&!cursor) throw new AffiliateError(400,'Cursor inválido.')
    const rows=await prisma.affiliateDelivery.findMany({where:{...scope,...(query.state?{state:query.state}:{}),...(cursor?{OR:[{createdAt:{lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:query.limit+1,include:{group:{select:{id:true,name:true,jid:true}},broadcast:{select:{id:true,message:true,offer:{select:{id:true,title:true}}}}}})
    return {deliveries:rows.slice(0,query.limit),nextCursor:rows.length>query.limit?rows[query.limit-1]!.id:null}
  }))
  app.get(prefix,(q,r)=>run(q,r,tenantId=>affiliateSnapshot(tenantId)))
  app.get(prefix+'/segments/:id',(q,r)=>run(q,r,tenantId=>affiliateSnapshot(tenantId,idParam.parse(q.params).id)))
  app.get(prefix+'/segments/:id/group-policy',(q,r)=>run(q,r,tenantId=>readAffiliateGroupPolicy(prisma,tenantId,idParam.parse(q.params).id)))
  app.put(prefix+'/segments/:id/group-policy',(q,r)=>run(q,r,(tenantId,actorId)=>saveAffiliateGroupPolicy(prisma,tenantId,actorId,idParam.parse(q.params).id,groupPolicyInput.parse(q.body))))
  app.post(prefix+'/segments/:id/prepare-group',(q,r)=>run(q,r,(tenantId,actorId)=>{
    z.object({}).strict().parse(q.body)
    return prepareFirstAffiliateGroup(prisma,tenantId,actorId,idParam.parse(q.params).id)
  }))
  app.post(prefix+'/instances',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const body = z.object({name:z.string().trim().regex(/^[\p{L}\p{N} _.-]{2,80}$/u),apiKey:z.string().min(8).max(1000).optional(),ownerPhone:z.string().regex(/^\d{10,15}$/).optional()}).strict().parse(q.body)
    if (!body.apiKey && (await prisma.tenant.findUnique({where:{id:tenantId}}))?.host !== env.TENANT_HOST) throw new AffiliateError(403,'Informe a chave específica desta instância.')
    const apiKey = body.apiKey ?? env.AFFILIATE_EVOLUTION_API_KEY
    if (!apiKey) throw new AffiliateError(503,'Configure a chave Evolution para afiliados ou informe a chave da instância.')
    const secret = sealWebhookSecret(apiKey,env.WEBHOOK_ENCRYPTION_KEY,`affiliate-instance:${tenantId}:${body.name}`)
    return prisma.$transaction(async tx=>{
      const row = await tx.affiliateInstance.create({data:{tenantId,name:body.name,ownerPhone:body.ownerPhone,secret}})
      await audit(tx,tenantId,actorId,'instance.created',row.id)
      return publicInstance(row)
    })
  }))
  app.patch(prefix+'/instances/:id',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const {id}=idParam.parse(q.params),body=z.object({enabled:z.boolean().optional(),ownerPhone:z.string().regex(/^\d{10,15}$/).optional(),apiKey:z.string().min(8).max(1000).optional()}).strict().parse(q.body)
    const instance=await instanceFor(prisma,tenantId,id)
    return prisma.$transaction(async tx=>{
      const {apiKey,...rest}=body
      await tx.affiliateInstance.updateMany({where:{id,tenantId},data:{...rest,...(apiKey?{secret:sealWebhookSecret(apiKey,env.WEBHOOK_ENCRYPTION_KEY,`affiliate-instance:${tenantId}:${instance.name}`)}:{})}})
      await audit(tx,tenantId,actorId,'instance.updated',id)
      return {saved:true}
    })
  }))
  app.get(prefix+'/instances/:id/status',(q,r)=>run(q,r,async tenantId=>affiliateEvolution(await instanceFor(prisma,tenantId,idParam.parse(q.params).id)).status()))
  app.post(prefix+'/instances/:id/connect',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const instance=await instanceFor(prisma,tenantId,idParam.parse(q.params).id),remote=affiliateEvolution(instance)
    if (!instance.enabled) throw new AffiliateError(409,'Ative a instância antes de conectar.')
    try {await remote.status()} catch(error) {if(error instanceof AffiliateProviderError && error.providerStatus===404) await remote.createInstance();else throw error}
    await prisma.auditLog.create({data:{tenantId,actorId,action:'affiliate.instance.connect',entityType:'AffiliateInstance',entityId:instance.id}})
    return remote.connect()
  }))
  app.get(prefix+'/instances/:id/groups',(q,r)=>run(q,r,async tenantId=>({groups:await affiliateEvolution(await instanceFor(prisma,tenantId,idParam.parse(q.params).id)).groups()})))
  app.post(prefix+'/instances/:id/sync',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const instance=await instanceFor(prisma,tenantId,idParam.parse(q.params).id),groups=await affiliateEvolution(instance).groups()
    let synced=0
    await prisma.$transaction(async tx=>{
      for(const group of groups) {const result=await tx.affiliateGroup.updateMany({where:{tenantId,instanceId:instance.id,jid:group.jid},data:{name:group.name,participantCount:group.participantCount,syncedAt:new Date()}});synced+=result.count}
      await audit(tx,tenantId,actorId,'instance.synced',instance.id)
    })
    return {synced}
  }))
  app.post(prefix+'/segments',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const body=segmentInput.parse(q.body)
    const {instanceIds,...data}=body,ids=instanceIds ?? (body.instanceId?[body.instanceId]:[])
    if(!ids.length) throw new AffiliateError(400,'Conecte ao menos um WhatsApp antes de criar a segmentação.')
    const connections=await segmentInstances(tenantId,ids,true)
    if(body.autoExpand && !connections.some(row=>row.ownerPhone)) throw new AffiliateError(400,'Informe o WhatsApp do participante inicial em ao menos uma conexão para criar grupos automaticamente.')
    await assertAffiliateImage(prisma,tenantId,body.imageUrl)
    const created=await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
      const defaults=await affiliateSegmentGroupPolicyDefaults(tx,tenantId)
      const row=await tx.affiliateSegment.create({data:{tenantId,...data,...defaults,groupName:body.groupName ?? body.name,instanceId:ids[0]}})
      await tx.affiliateSegmentInstance.createMany({data:ids.map(instanceId=>({tenantId,segmentId:row.id,instanceId}))})
      await tx.affiliateDiscovery.create({data:{tenantId,segmentId:row.id,enabled:row.enabled,status:row.enabled?'QUEUED':'PAUSED'}})
      await audit(tx,tenantId,actorId,'segment.created',row.id)
      return {...row,instanceIds:ids}
    })
    if(created.enabled)void runAffiliateDiscovery(prisma,undefined,undefined,{tenantId,segmentId:created.id}).catch(()=>q.log.error({event:'affiliate.discovery.failed'},'Falha ao iniciar sugestões da segmentação'))
    return created
  }))
  app.patch(prefix+'/segments/:id',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const {id}=idParam.parse(q.params),body=segmentInput.partial().parse(q.body)
    const {instanceIds,...data}=body,ids=instanceIds ?? (body.instanceId===undefined?undefined:body.instanceId?[body.instanceId]:[])
    if(ids && !ids.length) throw new AffiliateError(400,'Mantenha ao menos uma conexão na segmentação.')
    const connections=ids?await segmentInstances(tenantId,ids,true):null
    await assertAffiliateImage(prisma,tenantId,body.imageUrl)
    return prisma.$transaction(async tx=>{
      const row=await tx.affiliateSegment.findFirst({where:{id,tenantId}})
      if(!row) throw new AffiliateError(404,'Segmentação não encontrada.')
      if(row.provisionState!=='IDLE' && Object.keys(body).some(key=>key!=='enabled')) throw new AffiliateError(409,'Confira a criação pendente antes de alterar o modelo.')
      if((body.autoExpand ?? row.autoExpand) && !(ids?.[0] ?? row.instanceId)) throw new AffiliateError(400,'Selecione a conexão para expansão automática.')
      if((body.autoExpand ?? row.autoExpand) && (ids || body.autoExpand===true)) {
        const eligible=connections ?? await tx.affiliateInstance.findMany({where:{tenantId,enabled:true,OR:[{segmentLinks:{some:{segmentId:id}}},{id:row.instanceId ?? ''}]}})
        if(!eligible.some(instance=>instance.ownerPhone)) throw new AffiliateError(400,'Informe o WhatsApp do participante inicial em ao menos uma conexão para criar grupos automaticamente.')
      }
      const changed=await tx.affiliateSegment.updateMany({where:{id,tenantId,updatedAt:row.updatedAt},data:{...data,...(ids?{instanceId:ids[0]}:{})}})
      if(!changed.count) throw new AffiliateError(409,'A segmentação mudou. Atualize a página.')
      if(body.name !== undefined && body.name !== row.name) await tx.affiliateDiscovery.updateMany({where:{segmentId:id,tenantId,terms:{isEmpty:true}},data:{productsJson:[],countsJson:Prisma.DbNull,cursor:0,checkedAt:null,nextRunAt:new Date(),status:'QUEUED',error:null,leaseToken:null,leaseExpiresAt:null,configVersion:{increment:1}}})
      if(ids) {await tx.affiliateSegmentInstance.deleteMany({where:{segmentId:id,tenantId}});await tx.affiliateSegmentInstance.createMany({data:ids.map(instanceId=>({tenantId,segmentId:id,instanceId}))})}
      await audit(tx,tenantId,actorId,'segment.updated',id);return {saved:true}
    })
  }))
  app.post(prefix+'/segments/:id/reconcile',(q,r)=>run(q,r,(tenantId,actorId)=>reconcileAffiliateSegment(prisma,tenantId,actorId,idParam.parse(q.params).id,z.object({jid:groupJid.optional(),confirmAbsent:z.boolean().optional()}).strict().parse(q.body))))
  app.post(prefix+'/groups',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const body=z.object({segmentId:entityId,instanceId:entityId,jid:groupJid}).strict().parse(q.body)
    const instance=await instanceFor(prisma,tenantId,body.instanceId),live=await affiliateEvolution(instance).group(body.jid),inviteUrl=await affiliateEvolution(instance).invite(body.jid)
    return prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id = ${body.segmentId} AND "tenantId" = ${tenantId} FOR UPDATE`
      const segment=await tx.affiliateSegment.findFirst({where:{id:body.segmentId,tenantId}})
      if(!segment) throw new AffiliateError(404,'Segmentação não encontrada.')
      if(segment.provisionState!=='IDLE') throw new AffiliateError(409,'Use Conferir criação para importar o grupo pendente.')
      if(!instance.enabled || !await tx.affiliateSegmentInstance.count({where:{tenantId,segmentId:segment.id,instanceId:instance.id}})) throw new AffiliateError(409,'Vincule esta conexão à segmentação antes de importar o grupo.')
      const suffix=live.name.match(/ #(\d+)$/),sequence=Math.max(segment.nextSequence,suffix?Number(suffix[1]):1)
      if(!Number.isSafeInteger(sequence)||sequence>=2_147_483_647) throw new AffiliateError(400,'Sequência do grupo inválida.')
      const row=await tx.affiliateGroup.create({data:{tenantId,...body,name:live.name,sequence,participantCount:live.participantCount,capacity:segment.capacity,inviteUrl,syncedAt:new Date()}})
      await tx.affiliateSegment.update({where:{id:body.segmentId},data:{nextSequence:sequence+1}})
      await audit(tx,tenantId,actorId,'group.imported',row.id);return row
    })
  }))
  app.patch(prefix+'/groups/:id',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const {id}=idParam.parse(q.params),body=z.object({enabled:z.boolean()}).strict().parse(q.body)
    return prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`
      const group=await tx.affiliateGroup.findFirst({where:{id,tenantId},select:{segmentId:true}})
      if(!group) throw new AffiliateError(404,'Grupo não encontrado.')
      await tx.$queryRaw`SELECT id FROM affiliate_segments WHERE id = ${group.segmentId} AND "tenantId" = ${tenantId} FOR UPDATE`
      const row=await tx.affiliateGroup.updateMany({where:{id,tenantId},data:body})
      if(!row.count) throw new AffiliateError(404,'Grupo não encontrado.')
      await audit(tx,tenantId,actorId,'group.updated',id);return {saved:true}
    })
  }))
  app.post(prefix+'/offers',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const body=offerInput.parse(q.body)
    if(!await prisma.affiliateSegment.count({where:{id:body.segmentId,tenantId}})) throw new AffiliateError(404,'Segmentação não encontrada.')
    const checkedAt=body.checkedAt?new Date(body.checkedAt):new Date()
    if(checkedAt>new Date(Date.now()+60_000)) throw new AffiliateError(400,'Data de verificação inválida.')
    return prisma.$transaction(async tx=>{const row=await tx.affiliateOffer.create({data:{...body,tenantId,checkedAt,expiresAt:body.expiresAt?new Date(body.expiresAt):null}});await audit(tx,tenantId,actorId,'offer.created',row.id);return row})
  }))
  app.patch(prefix+'/offers/:id',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const {id}=idParam.parse(q.params),body=offerInput.omit({segmentId:true}).partial().extend({status:z.enum(['DRAFT','ARCHIVED']).optional()}).parse(q.body)
    return prisma.$transaction(async tx=>{
      const row=await tx.affiliateOffer.findFirst({where:{id,tenantId}})
      if(!row) throw new AffiliateError(404,'Oferta não encontrada.')
      if(body.checkedAt && new Date(body.checkedAt)>new Date(Date.now()+60_000)) throw new AffiliateError(400,'Data de verificação inválida.')
      const discountChanged=body.priceCents!==undefined&&body.priceCents!==row.priceCents || body.oldPriceCents!==undefined&&body.oldPriceCents!==row.oldPriceCents || body.productUrl!==undefined&&body.productUrl!==row.productUrl
      const clearEstimatedPrice=discountChanged&&row.oldPriceEstimated&&(body.oldPriceCents===undefined||body.oldPriceCents===row.oldPriceCents)
      await tx.affiliateOffer.updateMany({where:{id,tenantId},data:{...body,...(body.productUrl!==undefined&&body.productUrl!==row.productUrl?{itemId:null}:{}),...(discountChanged?{reportedDiscountPercent:null,oldPriceEstimated:false}:{}),...(clearEstimatedPrice?{oldPriceCents:null}:{}),...(body.checkedAt?{checkedAt:new Date(body.checkedAt)}:{}),...(body.expiresAt!==undefined?{expiresAt:body.expiresAt?new Date(body.expiresAt):null}:{})}})
      await tx.affiliateDelivery.updateMany({where:{tenantId,state:'PENDING',broadcast:{offerId:id}},data:{state:'CANCELLED',errorCode:'offer_changed_after_approval'}})
      await audit(tx,tenantId,actorId,'offer.updated',id);return {saved:true}
    })
  }))
  app.post(prefix+'/offers/:id/send',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const broadcast=await scheduleAffiliateBroadcast(prisma,tenantId,actorId,idParam.parse(q.params).id,z.object({idempotencyKey:z.string().uuid(),scheduledAt:z.iso.datetime().optional()}).strict().parse(q.body))
    void requestAffiliateDeliveryDrain(prisma,{tenantId,broadcastId:broadcast.id}).catch(()=>q.log.error({event:'affiliate.drain.failed'},'Falha ao iniciar processamento de envio'))
    return broadcast
  }))
  app.post(prefix+'/broadcasts/:id/cancel',(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const {id}=idParam.parse(q.params)
    return prisma.$transaction(async tx=>{
      if(!await tx.affiliateBroadcast.count({where:{id,tenantId}})) throw new AffiliateError(404,'Distribuição não encontrada.')
      const cancelled=await tx.affiliateDelivery.updateMany({where:{tenantId,broadcastId:id,state:'PENDING'},data:{state:'CANCELLED',errorCode:'cancelled_by_admin'}})
      await audit(tx,tenantId,actorId,'broadcast.cancelled',id)
      return {cancelled:cancelled.count}
    })
  }))
  app.post(prefix+'/deliveries/:id/resolve',(q,r)=>run(q,r,(tenantId,actorId)=>resolveAffiliateDelivery(prisma,tenantId,actorId,idParam.parse(q.params).id,z.object({resolution:z.enum(['SENT','RETRY']),confirmUncertain:z.boolean().default(false),providerMessageId:z.string().min(1).max(200).optional()}).strict().parse(q.body))))
  app.get('/public/affiliates/:slug',(q,r)=>run(q,r,async tenantId=>{
    const {slug}=z.object({slug:segmentInput.shape.slug}).parse(q.params)
    const segment=await prisma.affiliateSegment.findFirst({where:{tenantId,slug,enabled:true},select:{name:true,groupName:true,description:true,imageUrl:true,joinMode:true,autoExpand:true,instance:{select:{enabled:true}},instanceLinks:{where:{instance:{enabled:true}},select:{instanceId:true}},groups:{where:{enabled:true},select:{participantCount:true,capacity:true,instance:{select:{enabled:true}}}}}})
    if(!segment) throw new AffiliateError(404,'Segmentação indisponível.')
    return {name:segment.groupName ?? segment.name,description:segment.description,shareImageUrl:segment.imageUrl?(affiliateImageId(segment.imageUrl)?`/ofertas/entrar/${slug}/imagem?v=${createHash('sha256').update(segment.imageUrl).digest('hex').slice(0,16)}`:segment.imageUrl):null,imageUrl:segment.imageUrl?(affiliateImageId(segment.imageUrl)?`/bff/v1/public/affiliates/${slug}/image`:segment.imageUrl):null,joinMode:segment.joinMode,available:segment.groups.some(group=>group.participantCount<group.capacity&&(segment.instanceLinks.length||group.instance.enabled))||Boolean(segment.autoExpand&&(segment.instanceLinks.length||segment.instance?.enabled))}
  },true))
  app.get('/public/affiliates/:slug/destination',(q,r)=>run(q,r,async tenantId=>{
    const {slug}=z.object({slug:segmentInput.shape.slug}).parse(q.params)
    const {eventId}=z.object({eventId:z.uuid()}).strict().parse(q.query)
    const agent=q.headers['user-agent']??''
    const mode=q.headers['x-affiliate-fetch-mode']??q.headers['sec-fetch-mode']
    if(q.method!=='GET'||q.supportSession||q.cookies?.supportSession||q.headers['sec-fetch-dest']!=='document'||mode!=='navigate'||!/^Mozilla\//.test(agent)||/bot|crawler|spider|headless|playwright|facebookexternalhit|meta-external|WhatsApp\//i.test(agent)||q.headers['next-router-prefetch']!==undefined||/prefetch|prerender/i.test(String(q.headers.purpose??'')+' '+String(q.headers['sec-purpose']??'')))return {url:null}
    const result=await resolveAffiliateInviteDestination(prisma,tenantId,slug)
    if(!result||q.raw.aborted||r.raw.destroyed)return {url:null}
    await Promise.all([captureInviteEvent(q,tenantId,slug,eventId,'VIEW'),captureInviteEvent(q,tenantId,slug,eventId,'AUTOMATIC_REDIRECT')])
    return result
  },true,typeof q.headers['x-affiliate-tenant-host']==='string'?q.headers['x-affiliate-tenant-host']:undefined))
  app.get('/public/affiliates/:slug/image',(q,r)=>run(q,r,async tenantId=>{
    const {slug}=z.object({slug:segmentInput.shape.slug}).parse(q.params)
    const segment=await prisma.affiliateSegment.findFirst({where:{tenantId,slug,enabled:true},select:{imageUrl:true}})
    const imageId=segment?.imageUrl?affiliateImageId(segment.imageUrl):null
    const image=imageId?await prisma.affiliateImage.findFirst({where:{id:imageId,tenantId},select:{bytes:true}}):null
    if(!image) throw new AffiliateError(404,'Imagem não encontrada.')
    r.header('x-content-type-options','nosniff').type('image/webp')
    return Buffer.from(image.bytes)
  },true))
  app.get('/public/affiliates/:slug/preview-image',(q,r)=>run(q,r,async tenantId=>{
    const {slug}=z.object({slug:segmentInput.shape.slug}).parse(q.params)
    const segment=await prisma.affiliateSegment.findFirst({where:{tenantId,slug,enabled:true},select:{imageUrl:true}})
    const imageId=segment?.imageUrl?affiliateImageId(segment.imageUrl):null
    const image=imageId?await prisma.affiliateImage.findFirst({where:{id:imageId,tenantId},select:{bytes:true}}):null
    if(!image) throw new AffiliateError(404,'Imagem não encontrada.')
    const bytes=await sharp(Buffer.from(image.bytes),{limitInputPixels:512*512}).rotate().resize(600,600,{fit:'contain',background:'#0a192f'}).flatten({background:'#0a192f'}).jpeg({quality:85}).toBuffer()
    r.header('x-content-type-options','nosniff').type('image/jpeg')
    return bytes
  },true))
  app.post('/public/affiliates/:slug/visit',(q,r)=>run(q,r,async tenantId=>{
    const {slug}=z.object({slug:segmentInput.shape.slug}).parse(q.params),{eventId}=inviteEventInput.parse(q.body)
    await captureInviteEvent(q,tenantId,slug,eventId,'VIEW')
    return {ok:true}
  },true))
  app.post('/public/affiliates/:slug/join',(q,r)=>run(q,r,async tenantId=>{
    const {slug}=z.object({slug:segmentInput.shape.slug}).parse(q.params)
    const body=z.object({eventId:z.uuid().optional(),source:z.enum(['AUTOMATIC','BUTTON']).optional()}).strict().refine(value=>Boolean(value.eventId)===Boolean(value.source)).parse(q.body??{})
    if(body.source==='BUTTON') await captureInviteEvent(q,tenantId,slug,body.eventId,'BUTTON_CLICK')
    const result=await joinAffiliateSegment(prisma,tenantId,slug,affiliateInviteEvolution)
    if(body.source) await captureInviteEvent(q,tenantId,slug,body.eventId,body.source==='AUTOMATIC'?'AUTOMATIC_REDIRECT':'BUTTON_REDIRECT')
    return result
  },true))
}
