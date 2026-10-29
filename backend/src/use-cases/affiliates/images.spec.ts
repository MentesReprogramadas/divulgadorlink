import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { assertAffiliateImage, resolveStoredAffiliateImage } from './images'
import { affiliateImageId } from '@/domain/affiliates/image'

const id = '6fb9040e-9721-4cdc-b746-fbb78d757a85', reference = `affiliate-image:${id}`
describe('imagens de grupos isoladas por tenant',()=>{
  it('resolve bytes somente no tenant solicitado e conserva URL antiga',async()=>{
    const findFirst = vi.fn().mockResolvedValue({bytes:Buffer.from('image')})
    const db = {affiliateImage:{findFirst}} as unknown as PrismaClient
    expect(await resolveStoredAffiliateImage(db,'tenant-a',reference)).toBe(Buffer.from('image').toString('base64'))
    expect(findFirst).toHaveBeenCalledWith({where:{id,tenantId:'tenant-a'},select:{bytes:true}})
    expect(await resolveStoredAffiliateImage(db,'tenant-a','https://images.mlstatic.com/photo.webp')).toBe('https://images.mlstatic.com/photo.webp')
    expect(await resolveStoredAffiliateImage(db,'tenant-a',null)).toBeNull()
  })
  it('rejeita referência inexistente ou pertencente a outro tenant',async()=>{
    const count = vi.fn().mockResolvedValue(0),findFirst=vi.fn().mockResolvedValue(null)
    const db = {affiliateImage:{count,findFirst}} as unknown as PrismaClient
    await expect(assertAffiliateImage(db,'tenant-b',reference)).rejects.toMatchObject({status:400})
    expect(count).toHaveBeenCalledWith({where:{id,tenantId:'tenant-b'}})
    await expect(resolveStoredAffiliateImage(db,'tenant-b',reference)).rejects.toMatchObject({status:409})
    expect(affiliateImageId('affiliate-image:../other')).toBeNull()
  })
})
