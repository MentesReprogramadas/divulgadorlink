import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AffiliateError, entityId } from '@/domain/affiliates/contracts'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { decideAffiliateProduct, previewAffiliateProduct, regenerateAffiliateProductTitle, sendAffiliateProduct } from '@/use-cases/affiliates/product-review'
import { affiliateBroadcastHistory, affiliateBroadcastStatus } from '@/use-cases/affiliates/broadcast-history'
import { requestAffiliateDeliveryDrain } from '@/use-cases/affiliates/deliveries'
import { requireAffiliateAdmin } from './affiliate-access'

async function run(request:FastifyRequest,reply:FastifyReply,work:(tenantId:string,actorId:string)=>Promise<unknown>) {
  reply.header('cache-control','private, no-store').header('x-robots-tag','noindex, nofollow')
  try {
    const tenant=await requireAffiliateAdmin(request,reply)
    if(!tenant) return
    return await work(tenant.id,request.user.sub)
  } catch(error) {
    if(error instanceof AffiliateError || error instanceof AffiliateCatalogError) return reply.code(error.status).send({message:error.message})
    if(error instanceof z.ZodError) return reply.code(400).send({message:'Confira os dados do produto ou da prévia.'})
    request.log.error({event:'affiliate.product.failed'},'Falha na operação da oferta')
    return reply.code(503).send({message:'Não foi possível concluir a operação. Confira o histórico antes de repetir um envio.'})
  }
}
export async function registerAffiliateProductRoutes(app:FastifyInstance) {
  const base='/admin/affiliates',segment=(q:FastifyRequest)=>z.object({id:entityId}).parse(q.params).id,item=z.string().regex(/^MLB\d+$/).max(40)
  app.post(`${base}/segments/:id/products/preview`,(q,r)=>run(q,r,(tenantId,actorId)=>previewAffiliateProduct(prisma,tenantId,actorId,segment(q),z.object({itemId:item}).strict().parse(q.body).itemId)))
  app.post(`${base}/segments/:id/products/preview/title`,(q,r)=>run(q,r,(tenantId,actorId)=>regenerateAffiliateProductTitle(prisma,tenantId,actorId,segment(q),z.object({previewToken:z.string().min(1).max(24000)}).strict().parse(q.body).previewToken)))
  app.post(`${base}/segments/:id/products/send`,(q,r)=>run(q,r,async(tenantId,actorId)=>{
    const body=z.object({previewToken:z.string().max(24000),confirm:z.literal(true)}).strict().parse(q.body)
    const result=await sendAffiliateProduct(prisma,tenantId,actorId,segment(q),body.previewToken)
    r.code(202)
    void requestAffiliateDeliveryDrain(prisma,{tenantId,broadcastId:result.broadcastId}).catch(()=>q.log.error({event:'affiliate.drain.failed'},'Falha no início do processamento'))
    return result
  }))
  app.post(`${base}/segments/:id/products/discard`,(q,r)=>run(q,r,(tenantId,actorId)=>{
    const body=z.object({itemId:item,reason:z.string().trim().min(1).max(300).optional()}).strict().parse(q.body)
    return decideAffiliateProduct(prisma,tenantId,actorId,segment(q),body.itemId,false,body.reason)
  }))
  app.post(`${base}/segments/:id/products/restore`,(q,r)=>run(q,r,(tenantId,actorId)=>decideAffiliateProduct(prisma,tenantId,actorId,segment(q),z.object({itemId:item}).strict().parse(q.body).itemId,true)))
  app.get(`${base}/broadcasts`,(q,r)=>run(q,r,tenantId=>affiliateBroadcastHistory(prisma,tenantId,z.object({cursor:entityId.optional(),limit:z.coerce.number().int().min(1).max(50).default(12),segmentId:entityId.optional()}).strict().parse(q.query))))
  app.get(`${base}/broadcasts/:id/status`,(q,r)=>run(q,r,tenantId=>affiliateBroadcastStatus(prisma,tenantId,z.object({id:entityId}).parse(q.params).id)))
}
