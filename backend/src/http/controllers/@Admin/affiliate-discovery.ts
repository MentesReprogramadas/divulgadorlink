import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z, ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { AffiliateCatalogError } from '@/domain/affiliates/mercado-livre'
import { discoveryQuerySchema, queueAffiliateDiscoveryPage, affiliateDiscoveryState, configureAffiliateDiscovery, discoveryConfigSchema, queueAffiliateDiscovery, runAffiliateDiscovery } from '@/use-cases/affiliates/discovery'
import { requireAffiliateAdmin } from './affiliate-access'

async function run(request: FastifyRequest, reply: FastifyReply, work: (tenantId:string,actorId:string,id:string)=>Promise<unknown>) {
  reply.header('cache-control','private, no-store')
  try {
    const tenant = await requireAffiliateAdmin(request,reply)
    if(!tenant) return
    const {id} = z.object({id:z.string().min(1).max(100)}).parse(request.params)
    return await work(tenant.id,request.user.sub,id)
  } catch(error) {
    if(error instanceof AffiliateCatalogError) return reply.code(error.status).send({message:error.message})
    if(error instanceof ZodError) return reply.code(400).send({message:'Confira os termos e a configuração das sugestões.'})
    request.log.error({event:'affiliate.discovery.failed'},'Falha na descoberta de afiliados')
    return reply.code(503).send({message:'Não foi possível consultar as sugestões. Tente novamente.'})
  }
}
export async function registerAffiliateDiscoveryRoutes(app:FastifyInstance) {
  const base = '/admin/affiliates/segments/:id/discovery'
  app.get(base,(q,r)=>run(q,r,(tenantId,_actorId,id)=>affiliateDiscoveryState(prisma,tenantId,id,discoveryQuerySchema.parse(q.query))))
  app.post(`${base}/config`,(q,r)=>run(q,r,async(tenantId,actorId,id)=>{
    const result = await configureAffiliateDiscovery(prisma,tenantId,actorId,id,discoveryConfigSchema.parse(q.body))
    if(result.enabled) void runAffiliateDiscovery(prisma,undefined,undefined,{tenantId,segmentId:id}).catch(()=>q.log.error({event:'affiliate.discovery.failed'},'Falha ao iniciar coleta de sugestões'))
    return result
  }))
  app.post(`${base}/refresh`,(q,r)=>run(q,r,async(tenantId,actorId,id)=>{
    const input=z.object({force:z.boolean().optional(),term:z.string().trim().min(2).max(120).optional(),page:z.number().int().min(1).max(50001).optional()}).strict().refine(value=>(value.term===undefined)===(value.page===undefined)).parse(q.body)
    if(input.term) {
      const current=await affiliateDiscoveryState(prisma,tenantId,id)
      if(!current.expandedTerms.includes(input.term))throw new AffiliateCatalogError(400,'Selecione um dos termos desta segmentação.')
    }
    const result = await queueAffiliateDiscovery(prisma,tenantId,actorId,id,input)
    r.code(202)
    void runAffiliateDiscovery(prisma,undefined,undefined,{tenantId,segmentId:id}).catch(()=>q.log.error({event:'affiliate.discovery.failed'},'Falha ao iniciar coleta de sugestões'))
    return result
  }))
  app.post(`${base}/page`,(q,r)=>run(q,r,async(tenantId,actorId,id)=>{
    const input=z.object({term:z.string().trim().min(2).max(120),page:z.number().int().min(1).max(50001)}).strict().parse(q.body)
    const result=await queueAffiliateDiscoveryPage(prisma,tenantId,actorId,id,input)
    r.code(202)
    void runAffiliateDiscovery(prisma,undefined,undefined,{tenantId,segmentId:id}).catch(()=>q.log.error({event:'affiliate.discovery.failed'},'Falha ao iniciar página'))
    return result
  }))

}
