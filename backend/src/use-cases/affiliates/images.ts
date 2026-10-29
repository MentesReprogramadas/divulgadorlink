import type { PrismaClient } from '@prisma/client'
import { AffiliateError } from '@/domain/affiliates/contracts'
import { affiliateImageId } from '@/domain/affiliates/image'

export async function assertAffiliateImage(db:PrismaClient,tenantId:string,source:string|null|undefined) {
  const id = source ? affiliateImageId(source) : null
  if (id && !await db.affiliateImage.count({where:{id,tenantId}})) throw new AffiliateError(400,'Escolha uma imagem desta conta administrativa.')
}

export async function resolveStoredAffiliateImage(db:PrismaClient,tenantId:string,source:string|null|undefined):Promise<string|null> {
  if (!source) return null
  const id = affiliateImageId(source)
  if (!id) return source
  const image = await db.affiliateImage.findFirst({where:{id,tenantId},select:{bytes:true}})
  if (!image) throw new AffiliateError(409,'Envie novamente a imagem da segmentação antes de criar o grupo.')
  return Buffer.from(image.bytes).toString('base64')
}
