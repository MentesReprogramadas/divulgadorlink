import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveTenant, normalizeTenantHost } from '@/http/tenant'
import { recordConversionIntent } from '@/use-cases/affiliates/conversions'
import { AffiliateError } from '@/domain/affiliates/contracts'
import { createConversionRateLimiter } from './affiliate-conversion-rate'

export async function affiliateConversionRoutes(app:FastifyInstance) {
  let inFlight=0
  const limited=createConversionRateLimiter()
  app.post('/public/affiliates/:slug/conversion-intent',{bodyLimit:4096},async(q,r)=>{
    r.header('cache-control','no-store')
    if(inFlight>=16)return r.code(429).send({message:'Tente novamente em instantes.'})
    inFlight++
    try {
      const params=z.object({slug:z.string().min(1).max(120).regex(/^[a-z0-9-]+$/)}).safeParse(q.params)
      if(!params.success)return r.code(400).send({message:'Confira a segmentação.'})
      const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''))
      if(limited(q.ip,tenant.id,params.data.slug))return r.header('retry-after','60').code(429).send({message:'Tente novamente em instantes.'})
      return await recordConversionIntent(prisma,tenant,params.data.slug,q.body,String(q.headers['user-agent']??''),typeof q.headers.origin==='string'?q.headers.origin:undefined)
    } catch(error) {
      // Validation/transport errors may embed personal input; never forward them to global error logging.
      return r.code(error instanceof AffiliateError?error.status:503).send({message:error instanceof AffiliateError?error.message:'Entrada temporariamente indisponível.'})
    } finally {inFlight--}
  })
}
