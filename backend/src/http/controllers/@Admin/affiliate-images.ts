import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { avatarWebp } from '@/domain/profiles/avatar-webp'
import { ProfileError } from '@/domain/profiles/profile'
import { requireAffiliateAdmin } from './affiliate-access'

export async function registerAffiliateImageRoutes(app:FastifyInstance) {
  app.post('/admin/affiliates/images',{bodyLimit:360_000},async(q,r)=>{
    r.header('cache-control','private, no-store').header('x-robots-tag','noindex, nofollow')
    const tenant = await requireAffiliateAdmin(q,r)
    if (!tenant) return
    try {
      const {base64} = z.object({base64:z.string().min(1).max(349528)}).strict().parse(q.body)
      // Reuse the existing bounded decoder: strips EXIF, animation and non-image payloads.
      const bytes = await avatarWebp(base64), id = randomUUID()
      await prisma.$transaction(async tx=>{
        await tx.affiliateImage.create({data:{id,tenantId:tenant.id,bytes}})
        await tx.auditLog.create({data:{tenantId:tenant.id,actorId:q.user.sub,action:'affiliate.image.uploaded',entityType:'AffiliateImage',entityId:id}})
      })
      return {url:`affiliate-image:${id}`,previewUrl:`/bff/v1/admin/affiliates/images/${id}`}
    } catch(error) {
      if (error instanceof z.ZodError || error instanceof ProfileError) return r.code(400).send({message:error instanceof ProfileError?error.message:'Escolha uma imagem PNG, JPG ou WebP válida.'})
      q.log.error({event:'affiliate.image.upload.failed'},'Falha ao salvar imagem da segmentação')
      return r.code(500).send({message:'Não foi possível salvar a imagem. Tente novamente.'})
    }
  })
  app.get('/admin/affiliates/images/:id',async(q,r)=>{
    r.header('cache-control','private, no-store').header('x-robots-tag','noindex, nofollow').header('x-content-type-options','nosniff')
    const tenant = await requireAffiliateAdmin(q,r)
    if (!tenant) return
    const params = z.object({id:z.uuid()}).safeParse(q.params)
    if (!params.success) return r.code(404).send({message:'Imagem não encontrada.'})
    const image = await prisma.affiliateImage.findFirst({where:{id:params.data.id,tenantId:tenant.id},select:{bytes:true}})
    if (!image) return r.code(404).send({message:'Imagem não encontrada.'})
    return r.type('image/webp').send(Buffer.from(image.bytes))
  })
}
