import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AffiliateError, entityId } from '@/domain/affiliates/contracts'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { dayPlanInput } from '@/domain/affiliates/day-plan'
import { approveAffiliateDayPlan, buildAffiliateDayPlan, cancelAffiliateDayPlan, createAffiliateDayPlan, readAffiliateDayPlan, retryAffiliateDayPlan } from '@/use-cases/affiliates/day-plans'
import { requireAffiliateAdmin } from './affiliate-access'

async function run(q:FastifyRequest,r:FastifyReply,work:(tenantId:string,actorId:string,params:{segmentId:string;id?:string;entryId?:string})=>Promise<unknown>){
  r.header('cache-control','private, no-store').header('x-robots-tag','noindex, nofollow')
  try{
    const tenant=await requireAffiliateAdmin(q,r)
    if(!tenant)return
    const params=z.object({segmentId:entityId,id:entityId.optional(),entryId:entityId.optional()}).parse(q.params)
    return await work(tenant.id,q.user.sub,params)
  }catch(error){
    if(error instanceof AffiliateError||error instanceof AffiliateCatalogError)return r.code(error.status).send({message:error.message})
    if(error instanceof z.ZodError)return r.code(400).send({message:'Confira dia, período e ofertas do lote.'})
    q.log.error({event:'affiliate.schedule.failed'},'Falha na agenda de ofertas')
    return r.code(503).send({message:'Não foi possível concluir. Confira a agenda antes de repetir.'})
  }
}
export async function registerAffiliateDayPlanRoutes(app:FastifyInstance){
  const base='/admin/affiliates/segments/:segmentId/day-plans'
  app.post(base,(q,r)=>run(q,r,async(tenantId,actorId,{segmentId})=>{
    const result=await createAffiliateDayPlan(prisma,tenantId,actorId,segmentId,dayPlanInput.parse(q.body))
    r.code(202)
    void buildAffiliateDayPlan(prisma,{tenantId,id:result.id}).catch(()=>q.log.error({event:'affiliate.schedule.build_failed'},'Falha ao iniciar rascunho'))
    return result
  }))
  app.get(base,(q,r)=>run(q,r,async(tenantId,_actorId,{segmentId})=>{
    const {page,limit}=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),limit:z.coerce.number().int().min(1).max(24).default(8)}).strict().parse(q.query)
    if(!await prisma.affiliateSegment.count({where:{tenantId,id:segmentId}}))throw new AffiliateError(404,'Segmentação não encontrada.')
    const where={tenantId,segmentId}
    const [rows,total]=await Promise.all([prisma.affiliateScheduleBatch.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*limit,take:limit,select:{id:true,status:true,config:true,createdAt:true,groups:true,_count:{select:{entries:{where:{state:{not:'CANCELLED'}}}}}}}),prisma.affiliateScheduleBatch.count({where})])
    return {batches:rows.map(({groups,...row})=>({...row,groupCount:Array.isArray(groups)?groups.length:0})),pagination:{page,limit,total,hasPrevious:page>1,hasNext:page*limit<total}}
  }))
  app.get(base+'/:id',(q,r)=>run(q,r,(tenantId,_actorId,{segmentId,id})=>readAffiliateDayPlan(prisma,tenantId,segmentId,id!)))
  app.post(base+'/:id/retry',(q,r)=>run(q,r,async(tenantId,actorId,{segmentId,id})=>{
    const {entryId}=z.object({entryId:entityId.optional()}).strict().parse(q.body)
    const result=await retryAffiliateDayPlan(prisma,tenantId,actorId,segmentId,id!,entryId)
    r.code(202)
    void buildAffiliateDayPlan(prisma,{tenantId,id:id!}).catch(()=>q.log.error({event:'affiliate.schedule.retry_failed'},'Falha ao conferir rascunho'))
    return result
  }))
  app.post(base+'/:id/approve',(q,r)=>run(q,r,(tenantId,actorId,{segmentId,id})=>{
    z.object({confirm:z.literal(true)}).strict().parse(q.body)
    return approveAffiliateDayPlan(prisma,tenantId,actorId,segmentId,id!)
  }))
  app.post(base+'/:id/cancel',(q,r)=>run(q,r,(tenantId,actorId,{segmentId,id})=>{
    z.object({confirm:z.literal(true)}).strict().parse(q.body)
    return cancelAffiliateDayPlan(prisma,tenantId,actorId,segmentId,id!)
  }))
  app.delete(base+'/:id/entries/:entryId',(q,r)=>run(q,r,(tenantId,actorId,{segmentId,id,entryId})=>cancelAffiliateDayPlan(prisma,tenantId,actorId,segmentId,id!,entryId)))
}
