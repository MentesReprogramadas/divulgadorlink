import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { env } from '@/env'
import { prisma } from '@/lib/prisma'
import { secretEquals } from '@/domain/notifications/evolution-command'
import { membershipWebhookSecret, parseMembershipEvent } from '@/domain/affiliates/membership'
import { baselineAffiliateMembership, recordAffiliateMembership } from '@/use-cases/affiliates/membership'
import { affiliateEvolution } from '@/use-cases/affiliates/instances'
import { requireAffiliateAdmin } from '@/http/controllers/@Admin/affiliate-access'
import { AffiliateError, entityId } from '@/domain/affiliates/contracts'
import { prepareConversionAliases } from '@/use-cases/affiliates/conversions'

export async function affiliateMembershipRoutes(app:FastifyInstance) {
  let inFlight=0
  app.post('/integrations/evolution/affiliate-membership/:instanceId/webhook',{bodyLimit:128*1024},async(q,r)=>{
    r.header('cache-control','no-store')
    if(inFlight>=16) return r.header('retry-after','10').code(429).send({accepted:false})
    const supplied=q.headers['x-evolution-secret']
    if(typeof supplied!=='string' || !/^[a-f0-9]{64}$/.test(supplied) || !env.WEBHOOK_ENCRYPTION_KEY) return r.code(401).send({accepted:false})
    inFlight++
    try {
      const {instanceId}=z.object({instanceId:entityId}).parse(q.params)
      const instance=await prisma.affiliateInstance.findUnique({where:{id:instanceId}})
      if(!instance?.enabled || !secretEquals(supplied,membershipWebhookSecret(env.WEBHOOK_ENCRYPTION_KEY,instance.tenantId,instance.id))) return r.code(401).send({accepted:false})
      const offset=q.headers['x-evolution-clock-offset-minutes']
      if(offset!==undefined && (typeof offset!=='string' || !/^-?\d{1,3}$/.test(offset))) return r.code(400).send({accepted:false})
      const event=parseMembershipEvent(q.body,offset===undefined?0:Number(offset))
      if(!event || event.instance!==instance.name) return r.code(400).send({accepted:false})
      const aliases=await prepareConversionAliases(prisma,instance.tenantId,instance.id,event,()=>affiliateEvolution(instance).participantPhoneAliases(event.jid))
      const result=aliases?await recordAffiliateMembership(prisma,instance.tenantId,instance.id,event,env.WEBHOOK_ENCRYPTION_KEY,new Date(),aliases):await recordAffiliateMembership(prisma,instance.tenantId,instance.id,event,env.WEBHOOK_ENCRYPTION_KEY)
      return {accepted:result!=='unrelated',result}
    } catch {
      // Payloads and errors may contain identities; provider retry gets no body details.
      q.log.warn({event:'affiliate.membership.storage.failed'},'Falha ao registrar alteração de participantes')
      return r.header('retry-after','10').code(503).send({accepted:false})
    } finally {inFlight--}
  })
  app.post('/admin/affiliates/groups/:groupId/membership/baseline',async(q,r)=>{
    const tenant=await requireAffiliateAdmin(q,r)
    if(!tenant) return
    try {
      const {groupId}=z.object({groupId:entityId}).parse(q.params)
      z.object({}).strict().parse(q.body??{})
      const group=await prisma.affiliateGroup.findFirst({where:{id:groupId,tenantId:tenant.id,enabled:true},include:{instance:true}})
      if(!group?.instance.enabled) return r.code(404).send({message:'Grupo não encontrado.'})
      return await baselineAffiliateMembership(prisma,tenant.id,group.id,env.WEBHOOK_ENCRYPTION_KEY,()=>affiliateEvolution(group.instance).participants(group.jid))
    } catch(error) {
      return r.code(error instanceof AffiliateError?error.status:error instanceof z.ZodError?400:503).send({message:error instanceof AffiliateError?error.message:'Não foi possível iniciar a leitura de participantes.'})
    }
  })
  app.get('/admin/affiliates/membership',async(q,r)=>{
    const tenant=await requireAffiliateAdmin(q,r)
    if(!tenant) return
    const query=z.object({segmentId:entityId.optional()}).strict().safeParse(q.query)
    if(!query.success) return r.code(400).send({message:'Confira a segmentação.'})
    const until=new Date(),since=new Date(until)
    since.setUTCDate(since.getUTCDate()-29);since.setUTCHours(0,0,0,0)
    const rows=await prisma.affiliateGroup.findMany({where:{tenantId:tenant.id,...(query.data.segmentId?{segmentId:query.data.segmentId}:{})},take:500,orderBy:{createdAt:'asc'},select:{id:true,name:true,segmentId:true,membershipTracking:{select:{status:true,baselineAt:true,expiresAt:true,lastReceivedAt:true,lastErrorCode:true,receivedDuringBaseline:true,days:{where:{day:{gte:since,lte:until}},select:{joins:true,leaves:true,rejoins:true,staleEvents:true}}}}}})
    const groups=rows.map(row=>{
      const tracking=row.membershipTracking
      const counts=(tracking?.days??[]).reduce((sum,day)=>({joins:sum.joins+day.joins,leaves:sum.leaves+day.leaves,rejoins:sum.rejoins+day.rejoins,staleEvents:sum.staleEvents+day.staleEvents}),{joins:0,leaves:0,rejoins:0,staleEvents:0})
      return {groupId:row.id,groupName:row.name,segmentId:row.segmentId,status:tracking?.expiresAt&&tracking.expiresAt<=until?'EXPIRED':tracking?.status??'UNCONFIGURED',baselineAt:tracking?.baselineAt??null,expiresAt:tracking?.expiresAt??null,lastReceivedAt:tracking?.lastReceivedAt??null,lastErrorCode:tracking?.lastErrorCode??null,receivedDuringBaseline:tracking?.receivedDuringBaseline??0,...counts}
    })
    return {since,until,groups,totals:groups.reduce((sum,row)=>({joins:sum.joins+row.joins,leaves:sum.leaves+row.leaves,rejoins:sum.rejoins+row.rejoins}),{joins:0,leaves:0,rejoins:0})}
  })
}
